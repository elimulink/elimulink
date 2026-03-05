from __future__ import annotations

import time
from collections import defaultdict, deque
from typing import Any, Optional

import httpx
from fastapi import HTTPException
from fastapi.responses import JSONResponse

from .auth import CurrentUser

_RATE_BUCKETS: dict[str, deque[float]] = defaultdict(deque)

MAX_BODY_BYTES = 100_000
MAX_MESSAGE_CHARS = 4_000
MAX_MESSAGES = 30


class ProviderTimeoutError(Exception):
    pass


def ok_response(
    text: Optional[str] = None,
    data: Any = None,
    status_code: int = 200,
    **extra: Any,
) -> JSONResponse:
    payload: dict[str, Any] = {"ok": True, "text": text, "data": data}
    payload.update(extra)
    return JSONResponse(status_code=status_code, content=payload)


def err_response(code: str, status_code: int, message: Optional[str] = None) -> JSONResponse:
    msg = str(message or code)
    err_code = str(code)
    return JSONResponse(
        status_code=status_code,
        content={
            "ok": False,
            "error": err_code,  # backward compatibility for existing frontend checks
            "code": err_code,
            "message": msg,
        },
    )


def normalize_message(payload: dict[str, Any]) -> str:
    value = payload.get("message") or payload.get("text") or payload.get("prompt")
    return str(value or "").strip()


def rate_limit(uid: str, limit: int = 15, window_sec: int = 60) -> None:
    now = time.time()
    bucket = _RATE_BUCKETS[uid]
    while bucket and (now - bucket[0]) > window_sec:
        bucket.popleft()
    if len(bucket) >= limit:
        raise HTTPException(
            status_code=429,
            detail={"code": "RATE_LIMIT", "message": "Too many requests"},
        )
    bucket.append(now)


def enforce_payload_limits(body: dict[str, Any], message: str) -> None:
    body_size = len(str(body or {}).encode("utf-8"))
    if body_size > MAX_BODY_BYTES:
        raise HTTPException(
            status_code=413,
            detail={"code": "PAYLOAD_TOO_LARGE", "message": "Request payload too large"},
        )

    if len(message) > MAX_MESSAGE_CHARS:
        raise HTTPException(
            status_code=413,
            detail={"code": "PAYLOAD_TOO_LARGE", "message": "Message exceeds allowed length"},
        )

    messages = (body or {}).get("messages")
    if isinstance(messages, list) and len(messages) > MAX_MESSAGES:
        raise HTTPException(
            status_code=413,
            detail={"code": "PAYLOAD_TOO_LARGE", "message": "Too many messages in payload"},
        )


def require_institution(user: CurrentUser, institution_id: Optional[str]) -> None:
    if user.role == "super_admin":
        return
    if not institution_id or user.institution_id != institution_id:
        raise HTTPException(
            status_code=403,
            detail={"code": "FORBIDDEN", "message": "Institution scope mismatch"},
        )


def require_department(user: CurrentUser, department_id: Optional[str]) -> None:
    if user.role in {"super_admin", "institution_admin"}:
        return
    if not department_id:
        return
    if department_id != "general" and user.department_id != department_id:
        raise HTTPException(
            status_code=403,
            detail={"code": "FORBIDDEN", "message": "Department scope mismatch"},
        )


def require_self(user: CurrentUser, uid: str) -> None:
    if user.role == "super_admin":
        return
    if user.uid != uid:
        raise HTTPException(
            status_code=403,
            detail={"code": "FORBIDDEN", "message": "User scope mismatch"},
        )


async def post_json_with_timeout(
    url: str,
    body: dict[str, Any],
    headers: Optional[dict[str, str]] = None,
    timeout_seconds: float = 25.0,
) -> dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            response = await client.post(url, json=body, headers=headers or {})
    except httpx.TimeoutException as exc:
        raise ProviderTimeoutError("AI_TIMEOUT") from exc
    except httpx.RequestError as exc:
        raise RuntimeError(f"PROVIDER_REQUEST_ERROR:{str(exc)}") from exc

    data = response.json() if response.content else {}
    if response.status_code >= 400:
        message = (
            data.get("error", {}).get("message")
            if isinstance(data.get("error"), dict)
            else data.get("error")
        ) or f"PROVIDER_HTTP_{response.status_code}"
        raise RuntimeError(str(message))
    return data
