from __future__ import annotations

import os
from typing import Any

from ..utils import post_json_with_timeout


async def call_gemini_text(
    message: str,
    context: dict[str, Any],
    system_instruction: str | None = None,
) -> str:
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not gemini_key:
        raise RuntimeError("MISSING_PROVIDER_KEY")

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.5-flash:generateContent?key={gemini_key}"
    )
    system_text = system_instruction or "You are ElimuLink AI. Be clear and concise."
    payload = {
        "systemInstruction": {"parts": [{"text": system_text}]},
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": f"USER_MESSAGE:\n{message}\n"},
                    {"text": f"GROUNDING_DATA:\n{context}\n"},
                ],
            }
        ],
        "generationConfig": {"temperature": 0.4},
    }
    data = await post_json_with_timeout(url, payload, timeout_seconds=25.0)
    return (
        "".join(
            p.get("text", "")
            for p in (data.get("candidates", [{}])[0].get("content", {}).get("parts", []))
        ).strip()
        or "I couldn't generate a response."
    )
