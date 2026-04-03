from __future__ import annotations

import os
import re
from typing import Any

from fastapi import APIRouter, Depends, Request

from ..auth import CurrentUser, get_current_user
from ..utils import (
    ProviderTimeoutError,
    err_response,
    ok_response,
    post_json_with_timeout,
)


router = APIRouter()

DEFAULT_GENERATION_MODELS = (
    "gemini-2.5-flash-image",
    "gemini-2.5-flash-image-preview",
    "gemini-2.0-flash-preview-image-generation",
)
DEFAULT_EDIT_MODELS = (
    "gemini-2.5-flash-image",
    "gemini-2.5-flash-image-preview",
)


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


def _resolve_model_candidates(env_name: str, defaults: tuple[str, ...]) -> list[str]:
    configured = [
        item.strip()
        for item in str(os.getenv(env_name, "") or "").split(",")
        if item.strip()
    ]
    return list(dict.fromkeys([*configured, *defaults]))


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


def _parse_image_data_url(value: str) -> tuple[str, str]:
    match = re.match(r"^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$", str(value or ""), re.DOTALL)
    if not match:
        raise ValueError("Expected a valid image data URL.")
    return match.group(1), match.group(2)


@router.post("/api/ai/image")
async def image(request: Request, user: CurrentUser = Depends(get_current_user)) -> object:
    body = await request.json()
    prompt = str((body or {}).get("prompt") or (body or {}).get("message") or (body or {}).get("text") or "").strip()
    if not prompt:
        return err_response("MESSAGE_REQUIRED", 400)

    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not gemini_key:
        return err_response("MISSING_PROVIDER_KEY", 500)

    models = _resolve_model_candidates("GEMINI_IMAGE_MODEL", DEFAULT_GENERATION_MODELS)
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"],
        },
    }
    try:
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
        "text": response_text or "Here is the generated image.",
    }
    # extra top-level field included for existing frontend compatibility
    return ok_response(
        text=response_text or "Here is the generated image.",
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

    models = _resolve_model_candidates("GEMINI_IMAGE_EDIT_MODEL", DEFAULT_EDIT_MODELS)
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
        "text": response_text or "Here is the edited image.",
    }
    return ok_response(
        text=response_text or "Here is the edited image.",
        data=data,
        image=edited_image_url,
        provider="gemini",
        model=model,
    )
