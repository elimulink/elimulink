from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.vision_service import analyze_visual_context

router = APIRouter(prefix="/api/v1/vision", tags=["vision-assist"])


class VisionAnalyzeRequest(BaseModel):
    image_data_url: str | None = Field(default=None, description="Base64 data URL image")
    image_data_urls: list[str] | None = Field(default=None, description="Base64 data URL images")
    prompt: str = Field(..., min_length=1, max_length=4000)
    family: str | None = None
    app: str | None = None


@router.post("/analyze")
async def analyze_image(body: VisionAnalyzeRequest):
    result = await analyze_visual_context(
        image_data_url=body.image_data_url,
        image_data_urls=body.image_data_urls,
        prompt=body.prompt,
        family=body.family,
        app=body.app,
    )
    return {
        "ok": True,
        "answer": result["answer"],
        "highlights": result["highlights"],
        "meta": {
            "provider": result["provider"],
            "model": result["model"],
            "family": body.family,
            "app": body.app,
        },
    }
