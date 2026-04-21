from __future__ import annotations

from typing import Any, Dict, List

from ..repositories.chat_repository import list_session_messages


def get_recent_history(
    db,
    session_id: str,
    limit: int = 6,
    request_metadata: Dict[str, Any] | None = None,
) -> List[Dict[str, str]]:
    meta = request_metadata or {}
    if bool(meta.get("newTopic")):
        return []

    effective_limit = limit
    if bool(meta.get("followUp")):
        effective_limit = 4

    messages = list_session_messages(db, session_id, limit=effective_limit)
    return [{"role": m.role, "content": m.content} for m in messages]
