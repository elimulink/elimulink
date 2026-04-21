from __future__ import annotations

from typing import Any, Dict, List

from .compound_question import build_compound_request_context
from .structured_output_service import build_structured_output_guidance


def build_context_prompt(
    message: str,
    intent: str,
    tool_data: Dict[str, Any] | None,
    history: List[Dict[str, str]] | None,
    request_metadata: Dict[str, Any] | None = None,
) -> str:
    sections = [f"INTENT: {intent}"]
    intent_guidance = build_intent_guidance(intent)
    if intent_guidance:
        sections.append(intent_guidance)
    compound_context = build_compound_request_context(message)
    if compound_context:
        sections.append(compound_context)
    structured_output_guidance = build_structured_output_guidance(message)
    if structured_output_guidance:
        sections.append(structured_output_guidance)
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


def build_intent_guidance(intent: str) -> str:
    normalized_intent = str(intent or "").strip().lower()
    if normalized_intent == "research_with_sources":
        return (
            "INTENT_RULE: The user wants a source-aware answer. Answer the actual question first, "
            "then include concise supporting references or citations when possible. "
            "Do not switch topics unless the user clearly asked a different question."
        )
    if normalized_intent == "workflow_assistant":
        return (
            "INTENT_RULE: The user wants actionable workflow help. Prefer step-by-step guidance, "
            "safe simulation, or explicit confirmation before any real internal action."
        )
    return ""


def build_follow_up_context(request_metadata: Dict[str, Any] | None) -> str:
    meta = request_metadata or {}
    topic = str(meta.get("topic") or "").strip()
    previous_assistant_message = str(meta.get("previousAssistantMessage") or "").strip()
    pending_assistant_intent = str(meta.get("pendingAssistantIntent") or "").strip()
    pending_assistant_mode = str(meta.get("pendingAssistantMode") or "").strip()
    follow_up = bool(meta.get("followUp"))
    follow_up_type = str(meta.get("followUpType") or "").strip()
    target_language = str(meta.get("targetLanguage") or "").strip()
    original_message = str(meta.get("originalMessage") or "").strip()
    new_topic = bool(meta.get("newTopic"))
    route_hint = str(meta.get("routeHint") or "").strip()

    lines: list[str] = []
    if route_hint:
        lines.append(f"ROUTE_HINT: {route_hint}")
        if route_hint == "general_chat":
            lines.append(
                "GENERAL_CHAT_RULE: Treat ordinary conversation naturally. Answer clear questions directly in the first sentence, "
                "avoid academic or admin onboarding unless the user asks for it, and keep casual replies warm, brief, and professional."
            )
        elif route_hint in {"math_solver", "physics_solver", "chemistry_solver"}:
            lines.append(
                "ANSWER_FIRST_RULE: The user is asking for a direct subject answer. Start with the actual answer or first solving step, "
                "not with a generic intro."
            )
        elif route_hint == "research_with_sources":
            lines.append(
                "SOURCE_MODE_RULE: Answer the main question first, then add concise supporting sources without turning the opening into a research disclaimer."
            )
    if new_topic:
        lines.append(
            "NEW_TOPIC_RULE: Treat this message as a fresh topic or ordinary conversation turn. "
            "Do not continue the previous topic unless the user explicitly refers back to it."
        )
        if route_hint == "general_chat":
            lines.append(
                "NEW_TOPIC_CONVERSATION_STYLE: Reply as if this is a fresh human conversation turn. Avoid phrases that reset into study-help or admin-tool mode."
            )
    if topic:
        lines.append(f"ACTIVE_TOPIC: {topic}")

    if follow_up and not new_topic:
        lines.append("FOLLOW_UP_RULE: This user message is a follow-up instruction for the previous answer, not a new topic.")
        if follow_up_type:
            lines.append(f"FOLLOW_UP_TYPE: {follow_up_type}")
        if target_language:
            lines.append(f"TARGET_LANGUAGE: {target_language}")
        if previous_assistant_message:
            lines.append(f"PREVIOUS_ASSISTANT_MESSAGE:\n{previous_assistant_message}")
        if pending_assistant_intent:
            lines.append(f"PENDING_ASSISTANT_INTENT: {pending_assistant_intent}")
            lines.append(
                "PENDING_INTENT_RULE: If the user replies with a short approval or continuation cue, continue this pending assistant offer first before using broader history."
            )
        if pending_assistant_mode:
            lines.append(f"PENDING_ASSISTANT_MODE: {pending_assistant_mode}")
            lines.append(
                "MODE_CONTINUITY_RULE: Keep the continuation inside this local mode unless the user clearly asked for a new topic."
            )
        if follow_up_type in {"ACCEPT_CONTINUATION", "CONTINUE", "EXPLAIN_MORE", "CONTINUE_IN_LANGUAGE", "ADD_SOURCES"}:
            lines.append(
                "CONTINUATION_RULE: Continue the pending explanation or next step directly and naturally. Do not restart the topic, "
                "do not ask the user to repeat themselves, and do not switch to a new subject."
            )
        if follow_up_type == "ADD_SOURCES":
            lines.append(
                "SOURCE_CONTINUATION_RULE: Keep the same topic and add concise sources, references, or citations to the existing answer."
            )
        lines.append(
            "STRICT_TOPIC_RULE: Keep the same topic. Do not switch subject based on a random short word. "
            "If the request is ambiguous, continue the previous topic instead of inventing a new one."
        )
        lines.append(
            "FOLLOW_UP_STYLE_RULE: Treat short replies like yes, okay, go on, or continue as approval to carry on with the last helpful offer."
        )
        if topic:
            lines.append(f"DRIFT_GUARD: If you start to drift, continue previous topic: {topic}")
    elif topic:
        lines.append(
            "TOPIC_ANCHOR: Use the active topic to interpret short references like it, this, that, they, and them."
        )
    if not follow_up and route_hint == "general_chat":
        lines.append(
            "OPENING_RULE: Avoid robotic openers, stock assistant intros, and unnecessary setup. If the user asks a clear question, answer it first."
        )

    if original_message and original_message != str(meta.get("normalizedMessage") or "").strip():
        lines.append(f"ORIGINAL_USER_TEXT: {original_message}")

    return "\n".join(lines)
