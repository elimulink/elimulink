from __future__ import annotations

VOICE_PROVIDER_MAP = {
    "nova": "Kore",
    "vega": "Puck",
    "ursa": "Aoede",
    "orbit": "Charon",
    "orion": "Fenrir",
    "capella": "Leda",
    "dipper": "Orus",
    "pegasus": "Charon",
    "lyra": "Puck",
    "aurora": "Zephyr",
    "atlas": "Fenrir",
    "echo": "Kore",
}

VOICE_STYLE_MAP = {
    "nova": {"label": "Calm and balanced"},
    "vega": {"label": "Bright and lively"},
    "ursa": {"label": "Warm and conversational"},
    "orbit": {"label": "Energetic and modern"},
    "orion": {"label": "Confident and deep"},
    "capella": {"label": "Serene and soft"},
    "dipper": {"label": "Grounded and steady"},
    "pegasus": {"label": "Strong and direct"},
    "lyra": {"label": "Friendly and light"},
    "aurora": {"label": "Gentle and smooth"},
    "atlas": {"label": "Authoritative and clear"},
    "echo": {"label": "Expressive and animated"},
}

DEFAULT_VOICE_ID = "nova"


def resolve_provider_voice(voice_id: str | None) -> str:
    if not voice_id:
        return VOICE_PROVIDER_MAP[DEFAULT_VOICE_ID]
    return VOICE_PROVIDER_MAP.get(voice_id, VOICE_PROVIDER_MAP[DEFAULT_VOICE_ID])


def resolve_voice_style(voice_id: str | None) -> dict:
    if not voice_id:
        return VOICE_STYLE_MAP[DEFAULT_VOICE_ID]
    return VOICE_STYLE_MAP.get(voice_id, VOICE_STYLE_MAP[DEFAULT_VOICE_ID])
