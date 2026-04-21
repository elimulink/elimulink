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
from ..services.chemistry_service import is_chemistry_prompt
from ..services.intent_router import detect_intent
from ..services.math_service import is_math_prompt
from ..services.physics_service import is_physics_prompt
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
    "hello": "Hello. What can I help with?",
    "hi": "Hi. What can I help with?",
    "hey": "Hey. What can I help with?",
    "morning": "Good morning. What can I help with?",
    "good morning": "Good morning. What can I help with?",
    "afternoon": "Good afternoon. What can I help with?",
    "good afternoon": "Good afternoon. What can I help with?",
    "evening": "Good evening. What can I help with?",
    "good evening": "Good evening. What can I help with?",
}

_FAST_STREAM_ADMIN_LIKE_ROLES = {"admin", "institution_admin", "department_head", "staff", "lecturer", "super_admin"}
_FAST_STREAM_PERSONAL_SCOPE_PATTERN = re.compile(r"\b(?:my|me|mine|for me|my own)\b", re.IGNORECASE)
_FAST_STREAM_STUDENT_ACTIVITY_PATTERN = re.compile(
    r"\b(?:what are students doing|how are students doing|student update|student activity|students activity|recent student activity)\b",
    re.IGNORECASE,
)
_FAST_STREAM_INSTITUTION_DATA_PATTERN = re.compile(
    r"\b(?:fees?|attendance|results?|gpa|analytics)\b|\b(?:attendance|results?|fees?)\s+(?:trend|status|summary)\b|\b(?:student|students)\s+(?:update|activity|status|summary)\b",
    re.IGNORECASE,
)


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


def _is_institution_data_sensitive_fast_stream(
    message: str,
    intent: str,
    resolved_app_type: str,
    user: CurrentUser,
    workspace_context: dict | None = None,
) -> bool:
    if resolved_app_type != "institution":
        return False
    if str(getattr(user, "role", "") or "").strip().lower() not in _FAST_STREAM_ADMIN_LIKE_ROLES:
        return False
    normalized_message = str(message or "").strip()
    if _FAST_STREAM_PERSONAL_SCOPE_PATTERN.search(normalized_message):
        return False
    normalized_intent = str(intent or "").strip().lower()
    if normalized_intent in {"fee_balance", "attendance", "results", "institution_analytics"}:
        return True
    if _FAST_STREAM_STUDENT_ACTIVITY_PATTERN.search(normalized_message):
        return True
    return bool(_FAST_STREAM_INSTITUTION_DATA_PATTERN.search(normalized_message))


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
    if is_chemistry_prompt(normalized):
        return False
    if is_physics_prompt(normalized):
        return False
    if is_math_prompt(normalized):
        return False
    if len(normalized) > 260:
        return False
    if re.search(r"[/:]", normalized):
        return False
    if re.search(
        r"\b(?:http|www\.|attach|upload|image|photo|diagram|chart|pdf|file|citation|source|sources|research paper|references?)\b",
        normalized,
    ):
        return False
    word_count = len(re.findall(r"[a-z0-9']+", normalized))
    if word_count == 0 or word_count > 36:
        return False
    if re.search(r"\b(?:then|also|compare|contrast|versus|vs|difference between|and then)\b", normalized):
        return False
    if re.search(
        r"\b(?:analyze critically|with citations|latest research|journal|scholar|dataset|table|markdown|code block|bibliography|peer reviewed|literature review|case study|methodology|research questions?|tool|workflow|generate a report)\b",
        normalized,
    ):
        return False
    if normalized.count(";") > 0:
        return False
    if normalized.count("?") > 1:
        return False
    return True


def _stream_history_limit(message: str, session_exists: bool, request_metadata: dict | None = None) -> int:
    meta = request_metadata or {}
    if bool(meta.get("newTopic")):
        return 0
    if bool(meta.get("followUp")):
        return 3 if session_exists else 2
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
        "pendingAssistantIntent": str(payload.pendingAssistantIntent or "").strip(),
        "pendingAssistantMode": str(payload.pendingAssistantMode or "").strip(),
        "newTopic": bool(payload.newTopic),
        "routeHint": str(payload.routeHint or "").strip(),
    }


def _resolve_ai_route_user(authorization: Optional[str], resolved_app_type: str) -> CurrentUser | None | tuple[str, int]:
    try:
        user = resolve_user_from_header(authorization)
    except HTTPException as exc:
        detail = getattr(exc, "detail", {}) or {}
        status = getattr(exc, "status_code", 401)
        return (str(detail.get("code") or "AUTH_INVALID"), status)

    if resolved_app_type == "student":
        if not authorization:
            return ("AUTH_REQUIRED", 401)
        if not user:
            return ("AUTH_REQUIRED", 401)
        return user

    return user or CurrentUser(uid="public", role="public")


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

    payload = AIChatRequest(**(body or {}))
    resolved_app_type = resolve_app_type(
        payload.app_type or ("institution" if _is_institution_request(body or {}) else None)
    )
    resolved_user = _resolve_ai_route_user(authorization, resolved_app_type)
    if isinstance(resolved_user, tuple):
        code, status = resolved_user
        return err_response(code, status)
    user = resolved_user
    rate_limit(user.uid, limit=15, window_sec=60)
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
    intent = detect_intent(message, request_metadata=request_metadata)
    simple_fast_prompt = _is_light_simple_prompt(message)
    skip_fast_stream_for_institution_data = _is_institution_data_sensitive_fast_stream(
        message,
        intent,
        resolved_app_type,
        user,
        workspace_context if isinstance(workspace_context, dict) else {},
    )

    if stream_requested and not skip_fast_stream_for_institution_data and (intent == "general_chat" or simple_fast_prompt):
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
                history_limit = 0 if (ultra_short_greeting_reply or simple_fast_prompt) else _stream_history_limit(
                    message,
                    bool(session_exists),
                    request_metadata=request_metadata,
                )
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

                final_text = accumulated_text.strip() or "I couldn't finish that reply. Please try again."
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
            answer, session_id, intent, tool_used, sources = await run_orchestrator(
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
                {"text": text, "session_id": session_id, "intent": intent, "tool_used": tool_used, "sources": sources},
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
            "sources": sources,
        },
    )


@router.post("/api/ai/student")
async def ai_student(request: Request, authorization: Optional[str] = Header(default=None)) -> object:
    body = await request.json()
    if isinstance(body, dict) and not body.get("app_type"):
        body["app_type"] = "student"
    return await ai_chat(request, authorization)
