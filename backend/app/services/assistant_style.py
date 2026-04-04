from __future__ import annotations

from typing import Final

DEFAULT_ASSISTANT_STYLE: Final[str] = "default"
ASSISTANT_STYLE_KEYS: Final[set[str]] = {
    "default",
    "friendly",
    "direct",
    "professional",
    "simple",
}

STYLE_INSTRUCTIONS: Final[dict[str, str]] = {
    "default": "Style preference: Default. Keep a balanced academic tone that is clear, calm, and practical.",
    "friendly": "Style preference: Friendly. Keep the tone warmer, supportive, and conversational without becoming casual or chatty.",
    "direct": "Style preference: Direct. Keep replies shorter, more practical, and focused on the next useful step.",
    "professional": "Style preference: Professional. Keep replies polished, precise, and structured when helpful.",
    "simple": "Style preference: Simple. Use easier wording, shorter sentences, and clearer explanations.",
}


def normalize_assistant_style(value: str | None) -> str:
    candidate = str(value or "").strip().lower()
    if candidate in ASSISTANT_STYLE_KEYS:
        return candidate
    return DEFAULT_ASSISTANT_STYLE


def build_assistant_style_instruction(value: str | None) -> str:
    style = normalize_assistant_style(value)
    return STYLE_INSTRUCTIONS.get(style, STYLE_INSTRUCTIONS[DEFAULT_ASSISTANT_STYLE])
