from __future__ import annotations

import json
import os
from typing import Any, AsyncIterator

import httpx

from ..utils import ProviderTimeoutError, post_json_with_timeout

STUDENT_SYSTEM_PROMPT = """You are ElimuLink AI, an intelligent academic assistant for students and universities.

Your job is to help students with:
- coursework
- assignments
- exam preparation
- research
- coding help
- academic writing

Guidelines:
1. Keep a calm, modern, direct, and practical tone.
2. Help immediately. Do not start with role statements, identity statements, or customer-service intros.
3. For simple questions or casual support, answer briefly and naturally first.
4. If the user feels bored, stuck, overwhelmed, or unsure what to do next, give one supportive line and one specific next step.
5. Use plain text by default. Use markdown only when it clearly improves clarity or copying.
6. Use bullets or numbered steps only when the user actually needs structure.
7. Keep notes, study plans, and explanations compact and readable.
8. If deeper detail is needed, expand after the direct answer.
9. If a next step is useful, end with one specific action-oriented continuation tied to the current topic.
   Prefer modern phrasing like:
   - Next, I can break this down step by step.
   - Send me your units and I’ll choose what to revise first.
   - Paste the topic and I’ll turn it into a short study plan.
10. Avoid generic customer-service endings such as "How may I assist you today?" or "Would you like more information?"
11. When the user sends a short acceptance like "yes", "continue", "go on", or "do that", treat it as approval to continue the most recent suggested next step.
12. For compound questions, answer every requested part in order. If one part needs live/current verification and you cannot verify it, say so briefly on that exact item and still answer the rest.
13. If the user asks for a vague image, ask one short clarifying question instead of explaining the limits.
14. Respond in English or Swahili depending on the user's language.
"""

ADMIN_SYSTEM_PROMPT = """You are ElimuLink Administrative AI, an intelligent institutional assistant for university administration.

Your role is to support:
- department operations
- workflow oversight
- results management support
- attendance monitoring support
- announcement drafting
- audit/compliance summaries
- department reporting
- staff and lecturer operational insights

Important rules:
1. Respond in a professional, concise, institution-grade tone.
2. Be clear, structured, and helpful.
3. Support decision-making, but do not pretend to have authority you do not have.
4. AI suggestions are drafts only and must not be treated as final approvals.
5. Never autonomously approve, publish, grade, release results, unlock communication, discipline staff, or finalize sensitive institutional actions.
6. When suitable, format responses using:
- Summary
- Key Findings
- Risks
- Recommended Actions
- Approval Needed
7. If the request seems sensitive or governance-related, clearly state that human review/approval is required.
8. Use the provided role/department/workspace context when answering.
9. If department context is missing, answer generally and say that department-scoped confirmation may be needed.
10. Respond in English or Swahili depending on the user's language.
"""

# Backward-compatible alias for existing imports/usages.
DEFAULT_SYSTEM_PROMPT = STUDENT_SYSTEM_PROMPT


def resolve_system_prompt(mode: str | None = None, workspace_context: dict[str, Any] | None = None) -> str:
    normalized_mode = str(mode or "").strip().lower()

    if normalized_mode == "admin":
        return ADMIN_SYSTEM_PROMPT

    if workspace_context and str(workspace_context.get("scope", "")).strip().lower() == "admin":
        return ADMIN_SYSTEM_PROMPT

    return STUDENT_SYSTEM_PROMPT


def build_context_prefix(mode: str | None = None, workspace_context: dict[str, Any] | None = None) -> str:
    _ = mode
    if not workspace_context:
        return ""

    lines: list[str] = []
    scope = workspace_context.get("scope")
    department = workspace_context.get("department")
    role = workspace_context.get("role")
    institution = workspace_context.get("institution")

    if scope:
        lines.append(f"Scope: {scope}")
    if institution:
        lines.append(f"Institution: {institution}")
    if department:
        lines.append(f"Department: {department}")
    if role:
        lines.append(f"Role: {role}")

    if not lines:
        return ""

    return "Context:\n" + "\n".join(lines) + "\n\n"


async def call_gemini_text(
    message: str,
    context: dict[str, Any],
    system_instruction: str | None = None,
    mode: str | None = None,
    workspace_context: dict[str, Any] | None = None,
) -> str:
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not gemini_key:
        raise RuntimeError("MISSING_PROVIDER_KEY")

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.5-flash:generateContent?key={gemini_key}"
    )
    system_text = system_instruction or resolve_system_prompt(mode, workspace_context)
    context_prefix = build_context_prefix(mode, workspace_context)
    final_user_message = f"{context_prefix}{message}".strip()

    payload = {
        "systemInstruction": {"parts": [{"text": system_text}]},
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": f"USER_MESSAGE:\n{final_user_message}\n"},
                    {"text": f"GROUNDING_DATA:\n{context}\n"},
                ],
            }
        ],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 900,
            "topP": 0.9,
        },
    }
    data = await post_json_with_timeout(url, payload, timeout_seconds=25.0)
    return (
        "".join(
            p.get("text", "")
            for p in (data.get("candidates", [{}])[0].get("content", {}).get("parts", []))
        ).strip()
        or "I couldn't generate a response."
    )


async def stream_gemini_text(
    message: str,
    context: dict[str, Any],
    system_instruction: str | None = None,
    mode: str | None = None,
    workspace_context: dict[str, Any] | None = None,
    timeout_seconds: float = 25.0,
) -> AsyncIterator[str]:
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not gemini_key:
        raise RuntimeError("MISSING_PROVIDER_KEY")

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.5-flash:streamGenerateContent?alt=sse&key={gemini_key}"
    )
    system_text = system_instruction or resolve_system_prompt(mode, workspace_context)
    context_prefix = build_context_prefix(mode, workspace_context)
    final_user_message = f"{context_prefix}{message}".strip()
    payload = {
        "systemInstruction": {"parts": [{"text": system_text}]},
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": f"USER_MESSAGE:\n{final_user_message}\n"},
                    {"text": f"GROUNDING_DATA:\n{context}\n"},
                ],
            }
        ],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 900,
            "topP": 0.9,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            async with client.stream("POST", url, json=payload) as response:
                if response.status_code >= 400:
                    raw = (await response.aread()).decode("utf-8", errors="ignore")
                    try:
                        data = json.loads(raw or "{}")
                    except json.JSONDecodeError:
                        data = {}
                    message = (
                        data.get("error", {}).get("message")
                        if isinstance(data.get("error"), dict)
                        else data.get("error")
                    ) or f"PROVIDER_HTTP_{response.status_code}"
                    raise RuntimeError(str(message))

                async for line in response.aiter_lines():
                    clean_line = str(line or "").strip()
                    if not clean_line.startswith("data:"):
                        continue
                    raw_data = clean_line[5:].strip()
                    if not raw_data:
                        continue
                    try:
                        chunk_payload = json.loads(raw_data)
                    except json.JSONDecodeError:
                        continue
                    parts = (
                        chunk_payload.get("candidates", [{}])[0]
                        .get("content", {})
                        .get("parts", [])
                    )
                    delta = "".join(str(part.get("text", "")) for part in parts if part.get("text"))
                    if delta:
                        yield delta
    except httpx.TimeoutException as exc:
        raise ProviderTimeoutError("AI_TIMEOUT") from exc
    except httpx.RequestError as exc:
        raise RuntimeError(f"PROVIDER_REQUEST_ERROR:{str(exc)}") from exc
