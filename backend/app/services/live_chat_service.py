from __future__ import annotations

import json
import os
from typing import Any

from fastapi import HTTPException

from ..utils import ProviderTimeoutError, post_json_with_timeout

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_CHAT_MODEL = os.getenv("GEMINI_CHAT_MODEL", "gemini-2.5-flash").strip()


def _fail(code: str, message: str, status_code: int = 500) -> None:
    raise HTTPException(
        status_code=status_code,
        detail={"ok": False, "error": {"code": code, "message": message}},
    )


def _build_system_prompt(family: str, app: str, context: dict[str, Any] | None) -> str:
    base = (
        "You are ElimuLink Live, a spoken AI assistant. "
        "Reply naturally for voice conversation. "
        "Keep answers clear, helpful, and concise. "
        "If visual context is available, use it. "
        "If the user asks what to tap or focus on, answer step by step."
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


async def generate_live_chat_reply(
    *,
    family: str,
    app: str,
    text: str,
    context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if not GEMINI_API_KEY:
        _fail("MISSING_GEMINI_KEY", "GEMINI_API_KEY is not configured.")

    system_prompt = _build_system_prompt(family, app, context)
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{GEMINI_CHAT_MODEL}:generateContent?key={GEMINI_API_KEY}"
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
        _fail("LIVE_CHAT_TIMEOUT", "The live chat provider timed out.", 504)
    except RuntimeError as exc:
        _fail("LIVE_CHAT_PROVIDER_FAILED", str(exc), 502)

    output_text = _extract_text(data)
    if not output_text:
        _fail("EMPTY_LIVE_CHAT_REPLY", "The AI provider returned no text.")

    return {
        "text": output_text,
        "provider": "gemini",
        "model": GEMINI_CHAT_MODEL,
    }
