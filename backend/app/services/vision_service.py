from __future__ import annotations

import json
import os
import re
from typing import Any

from fastapi import HTTPException

from ..utils import ProviderTimeoutError, post_json_with_timeout
from .model_registry import get_vision_model


def _fail(code: str, message: str, status_code: int = 500) -> None:
    raise HTTPException(
        status_code=status_code,
        detail={"ok": False, "error": {"code": code, "message": message}},
    )


def _parse_data_url(data_url: str) -> tuple[str, str]:
    match = re.match(r"^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$", data_url, re.DOTALL)
    if not match:
        _fail("INVALID_IMAGE", "Expected image data URL.", 400)
    return match.group(1), match.group(2)


def _extract_text(data: dict[str, Any]) -> str:
    candidates = data.get("candidates", [])
    if not candidates:
        return ""

    parts = candidates[0].get("content", {}).get("parts", [])
    text_parts = [str(part.get("text", "")).strip() for part in parts if part.get("text")]
    return "\n".join(part for part in text_parts if part).strip()


def _extract_json_block(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    if not cleaned:
        return {"answer": "", "highlights": []}

    try:
        return json.loads(cleaned)
    except Exception:
        pass

    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        return {"answer": cleaned, "highlights": []}

    try:
        return json.loads(match.group(0))
    except Exception:
        return {"answer": cleaned, "highlights": []}


async def analyze_visual_context(
    *,
    image_data_url: str | None = None,
    image_data_urls: list[str] | None = None,
    prompt: str,
    family: str | None = None,
    app: str | None = None,
) -> dict[str, Any]:
    gemini_api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not gemini_api_key:
        _fail("MISSING_GEMINI_KEY", "GEMINI_API_KEY is not configured.")

    image_sources = [value for value in ([image_data_url] if image_data_url else []) + list(image_data_urls or []) if value]
    if not image_sources:
        _fail("INVALID_IMAGE", "Expected image data URL.", 400)

    parsed_images = [_parse_data_url(source) for source in image_sources]
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{get_vision_model()}:generateContent?key={gemini_api_key}"
    )
    system = (
        "You analyze screenshots and camera photos for ElimuLink Live. "
        "Return strict JSON only with this shape: "
        '{"answer":"...","highlights":[{"type":"box","x":100,"y":100,"width":200,"height":80,"label":"Tap here","color":"#20b8ff"}]}. '
        "Use integer coordinates. "
        "Highlight what the user should tap, inspect, or focus on."
    )
    user_text = f"Family: {family}. App: {app}. Request: {prompt}"

    payload = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": user_text},
                    *[
                        {"inlineData": {"mimeType": mime_type, "data": image_b64}}
                        for mime_type, image_b64 in parsed_images
                    ],
                ],
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 900,
            "responseMimeType": "application/json",
        },
    }

    try:
        data = await post_json_with_timeout(url, payload, timeout_seconds=60.0)
    except ProviderTimeoutError:
        _fail("VISION_TIMEOUT", "The vision provider timed out.", 504)
    except RuntimeError as exc:
        _fail("VISION_PROVIDER_FAILED", str(exc), 502)

    text = _extract_text(data)
    parsed = _extract_json_block(text)
    highlights = parsed.get("highlights", [])
    if not isinstance(highlights, list):
        highlights = []

    return {
        "answer": str(parsed.get("answer", "")),
        "highlights": highlights,
        "provider": "gemini",
        "model": get_vision_model(),
    }
