from __future__ import annotations

import asyncio
import json
import os
from time import perf_counter
from typing import Optional

from fastapi import APIRouter, Header, Request
from fastapi.exceptions import HTTPException
from fastapi.responses import StreamingResponse

from ..auth import CurrentUser
from ..core.dependencies import get_db
from ..schemas.ai import AIChatRequest
from ..services.ai_orchestrator import run_orchestrator
from ..services.ai_service import stream_gemini_text
from ..services.auth_service import resolve_app_type, resolve_role, resolve_user_from_header
from ..services.assistant_style import normalize_assistant_style
from ..services.compound_question import analyze_compound_question, build_compound_request_context
from ..services.memory_service import get_recent_history
from ..repositories.chat_repository import create_session, get_session, save_message
from ..services.intent_router import detect_intent
from ..utils.ids import new_session_id
from ..services.model_registry import get_chat_model
from ..utils import (
    enforce_payload_limits,
    err_response,
    is_provider_quota_error,
    normalize_message,
    ok_response,
    provider_busy_response,
    rate_limit,
)


router = APIRouter()

INSTITUTION_FAST_STREAM_INTENTS = {
    "general_chat",
    "announcements",
    "institution_analytics",
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
    assistant_style = normalize_assistant_style((body or {}).get("assistantStyle"))
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
    trace_id = getattr(request.state, "request_id", None)
    stream_requested = str(request.query_params.get("stream", "")).strip() in {"1", "true", "yes"}

    try:
        with get_db() as db:
            answer, session_id, intent, tool_used = await run_orchestrator(
                db,
                user,
                payload.message,
                payload.session_id,
                payload.app_type,
                mode=mode,
                workspace_context=workspace_context if isinstance(workspace_context, dict) else {},
                assistant_style=normalize_assistant_style(payload.assistantStyle or assistant_style),
            )
    except Exception as exc:  # noqa: BLE001
        if str(exc) == "MISSING_PROVIDER_KEY":
            return err_response("MISSING_PROVIDER_KEY", 500)
        if is_provider_quota_error(str(exc)):
            fallback_text = provider_busy_response()
            return ok_response(
                text=fallback_text,
                data={
                    "answer": fallback_text,
                    "provider": "gemini",
                    "model": get_chat_model(),
                    "error_code": "PROVIDER_RATE_LIMIT",
                },
            )
        detail = str(exc) if str((os.getenv("APP_ENV") or os.getenv("ENV") or "")).strip().lower() != "production" else None
        return err_response("PROVIDER_ERROR", 502, detail)

    stream_requested = str(request.query_params.get("stream", "")).strip() in {"1", "true", "yes"}
    if stream_requested:
        async def event_stream() -> object:
            # First event confirms stream readiness.
            started_at = perf_counter()
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
            print(
                f"[AI_TIMING] rid={trace_id or 'none'} stage=stream_wrapper_end ms={int((perf_counter() - started_at) * 1000)}",
                flush=True,
            )
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
    request_received_at = perf_counter()
    body = await request.json()
    print(
        f"[AI_TIMING] rid={getattr(request.state, 'request_id', None) or 'none'} stage=backend_request_received ms={int((perf_counter() - request_received_at) * 1000)} endpoint=/api/ai/student",
        flush=True,
    )
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
    auth_started = perf_counter()
    try:
        user = resolve_user_from_header(authorization)
    except HTTPException:
        return err_response("AUTH_INVALID", 401)
    if not user:
        return err_response("AUTH_REQUIRED", 401)
    print(
        f"[AI_TIMING] rid={getattr(request.state, 'request_id', None) or 'none'} stage=auth_check ms={int((perf_counter() - auth_started) * 1000)} endpoint=/api/ai/student",
        flush=True,
    )
    rate_limit(user.uid, limit=15, window_sec=60)
    payload = AIChatRequest(**(body or {}))
    trace_id = getattr(request.state, "request_id", None)
    current_session_id = payload.session_id or new_session_id()
    intent = detect_intent(message)
    stream_requested = str(request.query_params.get("stream", "")).strip() in {"1", "true", "yes"}

    if (
        stream_requested
        and _is_institution_request(body or {})
        and intent in INSTITUTION_FAST_STREAM_INTENTS
    ):
        async def institution_event_stream() -> object:
            stream_started = perf_counter()
            first_chunk_at = None
            yield _sse_event("start", {"ok": True})
            accumulated_text = ""
            prompt_started = perf_counter()
            with get_db() as db:
                if not get_session(db, current_session_id):
                    create_session(
                        db,
                        current_session_id,
                        user.uid or "public",
                        resolve_app_type(payload.app_type),
                        getattr(user, "institution_id", None),
                        title="New Chat",
                    )
                save_message(db, current_session_id, "user", message, intent=intent, tool_used=None)
                context = {
                    "uid": user.uid,
                    "role": user.role,
                    "institutionId": (body or {}).get("institutionId") or user.institution_id,
                    "departmentId": (body or {}).get("departmentId") or user.department_id or "general",
                    "departmentName": (body or {}).get("departmentName") or "General",
                    "hostMode": "institution",
                }
                analysis = analyze_compound_question(message)
                history_limit = 2 if (analysis.is_compound or analysis.brief or analysis.needs_live_limitations) else 0
                history_started = perf_counter()
                history = get_recent_history(db, current_session_id, limit=history_limit) if history_limit else []
                print(
                    f"[AI_TIMING] rid={trace_id or 'none'} stage=history_fetch ms={int((perf_counter() - history_started) * 1000)} "
                    f"count={len(history)} limit={history_limit} endpoint=/api/ai/student",
                    flush=True,
                )
                compound_context = build_compound_request_context(message) if history_limit else ""
                prompt_parts = []
                if compound_context:
                    prompt_parts.append(compound_context)
                if history:
                    history_text = "\n".join(f"{item['role']}: {item['content']}" for item in history)
                    prompt_parts.append(f"HISTORY:\n{history_text}")
                prompt_parts.append(f"USER_MESSAGE:\n{message}")
                prompt = "\n\n".join(prompt_parts)
                print(
                    f"[AI_TIMING] rid={trace_id or 'none'} stage=prompt_build ms={int((perf_counter() - prompt_started) * 1000)} "
                    f"chars={len(prompt)} endpoint=/api/ai/student",
                    flush=True,
                )
                model_started = perf_counter()
                try:
                    async for delta in stream_gemini_text(
                        prompt,
                        context,
                        mode=(body or {}).get("mode"),
                        workspace_context=_workspace_context_from_body(body or {}, user),
                        assistant_style=assistant_style,
                        max_output_tokens=520,
                        temperature=0.35,
                    ):
                        if first_chunk_at is None:
                            first_chunk_at = perf_counter()
                            print(
                                f"[AI_TIMING] rid={trace_id or 'none'} stage=first_chunk ms={int((first_chunk_at - stream_started) * 1000)} "
                                f"endpoint=/api/ai/student fast=true",
                                flush=True,
                            )
                        accumulated_text += delta
                        yield _sse_event("chunk", {"delta": delta})
                except Exception as exc:  # noqa: BLE001
                    if str(exc) == "MISSING_PROVIDER_KEY":
                        yield _sse_event("error", {"message": "AI provider key is missing."})
                        return
                    if is_provider_quota_error(str(exc)):
                        fallback_text = provider_busy_response()
                        accumulated_text = fallback_text
                        if first_chunk_at is None:
                            first_chunk_at = perf_counter()
                            print(
                                f"[AI_TIMING] rid={trace_id or 'none'} stage=first_chunk ms={int((first_chunk_at - stream_started) * 1000)} "
                                f"endpoint=/api/ai/student fast=true provider=quota_fallback",
                                flush=True,
                            )
                        yield _sse_event("chunk", {"delta": fallback_text})
                        final_text = fallback_text
                        save_message(
                            db,
                            current_session_id,
                            "assistant",
                            final_text,
                            intent=f"{intent}:PROVIDER_RATE_LIMIT",
                            tool_used=None,
                        )
                        print(
                            f"[AI_TIMING] rid={trace_id or 'none'} stage=stream_end ms={int((perf_counter() - model_started) * 1000)} "
                            f"endpoint=/api/ai/student fast=true chars={len(final_text)} provider=quota_fallback",
                            flush=True,
                        )
                        yield _sse_event("done", {"text": final_text, "intent": f"{intent}:PROVIDER_RATE_LIMIT"})
                        return
                    yield _sse_event("error", {"message": str(exc)})
                    return
                final_text = accumulated_text.strip() or "I couldn't generate a response."
                save_message(
                    db,
                    current_session_id,
                    "assistant",
                    final_text,
                    intent=intent,
                    tool_used=None,
                )
                print(
                    f"[AI_TIMING] rid={trace_id or 'none'} stage=stream_end ms={int((perf_counter() - model_started) * 1000)} "
                    f"endpoint=/api/ai/student fast=true chars={len(final_text)}",
                    flush=True,
                )
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
