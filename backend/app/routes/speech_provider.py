from __future__ import annotations

import base64
import os

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.services.voice_mapping import resolve_provider_voice, resolve_voice_style
from app.services.model_registry import get_tts_model, get_transcribe_model
from app.utils import ProviderTimeoutError, post_json_with_timeout

router = APIRouter(prefix="/api/v1/speech", tags=["speech-provider"])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()


class SpeakRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)
    voice_id: str = Field(default="nova")
    speed: float = Field(default=1.0, ge=0.75, le=1.25)


def _provider_url(model: str) -> str:
    return (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={GEMINI_API_KEY}"
    )


def _require_key() -> None:
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail={
                "ok": False,
                "error": {
                    "code": "MISSING_GEMINI_KEY",
                    "message": "GEMINI_API_KEY is not configured.",
                },
            },
        )


def _extract_audio_part(payload: dict) -> tuple[bytes, str]:
    parts = payload.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    for part in parts:
        inline_data = part.get("inlineData") or {}
        data = inline_data.get("data")
        if data:
            return base64.b64decode(data), inline_data.get("mimeType", "audio/wav")
    raise HTTPException(
        status_code=502,
        detail={"ok": False, "error": {"code": "TTS_FAILED", "message": "No audio returned."}},
    )


def _extract_text(payload: dict) -> str:
    parts = payload.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    text = "\n".join(str(part.get("text", "")).strip() for part in parts if part.get("text")).strip()
    if not text:
        raise HTTPException(
            status_code=502,
            detail={
                "ok": False,
                "error": {"code": "TRANSCRIBE_FAILED", "message": "No transcription returned."},
            },
        )
    return text


@router.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    _require_key()

    data = await file.read()
    payload = {
        "systemInstruction": {
            "parts": [
                {
                    "text": "Transcribe the provided audio exactly. Return only the spoken text without commentary."
                }
            ]
        },
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": "Transcribe this audio."},
                    {
                        "inlineData": {
                            "mimeType": file.content_type or "audio/webm",
                            "data": base64.b64encode(data).decode("ascii"),
                        }
                    },
                ],
            }
        ],
        "generationConfig": {
            "temperature": 0,
            "maxOutputTokens": 500,
        },
    }

    try:
        raw = await post_json_with_timeout(
            _provider_url(get_transcribe_model()),
            payload,
            timeout_seconds=60.0,
        )
    except ProviderTimeoutError:
        raise HTTPException(
            status_code=504,
            detail={"ok": False, "error": {"code": "TRANSCRIBE_TIMEOUT", "message": "Gemini transcription timed out."}},
        ) from None
    except RuntimeError as exc:
        raise HTTPException(
            status_code=502,
            detail={"ok": False, "error": {"code": "TRANSCRIBE_FAILED", "message": str(exc)}},
        ) from None

    return {"ok": True, "text": _extract_text(raw)}


@router.post("/speak")
async def speak(body: SpeakRequest):
    _require_key()

    provider_voice = resolve_provider_voice(body.voice_id)
    voice_style = resolve_voice_style(body.voice_id)
    payload = {
        "contents": [{"parts": [{"text": body.text[:4000]}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {
                        "voiceName": provider_voice,
                    }
                }
            },
        },
    }

    try:
        raw = await post_json_with_timeout(
            _provider_url(get_tts_model()),
            payload,
            timeout_seconds=60.0,
        )
    except ProviderTimeoutError:
        raise HTTPException(
            status_code=504,
            detail={"ok": False, "error": {"code": "TTS_TIMEOUT", "message": "Gemini speech generation timed out."}},
        ) from None
    except RuntimeError as exc:
        raise HTTPException(
            status_code=502,
            detail={"ok": False, "error": {"code": "TTS_FAILED", "message": str(exc)}},
        ) from None

    audio_bytes, mime_type = _extract_audio_part(raw)
    return Response(
        content=audio_bytes,
        media_type=mime_type,
        headers={
            "X-Voice-Id": body.voice_id,
            "X-Provider-Voice": provider_voice,
            "X-Voice-Style": voice_style["label"],
        },
    )
