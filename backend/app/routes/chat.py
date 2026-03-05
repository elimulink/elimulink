from __future__ import annotations

import os

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile

from ..auth import CurrentUser, get_current_user
from ..firestore import get_user_profile
from ..services.ai_service import call_gemini_text
from ..services.file_service import save_upload
from ..utils import (
    ProviderTimeoutError,
    enforce_payload_limits,
    err_response,
    normalize_message,
    ok_response,
    rate_limit,
    require_department,
    require_institution,
)


router = APIRouter()

ACADEMIC_ASSISTANT_SYSTEM = """You are an academic assistant helping university students.
Be clear, structured, and educational."""


async def _handle_chat(
    request: Request,
    user: CurrentUser,
    system_instruction: str | None = None,
    message_prefix: str | None = None,
) -> object:
    body = await request.json()
    message = normalize_message(body or {})
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

    print(
        f"[AI_DEBUG] rid={getattr(request.state, 'request_id', None)} "
        f"uid={user.uid} role={user.role} institutionId={scoped_institution} "
        f"endpoint={request.url.path} provider=gemini status=started"
    )
    try:
        text = await call_gemini_text(message, context, system_instruction=system_instruction)
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
    return await _handle_chat(request, user)


@router.post("/api/ai/chat")
async def ai_chat(request: Request, user: CurrentUser = Depends(get_current_user)) -> object:
    print(
        f"[AUTH_ROUTE] rid={getattr(request.state, 'request_id', None)} "
        f"endpoint=/api/ai/chat authHeaderExists={bool(request.headers.get('authorization'))} uid={user.uid or 'none'}"
    )
    return await _handle_chat(
        request,
        user,
        system_instruction=ACADEMIC_ASSISTANT_SYSTEM,
        message_prefix="Student question:",
    )


@router.post("/api/chat/upload")
async def chat_upload(
    request: Request,
    user: CurrentUser = Depends(get_current_user),
    message: str = Form(default=""),
    files: list[UploadFile] = File(default=[]),
    institutionId: str | None = Form(default=None),
    departmentId: str | None = Form(default=None),
) -> object:
    print(
        f"[AUTH_ROUTE] rid={getattr(request.state, 'request_id', None)} "
        f"endpoint=/api/chat/upload authHeaderExists={bool(request.headers.get('authorization'))} uid={user.uid or 'none'}"
    )
    clean_message = str(message or "").strip()
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

    attachment_summary = ", ".join(x.get("filename") or "file" for x in saved_files) or "none"
    prompt = clean_message or "Sent attachments"
    prompt = f"{prompt}\n\nAttachments: {attachment_summary}"

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

    try:
        text = await call_gemini_text(prompt, context)
    except ProviderTimeoutError:
        return err_response("AI_TIMEOUT", 504)
    except RuntimeError as exc:
        if str(exc) == "MISSING_PROVIDER_KEY":
            return err_response("MISSING_PROVIDER_KEY", 500)
        return err_response("PROVIDER_ERROR", 502)
    except Exception:
        return err_response("PROVIDER_ERROR", 502)

    return ok_response(text=text, data={"attachments": context["attachments"]})
