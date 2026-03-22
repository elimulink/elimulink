from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.live_chat_service import generate_live_chat_reply

router = APIRouter(prefix="/api/v1/ai", tags=["ai-live-chat"])


class LiveChatRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=8000)
    context: dict | None = None


@router.post("/institution/live-chat")
async def institution_live_chat(body: LiveChatRequest):
    result = await generate_live_chat_reply(
        family="ai",
        app="institution",
        text=body.text,
        context=body.context,
    )
    return {
        "ok": True,
        "text": result["text"],
        "meta": {
            "mode": "live-chat",
            "family": "ai",
            "app": "institution",
            "provider": result["provider"],
            "model": result["model"],
        },
    }


@router.post("/student/live-chat")
async def student_live_chat(body: LiveChatRequest):
    result = await generate_live_chat_reply(
        family="ai",
        app="student",
        text=body.text,
        context=body.context,
    )
    return {
        "ok": True,
        "text": result["text"],
        "meta": {
            "mode": "live-chat",
            "family": "ai",
            "app": "student",
            "provider": result["provider"],
            "model": result["model"],
        },
    }


@router.post("/public/live-chat")
async def public_live_chat(body: LiveChatRequest):
    result = await generate_live_chat_reply(
        family="ai",
        app="public",
        text=body.text,
        context=body.context,
    )
    return {
        "ok": True,
        "text": result["text"],
        "meta": {
            "mode": "live-chat",
            "family": "ai",
            "app": "public",
            "provider": result["provider"],
            "model": result["model"],
        },
    }
