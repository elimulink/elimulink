from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from ..auth import CurrentUser, get_current_user
from ..services.image_generation_service import ImageGenerationError, edit_image_with_fallback, generate_image_with_fallback
from ..utils import err_response, ok_response


router = APIRouter()


def _resolve_image_reply_text(raw_text: str, *, mode: str, comparison: bool = False) -> str:
    text = str(raw_text or "").strip()
    if comparison:
        return text or "Here are two image options. Pick the one you prefer."
    if mode == "edit":
        if not text or text.lower().startswith("updated"):
            return "Here is the updated image."
        return text
    if not text or text.lower().startswith("done"):
        return "Here is your generated image."
    return text


@router.post("/api/ai/image")
async def image(request: Request, user: CurrentUser = Depends(get_current_user)) -> object:
    body = await request.json()
    prompt = str((body or {}).get("prompt") or (body or {}).get("message") or (body or {}).get("text") or "").strip()
    compare = bool((body or {}).get("compare") or (body or {}).get("comparison") or (body or {}).get("twoImages"))
    if not prompt:
        return err_response("MESSAGE_REQUIRED", 400)

    try:
        result = await generate_image_with_fallback(
            prompt=prompt,
            compare=compare,
            user_id=user.uid,
            timeout_seconds=25.0,
        )
    except ImageGenerationError as exc:
        return err_response(exc.code, exc.status_code, exc.message)
    except Exception as exc:
        return err_response("PROVIDER_ERROR", 502, str(exc))

    data = dict(result)
    image_url = str(data.get("image") or "").strip()
    if not image_url:
        return err_response("IMAGE_GENERATION_FAILED", 502, "No image was returned by the provider.")

    return ok_response(
        text=str(data.get("text") or "Done ✅"),
        data=data,
        image=image_url,
        images=data.get("images"),
        comparison=bool(data.get("comparison")),
        provider=str(data.get("provider") or ""),
        model=str(data.get("model") or ""),
    )


@router.post("/api/ai/image/edit")
async def edit_image(request: Request, user: CurrentUser = Depends(get_current_user)) -> object:
    body = await request.json()
    prompt = str((body or {}).get("prompt") or (body or {}).get("message") or (body or {}).get("text") or "").strip()
    image_data_url = str((body or {}).get("image_data_url") or (body or {}).get("imageDataUrl") or "").strip()
    if not prompt:
        return err_response("MESSAGE_REQUIRED", 400)
    if not image_data_url:
        return err_response("IMAGE_REQUIRED", 400)

    try:
        result = await edit_image_with_fallback(
            prompt=prompt,
            image_data_url=image_data_url,
            user_id=user.uid,
            timeout_seconds=40.0,
        )
    except ImageGenerationError as exc:
        return err_response(exc.code, exc.status_code, exc.message)
    except Exception as exc:
        return err_response("PROVIDER_ERROR", 502, str(exc))

    data = dict(result)
    image_url = str(data.get("image") or "").strip()
    if not image_url:
        return err_response("IMAGE_EDIT_FAILED", 502, "No edited image was returned by the provider.")

    return ok_response(
        text=str(data.get("text") or "Updated ✅"),
        data=data,
        image=image_url,
        provider=str(data.get("provider") or ""),
        model=str(data.get("model") or ""),
    )
