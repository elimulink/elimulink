from __future__ import annotations

import re
from typing import Any, Dict, Optional, Tuple

from ..services.ai_service import call_gemini_text
from ..utils import ProviderTimeoutError


_PROVIDER_KEY_PATTERN = re.compile(r"([?&]key=)[^&\s]+", re.IGNORECASE)


def _safe_provider_error(exc: Exception) -> str:
    message = str(exc).strip() or exc.__class__.__name__
    return _PROVIDER_KEY_PATTERN.sub(r"\1[redacted]", message)


async def generate_answer(
    message: str,
    context: Dict[str, Any],
    system_instruction: Optional[str] = None,
    mode: Optional[str] = None,
    workspace_context: Optional[Dict[str, Any]] = None,
) -> Tuple[str, Optional[str]]:
    try:
        text = await call_gemini_text(
            message,
            context,
            system_instruction=system_instruction,
            mode=mode,
            workspace_context=workspace_context,
        )
        return text, None
    except ProviderTimeoutError:
        print("[GEMINI_PROVIDER_ERROR] timeout", flush=True)
        return "The AI service timed out. Please try again.", "AI_TIMEOUT"
    except RuntimeError as exc:
        print(f"[GEMINI_PROVIDER_ERROR] {_safe_provider_error(exc)}", flush=True)
        if str(exc) == "MISSING_PROVIDER_KEY":
            return "AI provider key is missing.", "MISSING_PROVIDER_KEY"
        return "AI provider error. Please try again later.", "PROVIDER_ERROR"
    except Exception as exc:
        print(f"[GEMINI_PROVIDER_ERROR] {_safe_provider_error(exc)}", flush=True)
        return "AI provider error. Please try again later.", "PROVIDER_ERROR"
