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
from ..services.file_service import save_upload
from ..services.model_registry import get_chat_model
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
        vision_prompt = clean_message or "Describe the uploaded image."
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
