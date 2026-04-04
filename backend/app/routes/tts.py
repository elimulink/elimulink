from __future__ import annotations

import os
from typing import Any

from fastapi import APIRouter, Depends, Request

from ..auth import CurrentUser, get_current_user
from ..services.model_registry import get_tts_model
from ..utils import (
    ProviderTimeoutError,
    err_response,
    ok_response,
    post_json_with_timeout,
    require_department,
    require_institution,
)


router = APIRouter()


@router.post("/api/ai/tts")
async def tts(request: Request, user: CurrentUser = Depends(get_current_user)) -> object:
    body = await request.json()
    text = str((body or {}).get("text") or (body or {}).get("message") or "").strip()
    if not text:
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

    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not gemini_key:
        return err_response("MISSING_PROVIDER_KEY", 500)

    voice_name = str((body or {}).get("voiceName") or "Kore")
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{get_tts_model()}:generateContent?key={gemini_key}"
    )
    payload = {
        "contents": [{"parts": [{"text": text[:300]}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice_name}}
            },
        },
    }

    try:
        raw = await post_json_with_timeout(url, payload, timeout_seconds=25.0)
    except ProviderTimeoutError:
        return err_response("AI_TIMEOUT", 504)
    except Exception:
        return err_response("PROVIDER_ERROR", 502)

    audio_base64 = (
        raw.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("inlineData", {})
        .get("data")
    )
    data = {"audioBase64": audio_base64, "tts": raw}
    # extra top-level fields included for existing frontend compatibility
    return ok_response(text=None, data=data, audioBase64=audio_base64, tts=raw)
