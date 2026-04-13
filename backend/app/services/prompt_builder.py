from __future__ import annotations

from typing import Any, Dict, List

from .compound_question import build_compound_request_context


def build_context_prompt(
    message: str,
    intent: str,
    tool_data: Dict[str, Any] | None,
    history: List[Dict[str, str]] | None,
    request_metadata: Dict[str, Any] | None = None,
) -> str:
    sections = [f"INTENT: {intent}"]
    compound_context = build_compound_request_context(message)
    if compound_context:
        sections.append(compound_context)
    follow_up_context = build_follow_up_context(request_metadata)
    if follow_up_context:
        sections.append(follow_up_context)
    if history:
        history_text = "\n".join(f"{m['role']}: {m['content']}" for m in history)
        sections.append(f"HISTORY:\n{history_text}")
    if tool_data is not None:
        sections.append(f"TOOL_DATA:\n{tool_data}")
    sections.append(f"USER_MESSAGE:\n{message}")
    return "\n\n".join(sections)


def build_follow_up_context(request_metadata: Dict[str, Any] | None) -> str:
    meta = request_metadata or {}
    topic = str(meta.get("topic") or "").strip()
    previous_assistant_message = str(meta.get("previousAssistantMessage") or "").strip()
    follow_up = bool(meta.get("followUp"))
    follow_up_type = str(meta.get("followUpType") or "").strip()
    target_language = str(meta.get("targetLanguage") or "").strip()
    original_message = str(meta.get("originalMessage") or "").strip()

    lines: list[str] = []
    if topic:
        lines.append(f"ACTIVE_TOPIC: {topic}")

    if follow_up:
        lines.append("FOLLOW_UP_RULE: This user message is a follow-up instruction for the previous answer, not a new topic.")
        if follow_up_type:
            lines.append(f"FOLLOW_UP_TYPE: {follow_up_type}")
        if target_language:
            lines.append(f"TARGET_LANGUAGE: {target_language}")
        if previous_assistant_message:
            lines.append(f"PREVIOUS_ASSISTANT_MESSAGE:\n{previous_assistant_message}")
        lines.append(
            "STRICT_TOPIC_RULE: Keep the same topic. Do not switch subject based on a random short word. "
            "If the request is ambiguous, continue the previous topic instead of inventing a new one."
        )
        if topic:
            lines.append(f"DRIFT_GUARD: If you start to drift, continue previous topic: {topic}")
    elif topic:
        lines.append(
            "TOPIC_ANCHOR: Use the active topic to interpret short references like it, this, that, they, and them."
        )

    if original_message and original_message != str(meta.get("normalizedMessage") or "").strip():
        lines.append(f"ORIGINAL_USER_TEXT: {original_message}")

    return "\n".join(lines)
