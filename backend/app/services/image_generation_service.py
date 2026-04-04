from __future__ import annotations

import asyncio
import base64
import os
import re
from typing import Any

import httpx

from ..utils import ProviderTimeoutError, is_provider_quota_error, post_json_with_timeout
from .model_registry import get_image_edit_model_candidates, get_image_model_candidates, get_openai_image_edit_model_candidates, get_openai_image_model_candidates


_HTTP_STATUS_PATTERN = re.compile(r"provider_http_(\d{3})", re.IGNORECASE)


class ImageGenerationError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 502) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


def _safe_message(exc: Exception) -> str:
    return str(exc).strip() or exc.__class__.__name__


def _extract_gemini_image_output(raw: dict[str, Any]) -> tuple[str | None, str]:
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


def _build_data_url(image_b64: str, mime_type: str = "image/png") -> str:
    return f"data:{mime_type};base64,{image_b64}"


def _extract_openai_images_output(raw: dict[str, Any]) -> list[str]:
    items = raw.get("data", [])
    images: list[str] = []
    for item in items if isinstance(items, list) else []:
        if not isinstance(item, dict):
            continue
        b64_json = str(item.get("b64_json") or "").strip()
        if b64_json:
            images.append(_build_data_url(b64_json, "image/png"))
            continue
        image_url = str(item.get("url") or "").strip()
        if image_url:
            images.append(image_url)
    return images


def _parse_status_from_message(message: str) -> int | None:
    match = _HTTP_STATUS_PATTERN.search(message)
    if not match:
        return None
    try:
        return int(match.group(1))
    except Exception:
        return None


def _is_retryable_gemini_error(message: str) -> bool:
    text = str(message or "").strip().lower()
    if not text:
        return False

    if is_provider_quota_error(text):
        return True

    retryable_markers = (
        "quota exceeded",
        "rate limit",
        "resource_exhausted",
        "limit: 0",
        "limit: 20",
        "please retry in",
        "too many requests",
        "provider_request_error",
        "timeout",
        "temporarily unavailable",
        "service unavailable",
        "internal server error",
        "model is not found",
        "not found",
        "not supported for generatecontent",
        "model unavailable",
        "no such model",
        "connection error",
        "server error",
    )
    non_retryable_markers = (
        "safety",
        "policy",
        "blocked",
        "prohibited",
        "invalid prompt",
        "malformed",
        "bad request",
        "cancelled",
        "user cancelled",
    )

    if any(marker in text for marker in retryable_markers):
        return True

    status = _parse_status_from_message(text)
    if status is not None and (status == 429 or 500 <= status < 600):
        return True

    if any(marker in text for marker in non_retryable_markers):
        return False

    return False


def _is_retryable_openai_error(message: str) -> bool:
    text = str(message or "").strip().lower()
    if not text:
        return False
    if any(
        marker in text
        for marker in (
            "rate limit",
            "quota",
            "too many requests",
            "timeout",
            "service unavailable",
            "temporarily unavailable",
            "internal server error",
            "connection error",
            "model not found",
            "not found",
            "not supported",
            "unsupported",
            "does not exist",
            "unavailable",
        )
    ):
        return True
    status = _parse_status_from_message(text)
    if status is not None and (status == 429 or 500 <= status < 600):
        return True
    return False


async def _request_gemini_image_generation(
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
            last_error = f"{model}: {_safe_message(exc)}"
            print(f"[IMAGE_PROVIDER_ERROR] {last_error}", flush=True)
    raise RuntimeError(last_error or "Image provider request failed.")


async def _generate_gemini_variant(
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
    model, raw = await _request_gemini_image_generation(
        gemini_key=gemini_key,
        models=models,
        payload=payload,
        timeout_seconds=timeout_seconds,
    )
    image_data_url, response_text = _extract_gemini_image_output(raw)
    return {
        "image": image_data_url,
        "text": response_text,
        "provider": "gemini",
        "model": model,
    }


async def _generate_gemini_image(
    *,
    gemini_key: str,
    prompt: str,
    compare: bool,
    timeout_seconds: float,
) -> dict[str, Any]:
    models = get_image_model_candidates()
    if compare:
        variant_prompts = [
            f"{prompt}\n\nVariation A: balanced, polished, and visually clear.",
            f"{prompt}\n\nVariation B: slightly more expressive and visually distinct.",
        ]
        results = await asyncio.gather(
            *[
                _generate_gemini_variant(
                    gemini_key=gemini_key,
                    models=models,
                    prompt=variant_prompt,
                    timeout_seconds=timeout_seconds,
                )
                for variant_prompt in variant_prompts
            ],
            return_exceptions=True,
        )

        images: list[dict[str, Any]] = []
        retryable_failure = False
        non_retryable_error: ImageGenerationError | None = None

        for index, result in enumerate(results, start=1):
            if isinstance(result, Exception):
                message = _safe_message(result)
                print(f"[IMAGE_PROVIDER_ERROR] gemini_compare_{index}: {message}", flush=True)
                if _is_retryable_gemini_error(message):
                    retryable_failure = True
                else:
                    non_retryable_error = ImageGenerationError("IMAGE_REQUEST_REJECTED", "That image request can't be generated.", 400)
                continue

            image_url = str(result.get("image") or "").strip()
            if not image_url:
                retryable_failure = True
                continue
            images.append(
                {
                    "index": index,
                    "image": image_url,
                    "model": result.get("model"),
                    "provider": "gemini",
                }
            )

        if len(images) >= 2:
            primary_model = str(images[0].get("model") or "")
            return {
                "image": images[0]["image"],
                "images": images,
                "comparison": True,
                "provider": "gemini",
                "model": primary_model,
                "text": "Which image do you like more?",
            }

        if non_retryable_error:
            raise non_retryable_error

        if retryable_failure:
            raise ImageGenerationError("IMAGE_PROVIDER_RETRYABLE", "Gemini image generation failed.", 502)

        raise ImageGenerationError("IMAGE_GENERATION_FAILED", "No image was returned by the provider.", 502)

    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"],
        },
    }
    model, raw = await _request_gemini_image_generation(
        gemini_key=gemini_key,
        models=models,
        payload=payload,
        timeout_seconds=timeout_seconds,
    )

    image_data_url, response_text = _extract_gemini_image_output(raw)
    if not image_data_url:
        raise ImageGenerationError("IMAGE_GENERATION_FAILED", "No image was returned by the provider.", 502)

    return {
        "image": image_data_url,
        "provider": "gemini",
        "model": model,
        "text": "Done ✅",
    }


async def _openai_post_json(
    *,
    url: str,
    api_key: str,
    payload: dict[str, Any],
    timeout_seconds: float,
) -> dict[str, Any]:
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            response = await client.post(url, json=payload, headers=headers)
    except httpx.TimeoutException as exc:
        raise RuntimeError("PROVIDER_TIMEOUT") from exc
    except httpx.RequestError as exc:
        raise RuntimeError(f"PROVIDER_REQUEST_ERROR:{str(exc)}") from exc
    data = response.json() if response.content else {}
    if response.status_code >= 400:
        message = (
            data.get("error", {}).get("message")
            if isinstance(data.get("error"), dict)
            else data.get("error")
        ) or f"PROVIDER_HTTP_{response.status_code}"
        raise RuntimeError(str(message))
    return data


async def _openai_post_multipart(
    *,
    url: str,
    api_key: str,
    data: dict[str, Any],
    files: list[tuple[str, tuple[str, bytes, str]]],
    timeout_seconds: float,
) -> dict[str, Any]:
    headers = {"Authorization": f"Bearer {api_key}"}
    try:
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            response = await client.post(url, data=data, files=files, headers=headers)
    except httpx.TimeoutException as exc:
        raise RuntimeError("PROVIDER_TIMEOUT") from exc
    except httpx.RequestError as exc:
        raise RuntimeError(f"PROVIDER_REQUEST_ERROR:{str(exc)}") from exc
    payload = response.json() if response.content else {}
    if response.status_code >= 400:
        message = (
            payload.get("error", {}).get("message")
            if isinstance(payload.get("error"), dict)
            else payload.get("error")
        ) or f"PROVIDER_HTTP_{response.status_code}"
        raise RuntimeError(str(message))
    return payload


async def _generate_openai_image(
    *,
    openai_key: str,
    prompt: str,
    compare: bool,
    timeout_seconds: float,
) -> dict[str, Any]:
    models = get_openai_image_model_candidates()
    last_error = ""
    for model in models:
        try:
            payload = {
                "model": model,
                "prompt": prompt,
                "n": 2 if compare else 1,
            }
            raw = await _openai_post_json(
                url="https://api.openai.com/v1/images/generations",
                api_key=openai_key,
                payload=payload,
                timeout_seconds=timeout_seconds,
            )
            images = _extract_openai_images_output(raw)
            if compare:
                if len(images) >= 2:
                    image_items = [
                        {"index": index, "image": image_url, "model": model, "provider": "openai"}
                        for index, image_url in enumerate(images[:2], start=1)
                    ]
                    return {
                        "image": image_items[0]["image"],
                        "images": image_items,
                        "comparison": True,
                        "provider": "openai",
                        "model": model,
                        "text": "Which image do you like more?",
                    }
                if len(images) == 1:
                    return {
                        "image": images[0],
                        "provider": "openai",
                        "model": model,
                        "text": "Done ✅",
                    }
                raise RuntimeError("No image data returned by OpenAI.")

            if not images:
                raise RuntimeError("No image data returned by OpenAI.")
            return {
                "image": images[0],
                "provider": "openai",
                "model": model,
                "text": "Done ✅",
            }
        except Exception as exc:
            last_error = f"{model}: {_safe_message(exc)}"
            print(f"[IMAGE_PROVIDER_ERROR] {last_error}", flush=True)
            if not _is_retryable_openai_error(last_error):
                raise ImageGenerationError("IMAGE_REQUEST_REJECTED", "That image request can't be generated.", 400)
    raise ImageGenerationError("IMAGE_GENERATION_FAILED", last_error or "OpenAI image generation failed.", 502)


async def _edit_gemini_image(
    *,
    gemini_key: str,
    prompt: str,
    image_data_url: str,
    timeout_seconds: float,
) -> dict[str, Any]:
    mime_type_match = re.match(r"^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$", str(image_data_url or ""), re.DOTALL)
    if not mime_type_match:
        raise ImageGenerationError("INVALID_IMAGE", "Expected a valid image data URL.", 400)
    mime_type = mime_type_match.group(1)
    image_base64 = mime_type_match.group(2)

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
    model, raw = await _request_gemini_image_generation(
        gemini_key=gemini_key,
        models=models,
        payload=payload,
        timeout_seconds=timeout_seconds,
    )
    edited_image_url, response_text = _extract_gemini_image_output(raw)
    if not edited_image_url:
        raise ImageGenerationError("IMAGE_EDIT_FAILED", "No edited image was returned by the provider.", 502)
    return {
        "image": edited_image_url,
        "provider": "gemini",
        "model": model,
        "text": "Updated ✅",
    }


async def _edit_openai_image(
    *,
    openai_key: str,
    prompt: str,
    image_data_url: str,
    timeout_seconds: float,
) -> dict[str, Any]:
    mime_type_match = re.match(r"^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$", str(image_data_url or ""), re.DOTALL)
    if not mime_type_match:
        raise ImageGenerationError("INVALID_IMAGE", "Expected a valid image data URL.", 400)

    mime_type = mime_type_match.group(1)
    image_base64 = mime_type_match.group(2)
    image_bytes = base64.b64decode(image_base64)

    models = get_openai_image_edit_model_candidates()
    last_error = ""
    for model in models:
        try:
            raw = await _openai_post_multipart(
                url="https://api.openai.com/v1/images/edits",
                api_key=openai_key,
                data={
                    "model": model,
                    "prompt": prompt,
                },
                files=[("image[]", ("image.png", image_bytes, mime_type))],
                timeout_seconds=timeout_seconds,
            )
            images = _extract_openai_images_output(raw)
            if not images:
                raise RuntimeError("No image data returned by OpenAI.")
            return {
                "image": images[0],
                "provider": "openai",
                "model": model,
                "text": "Updated ✅",
            }
        except Exception as exc:
            last_error = f"{model}: {_safe_message(exc)}"
            print(f"[IMAGE_PROVIDER_ERROR] {last_error}", flush=True)
            if not _is_retryable_openai_error(last_error):
                raise ImageGenerationError("IMAGE_REQUEST_REJECTED", "That image request can't be generated.", 400)
    raise ImageGenerationError("IMAGE_EDIT_FAILED", last_error or "OpenAI image edit failed.", 502)


async def generate_image_with_fallback(
    *,
    prompt: str,
    compare: bool = False,
    user_id: str | None = None,
    timeout_seconds: float = 25.0,
) -> dict[str, Any]:
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()

    if gemini_key:
        try:
            result = await _generate_gemini_image(
                gemini_key=gemini_key,
                prompt=prompt,
                compare=compare,
                timeout_seconds=timeout_seconds,
            )
            print(
                f"[IMAGE_PROVIDER] provider={result.get('provider')} model={result.get('model')} compare={bool(compare)}",
                flush=True,
            )
            return result
        except ImageGenerationError as exc:
            if exc.status_code == 400:
                raise
            if not _is_retryable_gemini_error(exc.message):
                raise
            print(f"[IMAGE_PROVIDER_FALLBACK] gemini->openai reason={_safe_message(exc)}", flush=True)
        except Exception as exc:
            message = _safe_message(exc)
            if not _is_retryable_gemini_error(message):
                raise ImageGenerationError("IMAGE_GENERATION_FAILED", message, 502)
            print(f"[IMAGE_PROVIDER_FALLBACK] gemini->openai reason={message}", flush=True)
    else:
        print("[IMAGE_PROVIDER_FALLBACK] gemini key missing; attempting openai image fallback", flush=True)

    if not openai_key:
        raise ImageGenerationError("MISSING_PROVIDER_KEY", "Neither Gemini nor OpenAI image provider is configured.", 500)

    result = await _generate_openai_image(
        openai_key=openai_key,
        prompt=prompt,
        compare=compare,
        timeout_seconds=timeout_seconds,
    )
    print(
        f"[IMAGE_PROVIDER] provider={result.get('provider')} model={result.get('model')} compare={bool(compare)}",
        flush=True,
    )
    return result


async def edit_image_with_fallback(
    *,
    prompt: str,
    image_data_url: str,
    user_id: str | None = None,
    timeout_seconds: float = 40.0,
) -> dict[str, Any]:
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()

    if gemini_key:
        try:
            result = await _edit_gemini_image(
                gemini_key=gemini_key,
                prompt=prompt,
                image_data_url=image_data_url,
                timeout_seconds=timeout_seconds,
            )
            print(
                f"[IMAGE_PROVIDER] provider={result.get('provider')} model={result.get('model')} edit=True",
                flush=True,
            )
            return result
        except ImageGenerationError as exc:
            if exc.status_code == 400:
                raise
            if not _is_retryable_gemini_error(exc.message):
                raise
            print(f"[IMAGE_PROVIDER_FALLBACK] gemini->openai reason={_safe_message(exc)}", flush=True)
        except Exception as exc:
            message = _safe_message(exc)
            if not _is_retryable_gemini_error(message):
                raise ImageGenerationError("IMAGE_EDIT_FAILED", message, 502)
            print(f"[IMAGE_PROVIDER_FALLBACK] gemini->openai reason={message}", flush=True)
    else:
        print("[IMAGE_PROVIDER_FALLBACK] gemini key missing; attempting openai image edit fallback", flush=True)

    if not openai_key:
        raise ImageGenerationError("MISSING_PROVIDER_KEY", "Neither Gemini nor OpenAI image provider is configured.", 500)

    result = await _edit_openai_image(
        openai_key=openai_key,
        prompt=prompt,
        image_data_url=image_data_url,
        timeout_seconds=timeout_seconds,
    )
    print(
        f"[IMAGE_PROVIDER] provider={result.get('provider')} model={result.get('model')} edit=True",
        flush=True,
    )
    return result
