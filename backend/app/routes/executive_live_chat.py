from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..services.live_chat_service import generate_live_chat_reply

router = APIRouter(prefix="/api/v1/executive", tags=["executive-live-chat"])


class LiveChatRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=8000)
    context: dict | None = None


@router.post("/live-chat")
async def executive_live_chat(body: LiveChatRequest):
    result = await generate_live_chat_reply(
        family="executive",
        app="executive",
        text=body.text,
        context=body.context,
    )
    return {
        "ok": True,
        "text": result["text"],
        "meta": {
            "mode": "live-chat",
            "family": "executive",
            "provider": result["provider"],
            "model": result["model"],
        },
    }
