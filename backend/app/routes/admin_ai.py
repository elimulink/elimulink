from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request

from ..auth import CurrentUser, get_current_user
from ..firestore import get_user_profile
from ..services.ai_service import call_gemini_text
from ..utils import (
    ProviderTimeoutError,
    err_response,
    normalize_message,
    ok_response,
    require_department,
    require_institution,
)


router = APIRouter()


@router.post("/api/admin/ai")
async def admin_ai(request: Request, user: CurrentUser = Depends(get_current_user)) -> object:
    body = await request.json()
    prompt = normalize_message(body or {})
    if not prompt:
        return err_response("MESSAGE_REQUIRED", 400)

    if user.role not in {"super_admin", "institution_admin", "department_head", "lecturer"}:
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
        scoped_department = str(user.department_id or "general")

    try:
        require_institution(user, scoped_institution)
        require_department(user, scoped_department)
    except Exception as exc:  # HTTPException
        status = getattr(exc, "status_code", 403)
        detail = getattr(exc, "detail", {}) or {}
        return err_response(str(detail.get("code") or "FORBIDDEN"), status)

    profile = get_user_profile(user.uid) or {}
    context: dict[str, Any] = {
        "uid": user.uid,
        "role": user.role,
        "institutionId": scoped_institution,
        "departmentId": scoped_department,
        "profileName": profile.get("fullName") or profile.get("name"),
        "profileEmail": profile.get("email"),
        "mode": "admin_insight",
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

    return ok_response(text=text, data=None, reply=text)
