from __future__ import annotations

from typing import Any, Dict, List


def build_context_prompt(
    message: str,
    intent: str,
    tool_data: Dict[str, Any] | None,
    history: List[Dict[str, str]] | None,
) -> str:
    sections = [f"INTENT: {intent}"]
    if history:
        history_text = "\n".join(f"{m['role']}: {m['content']}" for m in history)
        sections.append(f"HISTORY:\n{history_text}")
    if tool_data is not None:
        sections.append(f"TOOL_DATA:\n{tool_data}")
    sections.append(f"USER_MESSAGE:\n{message}")
    return "\n\n".join(sections)
