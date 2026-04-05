from __future__ import annotations

import json
import os
import re
from typing import Any

import httpx
from fastapi import HTTPException

from ..utils import ProviderTimeoutError, is_provider_quota_error, post_json_with_timeout, provider_busy_response
from .model_registry import get_live_model, get_openai_live_model_candidates


_HTTP_STATUS_PATTERN = re.compile(r"provider_http_(\d{3})", re.IGNORECASE)

def _fail(code: str, message: str, status_code: int = 500) -> None:
    raise HTTPException(
        status_code=status_code,
        detail={"ok": False, "error": {"code": code, "message": message}},
    )


def _build_system_prompt(family: str, app: str, context: dict[str, Any] | None) -> str:
    context_mode = str((context or {}).get("mode") or "").strip()
    base = (
        "You are ElimuLink Live, a spoken AI assistant. "
        "Reply naturally for voice conversation. "
        "Keep answers clear, helpful, and concise. "
        "If visual context is available, use it. "
        "If the user asks what to tap or focus on, answer step by step."
    )
    if context_mode == "live-scene-suggestions":
        base += (
            " For live-scene-suggestions mode, return 4 short, useful, non-repetitive "
            "camera-aware suggestion chips, one per line only, with no numbering."
        )
    family_hint = f" Family: {family}. App: {app}."
    context_hint = ""
    if context:
        keys = ", ".join(sorted(str(key) for key in context.keys()))
        context_hint = f" Available context keys: {keys}."
    return base + family_hint + context_hint


def _extract_text(data: dict[str, Any]) -> str:
    candidates = data.get("candidates", [])
    if not candidates:
        return ""

    parts = candidates[0].get("content", {}).get("parts", [])
    text_parts = [str(part.get("text", "")).strip() for part in parts if part.get("text")]
    return "\n".join(part for part in text_parts if part).strip()


def _extract_openai_text(data: dict[str, Any]) -> str:
    choices = data.get("choices", [])
    if not choices:
        return ""
    message = choices[0].get("message", {}) if isinstance(choices[0], dict) else {}
    content = message.get("content", "")
    if isinstance(content, list):
        return "\n".join(
            str(item.get("text", "")).strip()
            for item in content
            if isinstance(item, dict) and item.get("text")
        ).strip()
    return str(content or "").strip()


def _parse_status_from_message(message: str) -> int | None:
    match = _HTTP_STATUS_PATTERN.search(message)
    if not match:
        return None
    try:
        return int(match.group(1))
    except Exception:
        return None


def _is_retryable_provider_error(message: str) -> bool:
    text = str(message or "").strip().lower()
    if not text:
        return False

    if is_provider_quota_error(text):
        return True

    retryable_markers = (
        "quota exceeded",
        "rate limit",
        "resource_exhausted",
        "limit: 0",
        "limit: 20",
        "please retry in",
        "too many requests",
        "provider_request_error",
        "timeout",
        "temporarily unavailable",
        "service unavailable",
        "internal server error",
        "model is not found",
        "not found",
        "not supported",
        "model unavailable",
        "no such model",
        "connection error",
        "server error",
        "unavailable",
    )
    non_retryable_markers = (
        "safety",
        "policy",
        "blocked",
        "prohibited",
        "invalid prompt",
        "malformed",
        "bad request",
        "cancelled",
        "user cancelled",
    )

    if any(marker in text for marker in retryable_markers):
        return True
    if any(marker in text for marker in non_retryable_markers):
        return False

    status = _parse_status_from_message(text)
    if status is not None and (status == 429 or 500 <= status < 600):
        return True
    return False


async def _openai_post_json(
    *,
    url: str,
    api_key: str,
    payload: dict[str, Any],
    timeout_seconds: float,
) -> dict[str, Any]:
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            response = await client.post(url, json=payload, headers=headers)
    except httpx.TimeoutException as exc:
        raise RuntimeError("PROVIDER_TIMEOUT") from exc
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


async def _generate_openai_live_reply(
    *,
    openai_key: str,
    family: str,
    app: str,
    text: str,
    context: dict[str, Any] | None,
    timeout_seconds: float,
) -> dict[str, Any]:
    system_prompt = _build_system_prompt(family, app, context)
    messages: list[dict[str, Any]] = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"USER_MESSAGE:\n{text.strip()}"},
    ]
    if context:
        messages.append(
            {
                "role": "user",
                "content": "LIVE_CONTEXT:\n" + json.dumps(context, ensure_ascii=True, default=str, indent=2),
            }
        )

    last_error = ""
    for model in get_openai_live_model_candidates():
        try:
            raw = await _openai_post_json(
                url="https://api.openai.com/v1/chat/completions",
                api_key=openai_key,
                payload={
                    "model": model,
                    "messages": messages,
                    "temperature": 0.5,
                    "max_tokens": 700,
                },
                timeout_seconds=timeout_seconds,
            )
            output_text = _extract_openai_text(raw)
            if not output_text:
                raise RuntimeError("No text returned by OpenAI.")
            return {
                "text": output_text,
                "provider": "openai",
                "model": model,
            }
        except Exception as exc:
            last_error = f"{model}: {str(exc).strip() or exc.__class__.__name__}"
            print(f"[LIVE_PROVIDER_ERROR] {last_error}", flush=True)
            if not _is_retryable_provider_error(last_error):
                raise HTTPException(
                    status_code=400,
                    detail={"ok": False, "error": {"code": "LIVE_CHAT_PROVIDER_FAILED", "message": "That live chat request can't be completed."}},
                )
    raise RuntimeError(last_error or "OpenAI live chat failed.")


async def generate_live_chat_reply(
    *,
    family: str,
    app: str,
    text: str,
    context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    gemini_api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not gemini_api_key:
        _fail("MISSING_GEMINI_KEY", "GEMINI_API_KEY is not configured.")

    system_prompt = _build_system_prompt(family, app, context)
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{get_live_model()}:generateContent?key={gemini_api_key}"
    )

    user_parts = [{"text": f"USER_MESSAGE:\n{text.strip()}"}]
    if context:
        user_parts.append(
            {
                "text": "LIVE_CONTEXT:\n"
                + json.dumps(context, ensure_ascii=True, default=str, indent=2),
            }
        )

    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": user_parts}],
        "generationConfig": {
            "temperature": 0.5,
            "topP": 0.9,
            "maxOutputTokens": 700,
        },
    }

    try:
        data = await post_json_with_timeout(url, payload, timeout_seconds=45.0)
    except ProviderTimeoutError:
        if not os.getenv("OPENAI_API_KEY", "").strip():
            _fail("LIVE_CHAT_TIMEOUT", "The live chat provider timed out.", 504)
        data = {}
    except RuntimeError as exc:
        if is_provider_quota_error(str(exc)):
            data = {}
        elif not _is_retryable_provider_error(str(exc)):
            _fail("LIVE_CHAT_PROVIDER_FAILED", str(exc), 502)
        else:
            data = {}

    if not data:
        openai_key = os.getenv("OPENAI_API_KEY", "").strip()
        if not openai_key:
            return {
                "text": provider_busy_response(),
                "provider": "gemini",
                "model": get_live_model(),
                "error_code": "LIVE_CHAT_RATE_LIMIT",
            }
        try:
            return await _generate_openai_live_reply(
                openai_key=openai_key,
                family=family,
                app=app,
                text=text,
                context=context,
                timeout_seconds=45.0,
            )
        except HTTPException:
            raise
        except Exception:
            return {
                "text": provider_busy_response(),
                "provider": "openai",
                "model": get_openai_live_model_candidates()[0] if get_openai_live_model_candidates() else "openai",
                "error_code": "LIVE_CHAT_PROVIDER_FAILED",
            }

    output_text = _extract_text(data)
    if not output_text:
        openai_key = os.getenv("OPENAI_API_KEY", "").strip()
        if openai_key:
            try:
                return await _generate_openai_live_reply(
                    openai_key=openai_key,
                    family=family,
                    app=app,
                    text=text,
                    context=context,
                    timeout_seconds=45.0,
                )
            except HTTPException:
                raise
            except Exception:
                return {
                    "text": provider_busy_response(),
                    "provider": "openai",
                    "model": get_openai_live_model_candidates()[0] if get_openai_live_model_candidates() else "openai",
                    "error_code": "EMPTY_LIVE_CHAT_REPLY",
                }
        _fail("EMPTY_LIVE_CHAT_REPLY", "The AI provider returned no text.")

    return {
        "text": output_text,
        "provider": "gemini",
        "model": get_live_model(),
    }
