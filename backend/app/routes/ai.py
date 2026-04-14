from __future__ import annotations

import asyncio
import json
import os
import re
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
from ..services.prompt_builder import build_context_prompt
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

_ULTRA_SHORT_GREETING_REPLIES = {
    "hello": "Hello! How can I help?",
    "hi": "Hi! How can I help?",
    "hey": "Hey! How can I help?",
    "morning": "Good morning! How can I help?",
    "good morning": "Good morning! How can I help?",
    "afternoon": "Good afternoon! How can I help?",
    "good afternoon": "Good afternoon! How can I help?",
    "evening": "Good evening! How can I help?",
    "good evening": "Good evening! How can I help?",
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


def _normalize_fast_prompt_text(message: str) -> str:
    return " ".join(re.findall(r"[a-z']+", str(message or "").strip().lower()))


def _get_ultra_short_greeting_reply(message: str) -> Optional[str]:
    normalized = _normalize_fast_prompt_text(message)
    if not normalized:
        return None
    if len(normalized) > 20:
        return None
    if normalized not in _ULTRA_SHORT_GREETING_REPLIES:
        return None
    return _ULTRA_SHORT_GREETING_REPLIES[normalized]


def _is_light_simple_prompt(message: str) -> bool:
    normalized = re.sub(r"\s+", " ", str(message or "").strip().lower())
    if not normalized or "\n" in normalized:
        return False
    if len(normalized) > 220:
        return False
    if re.search(r"[/:]", normalized):
        return False
    if re.search(
        r"\b(?:http|www\.|attach|upload|image|photo|diagram|chart|pdf|file|citation|source|sources|research paper|references?)\b",
        normalized,
    ):
        return False
    word_count = len(re.findall(r"[a-z0-9']+", normalized))
    if word_count == 0 or word_count > 32:
        return False
    if re.search(r"\b(?:then|also|compare|contrast|versus|vs|difference between|and then)\b", normalized):
        return False
    if re.search(
        r"\b(?:analyze critically|with citations|latest research|journal|scholar|dataset|table|markdown|code block|bibliography|peer reviewed|literature review|case study|methodology|research questions?)\b",
        normalized,
    ):
        return False
    if normalized.count(";") > 0:
        return False
    if normalized.count("?") > 1:
        return False
    return True


def _stream_history_limit(message: str, session_exists: bool) -> int:
    if not session_exists:
        return 0 if _is_light_simple_prompt(message) else 3
    return 2 if _is_light_simple_prompt(message) else 4


def _sse_event(event_name: str, payload: dict) -> str:
    return f"event: {event_name}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _request_metadata_from_payload(payload: AIChatRequest, original_message: str = "") -> dict:
    return {
        "originalMessage": str(original_message or "").strip(),
        "normalizedMessage": str(payload.normalizedMessage or "").strip(),
        "topic": str(payload.topic or "").strip(),
        "followUp": bool(payload.followUp),
        "followUpType": str(payload.followUpType or "").strip(),
        "targetLanguage": str(payload.targetLanguage or "").strip(),
        "previousAssistantMessage": str(payload.previousAssistantMessage or "").strip(),
    }


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
    request_metadata = _request_metadata_from_payload(payload, original_message=str((body or {}).get("message") or ""))
    trace_id = getattr(request.state, "request_id", None)
    request_received_at = perf_counter()
    print(
        f"[AI_TIMING] rid={trace_id or 'none'} stage=backend_request_received ms={int((perf_counter() - request_received_at) * 1000)} endpoint=/api/ai/chat",
        flush=True,
    )
    stream_requested = (
        str(request.query_params.get("stream", "")).strip().lower() in {"1", "true", "yes"}
        or bool(payload.stream)
    )
    current_session_id = payload.session_id or new_session_id()
    intent = detect_intent(message)
    simple_fast_prompt = _is_light_simple_prompt(message)
    resolved_app_type = resolve_app_type(
        payload.app_type or ("institution" if _is_institution_request(body or {}) else None)
    )

    if stream_requested and (intent == "general_chat" or simple_fast_prompt):
        async def event_stream() -> object:
            started_at = perf_counter()
            first_chunk_at = None
            prompt_ready_at = None
            yield _sse_event("start", {"ok": True})

            with get_db() as db:
                ultra_short_greeting_reply = _get_ultra_short_greeting_reply(message) if simple_fast_prompt else None
                session_exists: bool | None = None
                if not (ultra_short_greeting_reply or simple_fast_prompt):
                    session_exists = bool(get_session(db, current_session_id))
                history_limit = 0 if (ultra_short_greeting_reply or simple_fast_prompt) else _stream_history_limit(message, bool(session_exists))
                history_started = perf_counter()
                history = get_recent_history(db, current_session_id, limit=history_limit) if history_limit else []
                print(
                    f"[AI_TIMING] rid={trace_id or 'none'} stage=history_fetch ms={int((perf_counter() - history_started) * 1000)} "
                    f"endpoint=/api/ai/chat count={len(history)} limit={history_limit}",
                    flush=True,
                )

                user_saved = False

                def ensure_session_and_user_saved() -> None:
                    nonlocal user_saved
                    nonlocal session_exists
                    if user_saved:
                        return
                    if session_exists is None:
                        session_exists = bool(get_session(db, current_session_id))
                    if not session_exists:
                        create_session(
                            db,
                            current_session_id,
                            getattr(user, "uid", None) or "public",
                            resolved_app_type,
                            getattr(user, "institution_id", None),
                            title="New Chat",
                        )
                        session_exists = True
                    save_message(db, current_session_id, "user", message, intent=intent, tool_used=None)
                    user_saved = True

                if ultra_short_greeting_reply:
                    first_chunk_at = perf_counter()
                    print(
                        f"[AI_TIMING] rid={trace_id or 'none'} stage=first_chunk ms={int((first_chunk_at - started_at) * 1000)} "
                        f"endpoint=/api/ai/chat stream=true fast_greeting=true",
                        flush=True,
                    )
                    yield _sse_event("chunk", {"delta": ultra_short_greeting_reply})
                    ensure_session_and_user_saved()
                    save_message(
                        db,
                        current_session_id,
                        "assistant",
                        ultra_short_greeting_reply,
                        intent=f"{intent}:FAST_GREETING",
                        tool_used=None,
                    )
                    yield _sse_event(
                        "done",
                        {
                            "text": ultra_short_greeting_reply,
                            "session_id": current_session_id,
                            "intent": f"{intent}:FAST_GREETING",
                            "tool_used": None,
                        },
                    )
                    return

                prompt_started = perf_counter()
                prompt = (
                    f"USER_MESSAGE:\n{message}"
                    if simple_fast_prompt
                    else build_context_prompt(message, intent, None, history, request_metadata=request_metadata)
                )
                prompt_ready_at = perf_counter()
                print(
                    f"[AI_TIMING] rid={trace_id or 'none'} stage=pre_stream_ready ms={int((prompt_ready_at - started_at) * 1000)} "
                    f"endpoint=/api/ai/chat simple={str(simple_fast_prompt).lower()} history={len(history)} chars={len(prompt)}",
                    flush=True,
                )

                context = {
                    "app_type": resolved_app_type,
                    "role": resolve_role(user),
                    "tool_data": {},
                    "history": history,
                    "assistantStyle": assistant_style,
                }

                accumulated_text = ""
                try:
                    async for delta in stream_gemini_text(
                        prompt,
                        context,
                        mode=mode,
                        workspace_context=workspace_context if isinstance(workspace_context, dict) else {},
                        assistant_style=normalize_assistant_style(payload.assistantStyle or assistant_style),
                    ):
                        if first_chunk_at is None:
                            first_chunk_at = perf_counter()
                            print(
                                f"[AI_TIMING] rid={trace_id or 'none'} stage=first_chunk ms={int((first_chunk_at - started_at) * 1000)} "
                                f"endpoint=/api/ai/chat stream=true",
                                flush=True,
                            )
                            ensure_session_and_user_saved()
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
                        yield _sse_event("chunk", {"delta": fallback_text})
                        ensure_session_and_user_saved()
                        save_message(
                            db,
                            current_session_id,
                            "assistant",
                            fallback_text,
                            intent=f"{intent}:PROVIDER_RATE_LIMIT",
                            tool_used=None,
                        )
                        yield _sse_event(
                            "done",
                            {
                                "text": fallback_text,
                                "session_id": current_session_id,
                                "intent": f"{intent}:PROVIDER_RATE_LIMIT",
                                "tool_used": None,
                            },
                        )
                        return
                    yield _sse_event("error", {"message": str(exc)})
                    return

                final_text = accumulated_text.strip() or "I couldn't generate a response."
                ensure_session_and_user_saved()
                save_message(
                    db,
                    current_session_id,
                    "assistant",
                    final_text,
                    intent=intent,
                    tool_used=None,
                )
                print(
                    f"[AI_TIMING] rid={trace_id or 'none'} stage=stream_end ms={int((perf_counter() - started_at) * 1000)} "
                    f"endpoint=/api/ai/chat stream=true chars={len(final_text)}",
                    flush=True,
                )
                yield _sse_event(
                    "done",
                    {
                        "text": final_text,
                        "session_id": current_session_id,
                        "intent": intent,
                        "tool_used": None,
                    },
                )

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
        with get_db() as db:
            answer, session_id, intent, tool_used = await run_orchestrator(
                db,
                user,
                message,
                payload.session_id,
                payload.app_type,
                mode=mode,
                workspace_context=workspace_context if isinstance(workspace_context, dict) else {},
                assistant_style=normalize_assistant_style(payload.assistantStyle or assistant_style),
                request_metadata=request_metadata,
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

            payload_done = json.dumps(
                {"text": text, "session_id": session_id, "intent": intent, "tool_used": tool_used},
                ensure_ascii=False,
            )
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
    request_metadata = _request_metadata_from_payload(payload, original_message=str((body or {}).get("message") or ""))
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
            user_message_saved = False

            def ensure_session_and_user_saved(db) -> None:
                nonlocal user_message_saved
                if user_message_saved:
                    return
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
                user_message_saved = True

            yield _sse_event("start", {"ok": True})
            accumulated_text = ""
            prompt_started = perf_counter()
            with get_db() as db:
                context = {
                    "uid": user.uid,
                    "role": user.role,
                    "institutionId": (body or {}).get("institutionId") or user.institution_id,
                    "departmentId": (body or {}).get("departmentId") or user.department_id or "general",
                    "departmentName": (body or {}).get("departmentName") or "General",
                    "hostMode": "institution",
                }
                simple_fast_prompt = intent == "general_chat" and _is_light_simple_prompt(message)
                ultra_short_greeting_reply = None
                if simple_fast_prompt:
                    ultra_short_greeting_reply = _get_ultra_short_greeting_reply(message)
                    if ultra_short_greeting_reply:
                        simple_fast_prompt = True
                if simple_fast_prompt:
                    analysis = None
                    history_limit = 0
                else:
                    analysis = analyze_compound_question(message)
                    history_limit = 2 if (analysis.is_compound or analysis.brief or analysis.needs_live_limitations) else 0
                history_started = perf_counter()
                history = get_recent_history(db, current_session_id, limit=history_limit) if history_limit else []
                print(
                    f"[AI_TIMING] rid={trace_id or 'none'} stage=history_fetch ms={int((perf_counter() - history_started) * 1000)} "
                    f"count={len(history)} limit={history_limit} endpoint=/api/ai/student",
                    flush=True,
                )
                if ultra_short_greeting_reply:
                    yield _sse_event("chunk", {"delta": ultra_short_greeting_reply})
                    ensure_session_and_user_saved(db)
                    save_message(
                        db,
                        current_session_id,
                        "assistant",
                        ultra_short_greeting_reply,
                        intent=f"{intent}:FAST_GREETING",
                        tool_used=None,
                    )
                    print(
                        f"[AI_TIMING] rid={trace_id or 'none'} stage=fast_greeting_reply ms={int((perf_counter() - stream_started) * 1000)} "
                        f"endpoint=/api/ai/student fast=true chars={len(ultra_short_greeting_reply)}",
                        flush=True,
                    )
                    yield _sse_event("done", {"text": ultra_short_greeting_reply, "intent": f"{intent}:FAST_GREETING"})
                    return
                prompt = build_context_prompt(
                    message,
                    intent,
                    None,
                    history,
                    request_metadata=request_metadata,
                )
                print(
                    f"[AI_TIMING] rid={trace_id or 'none'} stage=prompt_build ms={int((perf_counter() - prompt_started) * 1000)} "
                    f"chars={len(prompt)} endpoint=/api/ai/student",
                    flush=True,
                )
                model_started = perf_counter()
                max_output_tokens = 180 if simple_fast_prompt else 520
                temperature = 0.2 if simple_fast_prompt else 0.35
                try:
                    async for delta in stream_gemini_text(
                        prompt,
                        context,
                        mode=(body or {}).get("mode"),
                        workspace_context=_workspace_context_from_body(body or {}, user),
                        assistant_style=assistant_style,
                        max_output_tokens=max_output_tokens,
                        temperature=temperature,
                    ):
                        if first_chunk_at is None:
                            first_chunk_at = perf_counter()
                            print(
                                f"[AI_TIMING] rid={trace_id or 'none'} stage=first_chunk ms={int((first_chunk_at - stream_started) * 1000)} "
                                f"endpoint=/api/ai/student fast=true",
                                flush=True,
                            )
                            ensure_session_and_user_saved(db)
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
                        ensure_session_and_user_saved(db)
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
                    if not user_message_saved:
                        ensure_session_and_user_saved(db)
                    yield _sse_event("error", {"message": str(exc)})
                    return
                final_text = accumulated_text.strip() or "I couldn't generate a response."
                ensure_session_and_user_saved(db)
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
            message,
            payload.session_id,
            payload.app_type or "student",
            request_metadata=request_metadata,
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
