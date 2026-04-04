from __future__ import annotations

import os
from typing import Iterable


DEFAULT_CHAT_MODEL = "gemini-2.5-flash"
DEFAULT_IMAGE_MODEL = "gemini-3-pro-image-preview"
DEFAULT_IMAGE_FALLBACKS = ("gemini-2.5-flash-image",)
DEFAULT_VISION_MODEL = "gemini-2.5-flash"
DEFAULT_LIVE_MODEL = DEFAULT_CHAT_MODEL
DEFAULT_TTS_MODEL = "gemini-2.5-flash-preview-tts"
DEFAULT_TRANSCRIBE_MODEL = "gemini-2.5-flash"
DEFAULT_OPENAI_IMAGE_MODEL = "gpt-image-1.5"
DEFAULT_OPENAI_IMAGE_FALLBACKS = ("gpt-image-1", "gpt-image-1-mini")


def _clean(value: str | None) -> str:
    return str(value or "").strip()


def _env(name: str, default: str) -> str:
    value = _clean(os.getenv(name))
    return value or default


def _env_list(name: str) -> list[str]:
    raw = _clean(os.getenv(name))
    if not raw:
        return []
    return [item.strip() for item in raw.split(",") if item.strip()]


def _dedupe(items: Iterable[str]) -> list[str]:
    return list(dict.fromkeys(item for item in items if item))


def get_chat_model() -> str:
    return _env("GEMINI_CHAT_MODEL", DEFAULT_CHAT_MODEL)


def get_image_model_candidates() -> list[str]:
    primary = _env("GEMINI_IMAGE_MODEL", DEFAULT_IMAGE_MODEL)
    fallbacks = _env_list("GEMINI_IMAGE_MODEL_FALLBACKS") or list(DEFAULT_IMAGE_FALLBACKS)
    return _dedupe([primary, *fallbacks])


def get_image_edit_model_candidates() -> list[str]:
    primary = _env("GEMINI_IMAGE_EDIT_MODEL", _env("GEMINI_IMAGE_MODEL", DEFAULT_IMAGE_MODEL))
    fallbacks = _env_list("GEMINI_IMAGE_EDIT_MODEL_FALLBACKS") or list(DEFAULT_IMAGE_FALLBACKS)
    return _dedupe([primary, *fallbacks])


def get_vision_model() -> str:
    return _env("GEMINI_VISION_MODEL", DEFAULT_VISION_MODEL)


def get_live_model() -> str:
    return _env("GEMINI_LIVE_MODEL", get_chat_model())


def get_tts_model() -> str:
    return _env("GEMINI_TTS_MODEL", DEFAULT_TTS_MODEL)


def get_transcribe_model() -> str:
    return _env("GEMINI_TRANSCRIBE_MODEL", DEFAULT_TRANSCRIBE_MODEL)


def get_openai_image_model_candidates() -> list[str]:
    primary = _env("OPENAI_IMAGE_MODEL", DEFAULT_OPENAI_IMAGE_MODEL)
    fallbacks = _env_list("OPENAI_IMAGE_MODEL_FALLBACKS") or list(DEFAULT_OPENAI_IMAGE_FALLBACKS)
    return _dedupe([primary, *fallbacks])


def get_openai_image_edit_model_candidates() -> list[str]:
    primary = _env("OPENAI_IMAGE_EDIT_MODEL", _env("OPENAI_IMAGE_MODEL", DEFAULT_OPENAI_IMAGE_MODEL))
    fallbacks = _env_list("OPENAI_IMAGE_EDIT_MODEL_FALLBACKS") or list(DEFAULT_OPENAI_IMAGE_FALLBACKS)
    return _dedupe([primary, *fallbacks])
