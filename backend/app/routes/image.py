from __future__ import annotations

import os
from typing import Any

from fastapi import APIRouter, Depends, Request

from ..auth import CurrentUser, get_current_user
from ..utils import (
    ProviderTimeoutError,
    err_response,
    ok_response,
    post_json_with_timeout,
    require_department,
    require_institution,
)


router = APIRouter()


@router.post("/api/ai/image")
async def image(request: Request, user: CurrentUser = Depends(get_current_user)) -> object:
    body = await request.json()
    prompt = str((body or {}).get("prompt") or (body or {}).get("message") or (body or {}).get("text") or "").strip()
    if not prompt:
        return err_response("MESSAGE_REQUIRED", 400)

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

    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not openai_key:
        return err_response("MISSING_PROVIDER_KEY", 500)

    payload = {"model": "gpt-image-1", "prompt": prompt, "size": "1024x1024", "n": 1}
    headers = {"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"}
    try:
        raw = await post_json_with_timeout(
            "https://api.openai.com/v1/images/generations",
            payload,
            headers=headers,
            timeout_seconds=25.0,
        )
    except ProviderTimeoutError:
        return err_response("AI_TIMEOUT", 504)
    except Exception:
        return err_response("PROVIDER_ERROR", 502)

    b64 = None
    if isinstance(raw.get("data"), list) and raw["data"]:
        first = raw["data"][0]
        if isinstance(first, dict):
            b64 = first.get("b64_json") or first.get("b64_image")
    image_data_url = f"data:image/png;base64,{b64}" if b64 else None
    data = {"image": image_data_url}
    # extra top-level field included for existing frontend compatibility
    return ok_response(text=None, data=data, image=image_data_url)
