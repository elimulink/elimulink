from __future__ import annotations

from typing import Dict, List

from ..repositories.chat_repository import list_session_messages


def get_recent_history(db, session_id: str, limit: int = 6) -> List[Dict[str, str]]:
    messages = list_session_messages(db, session_id, limit=limit)
    return [{"role": m.role, "content": m.content} for m in messages]
