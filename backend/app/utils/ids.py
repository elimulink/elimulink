from __future__ import annotations

import uuid


def new_session_id() -> str:
    return f"session-{uuid.uuid4().hex}"
