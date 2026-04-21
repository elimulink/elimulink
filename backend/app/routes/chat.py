from __future__ import annotations

import base64
import os
from pathlib import Path
from time import perf_counter

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from fastapi.responses import StreamingResponse

from ..auth import CurrentUser, get_current_user
from ..firestore import get_user_profile
from ..services.ai_service import call_gemini_text
from ..services.ai_service import stream_gemini_text
from ..services.assistant_style import normalize_assistant_style
from ..services.chemistry_service import (
    extract_structured_chemistry_input,
    is_chemistry_prompt,
    solve_chemistry_problem,
)
from ..services.file_service import save_upload
from ..services.math_service import extract_structured_math_input, is_math_prompt, solve_math_problem
from ..services.model_registry import get_chat_model
from ..services.physics_service import extract_structured_physics_input, is_physics_prompt, solve_physics_problem
from ..services.vision_service import analyze_visual_context
from ..utils import (
    ProviderTimeoutError,
    enforce_payload_limits,
    err_response,
    is_provider_quota_error,
    normalize_message,
    ok_response,
    provider_busy_response,
    rate_limit,
    require_department,
    require_institution,
)


router = APIRouter()

ACADEMIC_ASSISTANT_SYSTEM = """You are an academic assistant helping university students.
Be clear, structured, and educational."""

MATH_VISION_EXTRACTION_PROMPT = (
    "Read the uploaded image carefully and extract only the printed math problem. "
    "Preserve symbols, numbers, variables, fractions, roots, derivatives, integrals, probability wording, matrices, and equations exactly where readable. "
    "Do not solve it. Do not explain the image. If the math is blurry, ambiguous, or handwritten enough that extraction is unreliable, say exactly: Unable to extract math reliably from this image. "
    "Return plain text only."
)

PHYSICS_VISION_EXTRACTION_PROMPT = (
    "Read the uploaded image carefully and extract only the printed physics problem. "
    "Preserve formulas, symbols, numbers, variables, units, and question wording exactly where readable. "
    "Do not solve it. Do not explain the image. If the physics text is blurry, ambiguous, diagram-dependent, or handwriting-heavy enough that extraction is unreliable, say exactly: Unable to extract physics reliably from this image. "
    "Return plain text only."
)

CHEMISTRY_VISION_EXTRACTION_PROMPT = (
    "Read the uploaded image carefully and extract only the printed chemistry problem. "
    "Preserve chemical formulas, numbers, units, percentages, concentrations, reaction arrows, and question wording exactly where readable. "
    "Do not solve it. Do not explain the image. If the chemistry text is blurry, ambiguous, handwriting-heavy, or depends on a complex structural/reaction diagram, say exactly: Unable to extract chemistry reliably from this image. "
    "Return plain text only."
)

QUANTITATIVE_VISION_EXTRACTION_PROMPT = (
    "If the uploaded image contains a clear printed math, physics, or chemistry problem, extract that problem text only. "
    "Preserve formulas, chemical notation, numbers, symbols, variables, units, concentrations, percentages, and reaction arrows. Do not solve it. "
    "If the quantitative text is too unclear to extract safely, say exactly: Unable to extract quantitative problem reliably from this image. "
    "If the image is not a school-level quantitative problem, briefly describe the image in one sentence."
)


def _looks_like_reliable_math_extraction(extracted_problem: str) -> bool:
    text = str(extracted_problem or "").strip()
    if not text:
        return False
    if text == "Unable to extract math reliably from this image.":
        return False
    if text == "Unable to extract quantitative problem reliably from this image.":
        return False
    structured = extract_structured_math_input(text, source="image")
    if not structured.get("isMath"):
        return False
    if structured.get("operation") == "unsupported":
        if len(text) > 180 and not re.search(r"[=+\-*/^\\]|(?:\d+\s*/\s*\d+)", text):
            return False
    return True


def _file_to_data_url(file_path: str, content_type: str | None) -> str:
    path = Path(file_path)
    mime_type = str(content_type or "image/png").strip() or "image/png"
    data = path.read_bytes()
    return f"data:{mime_type};base64,{base64.b64encode(data).decode('ascii')}"


async def _handle_chat(
    request: Request,
    user: CurrentUser,
    body: dict | None = None,
    system_instruction: str | None = None,
    message_prefix: str | None = None,
    assistant_style: str | None = None,
) -> object:
    body = body or await request.json()
    message = normalize_message(body or {})
    assistant_style = normalize_assistant_style(assistant_style or (body or {}).get("assistantStyle"))
    if not message:
        return err_response("MESSAGE_REQUIRED", 400)
    if message_prefix:
        message = f"{message_prefix}\n{message}"
    try:
        rate_limit(user.uid, limit=15, window_sec=60)
        enforce_payload_limits(body or {}, message)
    except Exception as exc:  # HTTPException
        status = getattr(exc, "status_code", 400)
        detail = getattr(exc, "detail", {}) or {}
        code = detail.get("code") if isinstance(detail, dict) else None
        return err_response(str(code or "BAD_REQUEST"), status)

    if user.role != "super_admin" and not user.institution_id:
        return err_response("FORBIDDEN", 403)

    requested_institution = (body or {}).get("institutionId")
    requested_department = (body or {}).get("departmentId")
    scoped_institution = (
        str(requested_institution or user.institution_id or "")
        if user.role == "super_admin"
        else str(user.institution_id or "")
    )
    if not scoped_institution:
        return err_response("FORBIDDEN", 403)

    if user.role in {"super_admin", "institution_admin"}:
        scoped_department = str(requested_department or user.department_id or "general")
    else:
        default_department = str(user.department_id or "general")
        requested_department_str = str(requested_department or "").strip()
        if requested_department_str and requested_department_str not in {default_department, "general"}:
            return err_response("FORBIDDEN", 403)
        scoped_department = requested_department_str or default_department

    try:
        require_institution(user, scoped_institution)
        require_department(user, scoped_department)
    except Exception as exc:  # HTTPException
        status = getattr(exc, "status_code", 403)
        detail = getattr(exc, "detail", {}) or {}
        return err_response(str(detail.get("code") or "FORBIDDEN"), status)

    profile = get_user_profile(user.uid) or {}
    context = {
        "uid": user.uid,
        "role": user.role,
        "institutionId": scoped_institution,
        "departmentId": scoped_department,
        "profileName": profile.get("fullName") or profile.get("name"),
        "profileEmail": profile.get("email"),
    }
    stream_requested = str(request.query_params.get("stream", "")).strip() in {"1", "true", "yes"}

    print(
        f"[AI_DEBUG] rid={getattr(request.state, 'request_id', None)} "
        f"uid={user.uid} role={user.role} institutionId={scoped_institution} "
        f"endpoint={request.url.path} provider=gemini status=started"
    )
    if stream_requested:
        async def event_stream() -> object:
            trace = getattr(request.state, "request_id", None) or "none"
            yield "event: start\ndata: {\"ok\":true}\n\n"
            accumulated_text = ""
            first_chunk_at = None
            model_started = perf_counter()
            try:
                async for delta in stream_gemini_text(
                    message,
                    context,
                    system_instruction=system_instruction,
                    assistant_style=assistant_style,
                ):
                    if first_chunk_at is None:
                        first_chunk_at = perf_counter()
                        print(
                            f"[AI_TIMING] rid={trace} stage=first_chunk ms={int((first_chunk_at - model_started) * 1000)} endpoint={request.url.path}",
                            flush=True,
                        )
                    accumulated_text += delta
                    yield f"event: chunk\ndata: {json.dumps({'delta': delta}, ensure_ascii=False)}\n\n"
            except Exception as exc:
                yield f"event: error\ndata: {json.dumps({'message': str(exc)}, ensure_ascii=False)}\n\n"
                return
            final_text = accumulated_text.strip() or "I couldn't generate a response."
            print(
                f"[AI_TIMING] rid={trace} stage=stream_end ms={int((perf_counter() - model_started) * 1000)} "
                f"endpoint={request.url.path} chars={len(final_text)}",
                flush=True,
            )
            yield f"event: done\ndata: {json.dumps({'text': final_text}, ensure_ascii=False)}\n\n"

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    try:
        text = await call_gemini_text(
            message,
            context,
            system_instruction=system_instruction,
            assistant_style=assistant_style,
        )
        print(
            f"[AI_DEBUG] rid={getattr(request.state, 'request_id', None)} "
            f"uid={user.uid} role={user.role} institutionId={scoped_institution} "
            f"endpoint={request.url.path} provider=gemini status=ok"
        )
    except ProviderTimeoutError:
        print(
            f"[AI_DEBUG] rid={getattr(request.state, 'request_id', None)} "
            f"uid={user.uid} role={user.role} institutionId={scoped_institution} "
            f"endpoint={request.url.path} provider=gemini status=timeout"
        )
        return err_response("AI_TIMEOUT", 504)
    except RuntimeError as exc:
        if str(exc) == "MISSING_PROVIDER_KEY":
            print(
                f"[AI_DEBUG] rid={getattr(request.state, 'request_id', None)} "
                f"uid={user.uid} role={user.role} institutionId={scoped_institution} "
                f"endpoint={request.url.path} provider=gemini status=missing_key"
            )
            return err_response("MISSING_PROVIDER_KEY", 500)
        if is_provider_quota_error(str(exc)):
            fallback = provider_busy_response()
            print(
                f"[AI_DEBUG] rid={getattr(request.state, 'request_id', None)} "
                f"uid={user.uid} role={user.role} institutionId={scoped_institution} "
                f"endpoint={request.url.path} provider=gemini status=quota_fallback"
            )
            return ok_response(
                text=fallback,
                data={
                    "answer": fallback,
                    "provider": "gemini",
                    "model": get_chat_model(),
                    "error_code": "PROVIDER_RATE_LIMIT",
                },
            )
        env = (os.getenv("APP_ENV") or os.getenv("ENV") or "").strip().lower()
        detail = str(exc) if env != "production" else None
        print(
            f"[AI_DEBUG] rid={getattr(request.state, 'request_id', None)} "
            f"uid={user.uid} role={user.role} institutionId={scoped_institution} "
            f"endpoint={request.url.path} provider=gemini status=provider_error"
        )
        return err_response("PROVIDER_ERROR", 502, detail)
    except Exception:
        env = (os.getenv("APP_ENV") or os.getenv("ENV") or "").strip().lower()
        detail = "UNEXPECTED_PROVIDER_ERROR" if env != "production" else None
        print(
            f"[AI_DEBUG] rid={getattr(request.state, 'request_id', None)} "
            f"uid={user.uid} role={user.role} institutionId={scoped_institution} "
            f"endpoint={request.url.path} provider=gemini status=provider_error"
        )
        return err_response("PROVIDER_ERROR", 502, detail)

    return ok_response(text=text, data=None)


@router.post("/api/chat")
async def chat(request: Request, user: CurrentUser = Depends(get_current_user)) -> object:
    print(
        f"[AUTH_ROUTE] rid={getattr(request.state, 'request_id', None)} "
        f"endpoint=/api/chat authHeaderExists={bool(request.headers.get('authorization'))} uid={user.uid or 'none'}"
    )
    body = await request.json()
    return await _handle_chat(request, user, body=body, assistant_style=(body or {}).get("assistantStyle"))


@router.post("/api/chat/upload")
async def chat_upload(
    request: Request,
    user: CurrentUser = Depends(get_current_user),
    message: str = Form(default=""),
    files: list[UploadFile] = File(default=[]),
    institutionId: str | None = Form(default=None),
    departmentId: str | None = Form(default=None),
    assistantStyle: str | None = Form(default=None),
) -> object:
    print(
        f"[AUTH_ROUTE] rid={getattr(request.state, 'request_id', None)} "
        f"endpoint=/api/chat/upload authHeaderExists={bool(request.headers.get('authorization'))} uid={user.uid or 'none'}"
    )
    clean_message = str(message or "").strip()
    assistant_style = normalize_assistant_style(assistantStyle)
    if not clean_message and not files:
        return err_response("MESSAGE_REQUIRED", 400)
    try:
        rate_limit(user.uid, limit=15, window_sec=60)
        if len(clean_message) > 4000:
            return err_response("PAYLOAD_TOO_LARGE", 413)
    except Exception as exc:  # HTTPException
        status = getattr(exc, "status_code", 400)
        detail = getattr(exc, "detail", {}) or {}
        code = detail.get("code") if isinstance(detail, dict) else None
        return err_response(str(code or "BAD_REQUEST"), status)

    if user.role != "super_admin" and not user.institution_id:
        return err_response("FORBIDDEN", 403)

    scoped_institution = (
        str(institutionId or user.institution_id or "")
        if user.role == "super_admin"
        else str(user.institution_id or "")
    )
    if not scoped_institution:
        return err_response("FORBIDDEN", 403)

    if user.role in {"super_admin", "institution_admin"}:
        scoped_department = str(departmentId or user.department_id or "general")
    else:
        default_department = str(user.department_id or "general")
        requested_department_str = str(departmentId or "").strip()
        if requested_department_str and requested_department_str not in {default_department, "general"}:
            return err_response("FORBIDDEN", 403)
        scoped_department = requested_department_str or default_department

    try:
        require_institution(user, scoped_institution)
        require_department(user, scoped_department)
    except Exception as exc:  # HTTPException
        status = getattr(exc, "status_code", 403)
        detail = getattr(exc, "detail", {}) or {}
        return err_response(str(detail.get("code") or "FORBIDDEN"), status)

    saved_files = []
    for f in files or []:
        saved_files.append(await save_upload(f))

    image_files = [x for x in saved_files if str(x.get("content_type") or "").lower().startswith("image/")]
    attachment_summary = ", ".join(x.get("filename") or "file" for x in saved_files) or "none"

    profile = get_user_profile(user.uid) or {}
    context = {
        "uid": user.uid,
        "role": user.role,
        "institutionId": scoped_institution,
        "departmentId": scoped_department,
        "profileName": profile.get("fullName") or profile.get("name"),
        "profileEmail": profile.get("email"),
        "attachments": [
            {
                "filename": x.get("filename"),
                "content_type": x.get("content_type"),
                "size": x.get("size"),
            }
            for x in saved_files
        ],
    }

    if image_files:
        image_data_urls = [_file_to_data_url(str(x.get("path") or ""), x.get("content_type")) for x in image_files]
        likely_chemistry_upload = is_chemistry_prompt(clean_message)
        likely_physics_upload = is_physics_prompt(clean_message)
        likely_math_upload = not likely_chemistry_upload and not likely_physics_upload and is_math_prompt(clean_message)
        vision_prompt = (
            CHEMISTRY_VISION_EXTRACTION_PROMPT
            if likely_chemistry_upload
            else
            PHYSICS_VISION_EXTRACTION_PROMPT
            if likely_physics_upload
            else MATH_VISION_EXTRACTION_PROMPT
            if likely_math_upload
            else QUANTITATIVE_VISION_EXTRACTION_PROMPT
            if not clean_message
            else (clean_message or "Describe the uploaded image.")
        )
        try:
            vision_result = await analyze_visual_context(
                image_data_urls=image_data_urls,
                prompt=vision_prompt,
                family="chat",
                app=user.role or "student",
            )
        except ProviderTimeoutError:
            return err_response("AI_TIMEOUT", 504)
        except RuntimeError as exc:
            if str(exc) == "MISSING_GEMINI_KEY":
                return err_response("MISSING_PROVIDER_KEY", 500)
            return err_response("PROVIDER_ERROR", 502, str(exc))
        except Exception:
            return err_response("PROVIDER_ERROR", 502)

        extracted_problem = str(vision_result.get("answer") or "").strip()
        if extracted_problem == "Unable to extract chemistry reliably from this image.":
            return ok_response(
                text=(
                    "Problem:\n"
                    "\\[Unable\\ to\\ extract\\ chemistry\\ reliably\\ from\\ this\\ image\\]\n\n"
                    "Given:\n"
                    "- The uploaded image appears to contain a chemistry-style question.\n\n"
                    "Formula / Principle:\n"
                    "\\[Not\\ selected\\ safely\\]\n\n"
                    "Steps:\n"
                    "1. I checked the uploaded image for a printed chemistry problem.\n"
                    "2. The text was too unclear, too handwriting-dependent, or too diagram-dependent to extract safely.\n"
                    "3. I am not going to guess.\n"
                    "4. Please upload a clearer printed screenshot or type the chemistry problem directly.\n\n"
                    "Final Answer:\n"
                    "\\[\\boxed{Please\\ resend\\ a\\ clearer\\ printed\\ chemistry\\ image}\\]"
                ),
                data={
                    "attachments": context["attachments"],
                    "highlights": vision_result.get("highlights") or [],
                    "provider": vision_result.get("provider"),
                    "model": vision_result.get("model"),
                    "image_count": len(image_files),
                    "attachment_summary": attachment_summary,
                    "chemistry_input": extracted_problem,
                    "chemistryStructuredInput": {
                        "source": "image",
                        "category": "unsupported",
                        "originalText": extracted_problem,
                        "normalizedText": extracted_problem,
                        "isChemistry": True,
                    },
                    "chemistrySolved": False,
                    "chemistryLimitation": "Unable to extract chemistry reliably from this image.",
                },
            )
        if extracted_problem == "Unable to extract physics reliably from this image.":
            return ok_response(
                text=(
                    "Problem:\n"
                    "\\[Unable\\ to\\ extract\\ physics\\ reliably\\ from\\ this\\ image\\]\n\n"
                    "Given:\n"
                    "- The uploaded image appears to contain a physics-style question.\n\n"
                    "Formula:\n"
                    "\\[Not\\ selected\\ safely\\]\n\n"
                    "Substitution:\n"
                    "\\[Not\\ applied\\]\n\n"
                    "Steps:\n"
                    "1. I checked the uploaded image for a printed physics problem.\n"
                    "2. The text was too unclear, too handwriting-dependent, or too diagram-dependent to extract safely.\n"
                    "3. I am not going to guess.\n"
                    "4. Please upload a clearer printed screenshot or type the problem directly.\n\n"
                    "Final Answer:\n"
                    "\\[\\boxed{Please\\ resend\\ a\\ clearer\\ printed\\ physics\\ image}\\]"
                ),
                data={
                    "attachments": context["attachments"],
                    "highlights": vision_result.get("highlights") or [],
                    "provider": vision_result.get("provider"),
                    "model": vision_result.get("model"),
                    "image_count": len(image_files),
                    "attachment_summary": attachment_summary,
                    "physics_input": extracted_problem,
                    "physicsStructuredInput": {
                        "source": "image",
                        "category": "unsupported",
                        "originalText": extracted_problem,
                        "normalizedText": extracted_problem,
                        "isPhysics": True,
                    },
                    "physicsSolved": False,
                    "physicsLimitation": "Unable to extract physics reliably from this image.",
                },
            )
        if extracted_problem == "Unable to extract quantitative problem reliably from this image.":
            return ok_response(
                text=(
                    "Problem:\n"
                    "\\[Unable\\ to\\ extract\\ the\\ quantitative\\ problem\\ reliably\\ from\\ this\\ image\\]\n\n"
                    "Given:\n"
                    "- The uploaded image may contain math or physics text, but the extraction confidence was too low.\n\n"
                    "Formula:\n"
                    "\\[Not\\ selected\\ safely\\]\n\n"
                    "Substitution:\n"
                    "\\[Not\\ applied\\]\n\n"
                    "Steps:\n"
                    "1. I checked the uploaded image for a printed math or physics problem.\n"
                    "2. The content was too unclear to extract safely.\n"
                    "3. I am not going to guess.\n"
                    "4. Please upload a clearer image or type the problem directly.\n\n"
                    "Final Answer:\n"
                    "\\[\\boxed{Please\\ resend\\ a\\ clearer\\ image\\ or\\ typed\\ problem}\\]"
                ),
                data={
                    "attachments": context["attachments"],
                    "highlights": vision_result.get("highlights") or [],
                    "provider": vision_result.get("provider"),
                    "model": vision_result.get("model"),
                    "image_count": len(image_files),
                    "attachment_summary": attachment_summary,
                },
            )
        if extracted_problem == "Unable to extract math reliably from this image.":
            return ok_response(
                text=(
                    "Problem:\n"
                    "\\[Unable\\ to\\ extract\\ math\\ reliably\\ from\\ this\\ image\\]\n\n"
                    "Steps:\n"
                    "1. I checked the uploaded image for a printed math problem.\n"
                    "2. The expression was too unclear or too handwriting-dependent to extract safely.\n"
                    "3. I am not going to guess.\n"
                    "4. Please upload a clearer printed screenshot or type the problem directly.\n\n"
                    "Final Answer:\n"
                    "\\[\\boxed{Please\\ resend\\ a\\ clearer\\ printed\\ math\\ image}\\]"
                ),
                data={
                    "attachments": context["attachments"],
                    "highlights": vision_result.get("highlights") or [],
                    "provider": vision_result.get("provider"),
                    "model": vision_result.get("model"),
                    "image_count": len(image_files),
                    "attachment_summary": attachment_summary,
                    "math_input": extracted_problem,
                    "mathStructuredInput": {
                        "source": "image",
                        "operation": "unsupported",
                        "originalText": extracted_problem,
                        "normalizedText": extracted_problem,
                        "expression": "",
                        "isMath": True,
                    },
                    "mathSolved": False,
                    "mathLimitation": "Unable to extract math reliably from this image.",
                },
            )
        extracted_chemistry = extract_structured_chemistry_input(extracted_problem, source="image")
        typed_chemistry = extract_structured_chemistry_input(clean_message, source="typed") if clean_message else {
            "isChemistry": False,
            "normalizedText": "",
            "category": "unsupported",
        }
        extracted_physics = extract_structured_physics_input(extracted_problem, source="image")
        typed_physics = extract_structured_physics_input(clean_message, source="typed") if clean_message else {
            "isPhysics": False,
            "normalizedText": "",
            "category": "unsupported",
        }
        extracted_math = extract_structured_math_input(extracted_problem, source="image")
        typed_math = extract_structured_math_input(clean_message, source="typed") if clean_message else {
            "isMath": False,
            "normalizedText": "",
            "expression": "",
            "operation": "unsupported",
        }
        reliable_math_extraction = _looks_like_reliable_math_extraction(extracted_problem)
        should_use_chemistry_engine = bool(extracted_chemistry.get("isChemistry") or typed_chemistry.get("isChemistry"))
        should_use_physics_engine = bool(extracted_physics.get("isPhysics") or typed_physics.get("isPhysics"))
        should_use_math_engine = bool((reliable_math_extraction and extracted_math.get("isMath")) or typed_math.get("isMath"))

        if should_use_chemistry_engine:
            canonical_chemistry_input = (
                extracted_chemistry.get("originalText")
                or extracted_chemistry.get("normalizedText")
                or typed_chemistry.get("originalText")
                or typed_chemistry.get("normalizedText")
                or clean_message
            )
            chemistry_solution = solve_chemistry_problem(str(canonical_chemistry_input or "").strip(), source="image")
            return ok_response(
                text=chemistry_solution.text,
                data={
                    "attachments": context["attachments"],
                    "highlights": vision_result.get("highlights") or [],
                    "provider": vision_result.get("provider"),
                    "model": vision_result.get("model"),
                    "image_count": len(image_files),
                    "attachment_summary": attachment_summary,
                    "chemistry_input": extracted_problem,
                    "chemistryStructuredInput": extracted_chemistry,
                    "chemistrySolved": chemistry_solution.solved,
                    "chemistryLimitation": chemistry_solution.limitation,
                },
            )

        if should_use_physics_engine:
            canonical_physics_input = (
                extracted_physics.get("originalText")
                or extracted_physics.get("normalizedText")
                or typed_physics.get("originalText")
                or typed_physics.get("normalizedText")
                or clean_message
            )
            physics_solution = solve_physics_problem(str(canonical_physics_input or "").strip(), source="image")
            return ok_response(
                text=physics_solution.text,
                data={
                    "attachments": context["attachments"],
                    "highlights": vision_result.get("highlights") or [],
                    "provider": vision_result.get("provider"),
                    "model": vision_result.get("model"),
                    "image_count": len(image_files),
                    "attachment_summary": attachment_summary,
                    "physics_input": extracted_problem,
                    "physicsStructuredInput": extracted_physics,
                    "physicsSolved": physics_solution.solved,
                    "physicsLimitation": physics_solution.limitation,
                },
            )

        if should_use_math_engine:
            canonical_math_input = (
                extracted_math.get("originalText")
                if reliable_math_extraction
                else ""
            ) or (
                extracted_math.get("normalizedText")
                if reliable_math_extraction
                else ""
            ) or (
                typed_math.get("originalText")
                or typed_math.get("normalizedText")
                or clean_message
            )
            math_solution = solve_math_problem(str(canonical_math_input or "").strip(), source="image")
            return ok_response(
                text=math_solution.text,
                data={
                    "attachments": context["attachments"],
                    "highlights": vision_result.get("highlights") or [],
                    "provider": vision_result.get("provider"),
                    "model": vision_result.get("model"),
                    "image_count": len(image_files),
                    "attachment_summary": attachment_summary,
                    "math_input": extracted_problem,
                    "mathStructuredInput": extracted_math,
                    "mathExtractionReliable": reliable_math_extraction,
                    "mathSolved": math_solution.solved,
                    "mathLimitation": math_solution.limitation,
                },
            )

        if likely_math_upload and not typed_math.get("isMath") and not reliable_math_extraction:
            return ok_response(
                text=(
                    "Problem:\n"
                    "\\[Unable\\ to\\ extract\\ math\\ reliably\\ from\\ this\\ image\\]\n\n"
                    "Steps:\n"
                    "1. I checked the uploaded image for a printed math problem.\n"
                    "2. The extracted text was too unclear or too low-confidence to route into the deterministic math solver safely.\n"
                    "3. I am not going to guess.\n"
                    "4. Please upload a clearer printed screenshot or type the equation directly.\n\n"
                    "Final Answer:\n"
                    "\\[\\boxed{Please\\ resend\\ a\\ clearer\\ printed\\ math\\ image}\\]"
                ),
                data={
                    "attachments": context["attachments"],
                    "highlights": vision_result.get("highlights") or [],
                    "provider": vision_result.get("provider"),
                    "model": vision_result.get("model"),
                    "image_count": len(image_files),
                    "attachment_summary": attachment_summary,
                    "math_input": extracted_problem,
                    "mathStructuredInput": extracted_math,
                    "mathExtractionReliable": False,
                    "mathSolved": False,
                    "mathLimitation": "Unable to extract math reliably from this image.",
                },
            )

        answer = str(vision_result.get("answer") or clean_message or "Done").strip()
        return ok_response(
            text=answer,
            data={
                "attachments": context["attachments"],
                "highlights": vision_result.get("highlights") or [],
                "provider": vision_result.get("provider"),
                "model": vision_result.get("model"),
                "image_count": len(image_files),
                "attachment_summary": attachment_summary,
            },
        )

    prompt = clean_message or "Sent attachments"
    prompt = f"{prompt}\n\nAttachments: {attachment_summary}"

    try:
        text = await call_gemini_text(prompt, context, assistant_style=assistant_style)
    except ProviderTimeoutError:
        return err_response("AI_TIMEOUT", 504)
    except RuntimeError as exc:
        if str(exc) == "MISSING_PROVIDER_KEY":
            return err_response("MISSING_PROVIDER_KEY", 500)
        return err_response("PROVIDER_ERROR", 502)
    except Exception:
        return err_response("PROVIDER_ERROR", 502)

    return ok_response(text=text, data={"attachments": context["attachments"]})
