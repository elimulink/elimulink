from __future__ import annotations

import asyncio
import re
from typing import Any

from fastapi import APIRouter, Depends, Request

from ..auth import CurrentUser, get_current_user
from ..services.model_registry import get_image_edit_model_candidates, get_image_model_candidates
from ..utils import (
    ProviderTimeoutError,
    err_response,
    ok_response,
    post_json_with_timeout,
)


router = APIRouter()


def _extract_image_output(raw: dict[str, Any]) -> tuple[str | None, str]:
    parts = raw.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    image_data_url = None
    response_text = ""
    for part in parts:
        if part.get("text"):
            response_text += str(part.get("text", "")).strip()
        inline_data = part.get("inlineData") or part.get("inline_data") or {}
        if inline_data.get("data"):
            mime_type = inline_data.get("mimeType") or inline_data.get("mime_type") or "image/png"
            image_data_url = f"data:{mime_type};base64,{inline_data['data']}"
    return image_data_url, response_text


async def _request_image_generation(
    *,
    gemini_key: str,
    models: list[str],
    payload: dict[str, Any],
    timeout_seconds: float,
) -> tuple[str, dict[str, Any]]:
    last_error = ""
    for model in models:
        try:
            raw = await post_json_with_timeout(
                (
                    "https://generativelanguage.googleapis.com/v1beta/models/"
                    f"{model}:generateContent?key={gemini_key}"
                ),
                payload,
                timeout_seconds=timeout_seconds,
            )
            return model, raw
        except ProviderTimeoutError:
            raise
        except Exception as exc:
            last_error = f"{model}: {str(exc)}"
            print(f"[IMAGE_PROVIDER_ERROR] {last_error}", flush=True)
    raise RuntimeError(last_error or "Image provider request failed.")


async def _generate_image_variant(
    *,
    gemini_key: str,
    models: list[str],
    prompt: str,
    timeout_seconds: float,
) -> dict[str, Any]:
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"],
        },
    }
    model, raw = await _request_image_generation(
        gemini_key=gemini_key,
        models=models,
        payload=payload,
        timeout_seconds=timeout_seconds,
    )
    image_data_url, response_text = _extract_image_output(raw)
    return {
        "image": image_data_url,
        "text": response_text,
        "provider": "gemini",
        "model": model,
    }


def _parse_image_data_url(value: str) -> tuple[str, str]:
    match = re.match(r"^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$", str(value or ""), re.DOTALL)
    if not match:
        raise ValueError("Expected a valid image data URL.")
    return match.group(1), match.group(2)


@router.post("/api/ai/image")
async def image(request: Request, user: CurrentUser = Depends(get_current_user)) -> object:
    body = await request.json()
    prompt = str((body or {}).get("prompt") or (body or {}).get("message") or (body or {}).get("text") or "").strip()
    compare = bool((body or {}).get("compare") or (body or {}).get("comparison") or (body or {}).get("twoImages"))
    if not prompt:
        return err_response("MESSAGE_REQUIRED", 400)

    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not gemini_key:
        return err_response("MISSING_PROVIDER_KEY", 500)

    models = get_image_model_candidates()

    try:
        if compare:
            variant_prompts = [
                f"{prompt}\n\nVariation A: balanced, polished, and visually clear.",
                f"{prompt}\n\nVariation B: slightly more expressive and visually distinct.",
            ]
            results = await asyncio.gather(
                *[
                    _generate_image_variant(
                        gemini_key=gemini_key,
                        models=models,
                        prompt=variant_prompt,
                        timeout_seconds=25.0,
                    )
                    for variant_prompt in variant_prompts
                ],
                return_exceptions=True,
            )

            images: list[dict[str, Any]] = []
            for index, result in enumerate(results, start=1):
                if isinstance(result, Exception):
                    print(f"[IMAGE_PROVIDER_ERROR] compare_{index}: {result}", flush=True)
                    continue
                image_url = str(result.get("image") or "").strip()
                if not image_url:
                    continue
                images.append(
                    {
                        "index": index,
                        "image": image_url,
                        "model": result.get("model"),
                    }
                )

            if len(images) >= 2:
                primary_model = str(images[0].get("model") or "")
                data = {
                    "image": images[0]["image"],
                    "images": images,
                    "comparison": True,
                    "provider": "gemini",
                    "model": primary_model,
                    "text": "Which image do you like more?",
                }
                return ok_response(
                    text=data["text"],
                    data=data,
                    image=data["image"],
                    images=images,
                    comparison=True,
                    provider="gemini",
                    model=primary_model,
                )

            if len(images) == 1:
                fallback_model = str(images[0].get("model") or "")
                fallback_image = images[0]["image"]
                data = {
                    "image": fallback_image,
                    "provider": "gemini",
                    "model": fallback_model,
                    "text": "Done ✅",
                }
                return ok_response(
                    text="Done ✅",
                    data=data,
                    image=fallback_image,
                    provider="gemini",
                    model=fallback_model,
                )

            return err_response("IMAGE_GENERATION_FAILED", 502, "No image was returned by the provider.")

        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseModalities": ["TEXT", "IMAGE"],
            },
        }
        model, raw = await _request_image_generation(
            gemini_key=gemini_key,
            models=models,
            payload=payload,
            timeout_seconds=25.0,
        )
    except ProviderTimeoutError:
        return err_response("AI_TIMEOUT", 504)
    except Exception as exc:
        return err_response("PROVIDER_ERROR", 502, str(exc))

    image_data_url, response_text = _extract_image_output(raw)

    if not image_data_url:
        return err_response("IMAGE_GENERATION_FAILED", 502, "No image was returned by the provider.")

    data = {
        "image": image_data_url,
        "provider": "gemini",
        "model": model,
        "text": "Done ✅",
    }
    # extra top-level field included for existing frontend compatibility
    return ok_response(
        text="Done ✅",
        data=data,
        image=image_data_url,
        provider="gemini",
        model=model,
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

    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not gemini_key:
        return err_response("MISSING_PROVIDER_KEY", 500)

    try:
        mime_type, image_base64 = _parse_image_data_url(image_data_url)
    except ValueError as exc:
        return err_response("INVALID_IMAGE", 400, str(exc))

    models = get_image_edit_model_candidates()
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": prompt},
                    {"inlineData": {"mimeType": mime_type, "data": image_base64}},
                ],
            }
        ],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"],
        },
    }
    try:
        model, raw = await _request_image_generation(
            gemini_key=gemini_key,
            models=models,
            payload=payload,
            timeout_seconds=40.0,
        )
    except ProviderTimeoutError:
        return err_response("AI_TIMEOUT", 504)
    except Exception as exc:
        return err_response("PROVIDER_ERROR", 502, str(exc))

    edited_image_url, response_text = _extract_image_output(raw)
    if not edited_image_url:
        return err_response("IMAGE_EDIT_FAILED", 502, "No edited image was returned by the provider.")

    data = {
        "image": edited_image_url,
        "provider": "gemini",
        "model": model,
        "text": "Updated ✅",
    }
    return ok_response(
        text="Updated ✅",
        data=data,
        image=edited_image_url,
        provider="gemini",
        model=model,
    )
