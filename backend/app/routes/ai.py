from __future__ import annotations

import asyncio
import json
from typing import Optional

from fastapi import APIRouter, Header, Request
from fastapi.exceptions import HTTPException
from fastapi.responses import StreamingResponse

from ..auth import CurrentUser
from ..core.dependencies import get_db
from ..schemas.ai import AIChatRequest
from ..services.ai_orchestrator import run_orchestrator
from ..services.ai_service import stream_gemini_text
from ..services.auth_service import resolve_user_from_header
from ..services.intent_router import detect_intent
from ..utils import enforce_payload_limits, err_response, normalize_message, ok_response, rate_limit


router = APIRouter()

INSTITUTION_FAST_STREAM_INTENTS = {
    "general_chat",
    "announcements",
    "institution_analytics",
    "image_generation",
    "image_edit",
}


def _is_institution_request(body: dict) -> bool:
    host_mode = str((body or {}).get("hostMode") or "").strip().lower()
    app_type = str((body or {}).get("app_type") or "").strip().lower()
    return host_mode == "institution" or app_type == "institution"


def _workspace_context_from_body(body: dict, user: CurrentUser) -> dict:
    requested_context = (body or {}).get("workspaceContext")
    if isinstance(requested_context, dict) and requested_context:
        return requested_context
    return {
        "scope": "institution",
        "institution": (body or {}).get("institutionId") or user.institution_id,
        "department": (body or {}).get("departmentName") or (body or {}).get("departmentId") or user.department_id,
        "role": user.role,
    }


def _sse_event(event_name: str, payload: dict) -> str:
    return f"event: {event_name}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


@router.post("/api/ai/chat")
async def ai_chat(request: Request, authorization: Optional[str] = Header(default=None)) -> object:
    body = await request.json()
    message = normalize_message(body or {})
    mode = (body or {}).get("mode")
    workspace_context = (body or {}).get("workspaceContext") or (body or {}).get("context") or {}
    if not message:
        return err_response("MESSAGE_REQUIRED", 400)
    try:
        enforce_payload_limits(body or {}, message)
    except Exception as exc:  # HTTPException
        status = getattr(exc, "status_code", 400)
        detail = getattr(exc, "detail", {}) or {}
        return err_response(str(detail.get("code") or "BAD_REQUEST"), status)

    try:
        user = resolve_user_from_header(authorization)
    except HTTPException:
        user = None
    user = user or CurrentUser(uid="public", role="public")
    rate_limit(user.uid, limit=15, window_sec=60)
    payload = AIChatRequest(**(body or {}))

    with get_db() as db:
        answer, session_id, intent, tool_used = await run_orchestrator(
            db,
            user,
            payload.message,
            payload.session_id,
            payload.app_type,
            mode=mode,
            workspace_context=workspace_context if isinstance(workspace_context, dict) else {},
        )

    stream_requested = str(request.query_params.get("stream", "")).strip() in {"1", "true", "yes"}
    if stream_requested:
        async def event_stream() -> object:
            # First event confirms stream readiness.
            yield "event: start\ndata: {\"ok\":true}\n\n"
            text = str(answer or "")
            if not text:
                yield "event: done\ndata: {\"text\":\"\"}\n\n"
                return

            chunk_size = 40
            for i in range(0, len(text), chunk_size):
                chunk = text[i : i + chunk_size]
                payload_chunk = json.dumps({"delta": chunk}, ensure_ascii=False)
                yield f"event: chunk\ndata: {payload_chunk}\n\n"
                await asyncio.sleep(0.01)

            payload_done = json.dumps({"text": text}, ensure_ascii=False)
            yield f"event: done\ndata: {payload_done}\n\n"

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    return ok_response(
        text=answer,
        data={
            "answer": answer,
            "session_id": session_id,
            "intent": intent,
            "tool_used": tool_used,
        },
    )


@router.post("/api/ai/student")
async def ai_student(request: Request, authorization: Optional[str] = Header(default=None)) -> object:
    body = await request.json()
    message = normalize_message(body or {})
    if not message:
        return err_response("MESSAGE_REQUIRED", 400)
    try:
        enforce_payload_limits(body or {}, message)
    except Exception as exc:  # HTTPException
        status = getattr(exc, "status_code", 400)
        detail = getattr(exc, "detail", {}) or {}
        return err_response(str(detail.get("code") or "BAD_REQUEST"), status)

    if not authorization:
        return err_response("AUTH_REQUIRED", 401)
    try:
        user = resolve_user_from_header(authorization)
    except HTTPException:
        return err_response("AUTH_INVALID", 401)
    if not user:
        return err_response("AUTH_REQUIRED", 401)
    rate_limit(user.uid, limit=15, window_sec=60)
    payload = AIChatRequest(**(body or {}))
    intent = detect_intent(message)
    stream_requested = str(request.query_params.get("stream", "")).strip() in {"1", "true", "yes"}

    if (
        stream_requested
        and _is_institution_request(body or {})
        and intent in INSTITUTION_FAST_STREAM_INTENTS
    ):
        async def institution_event_stream() -> object:
            yield _sse_event("start", {"ok": True})
            accumulated_text = ""
            context = {
                "uid": user.uid,
                "role": user.role,
                "institutionId": (body or {}).get("institutionId") or user.institution_id,
                "departmentId": (body or {}).get("departmentId") or user.department_id or "general",
                "departmentName": (body or {}).get("departmentName") or "General",
                "hostMode": "institution",
            }
            try:
                async for delta in stream_gemini_text(
                    message,
                    context,
                    mode=(body or {}).get("mode"),
                    workspace_context=_workspace_context_from_body(body or {}, user),
                ):
                    accumulated_text += delta
                    yield _sse_event("chunk", {"delta": delta})
            except Exception as exc:  # noqa: BLE001
                error_message = str(exc) if str(exc) != "MISSING_PROVIDER_KEY" else "AI provider key is missing."
                yield _sse_event("error", {"message": error_message})
                return
            final_text = accumulated_text.strip() or "I couldn't generate a response."
            yield _sse_event("done", {"text": final_text, "intent": intent})

        return StreamingResponse(
            institution_event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    with get_db() as db:
        answer, session_id, intent, tool_used = await run_orchestrator(
            db,
            user,
            payload.message,
            payload.session_id,
            payload.app_type or "student",
        )

    return ok_response(
        text=answer,
        data={
            "answer": answer,
            "session_id": session_id,
            "intent": intent,
            "tool_used": tool_used,
        },
    )
