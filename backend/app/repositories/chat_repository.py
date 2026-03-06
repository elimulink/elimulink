from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from ..models.chat import ChatMessage, ChatSession


def get_session(db: Session, session_id: str) -> Optional[ChatSession]:
    return db.query(ChatSession).filter(ChatSession.id == session_id).first()


def create_session(
    db: Session,
    session_id: str,
    user_id: str,
    app_type: str,
    tenant_id: Optional[str],
    title: Optional[str] = None,
) -> ChatSession:
    session = ChatSession(
        id=session_id,
        user_id=user_id,
        tenant_id=tenant_id,
        app_type=app_type,
        title=title,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def save_message(
    db: Session,
    session_id: str,
    role: str,
    content: str,
    intent: Optional[str] = None,
    tool_used: Optional[str] = None,
    latency_ms: Optional[int] = None,
) -> ChatMessage:
    message = ChatMessage(
        session_id=session_id,
        role=role,
        content=content,
        intent=intent,
        tool_used=tool_used,
        latency_ms=latency_ms,
        created_at=datetime.utcnow(),
    )
    db.add(message)
    session = get_session(db, session_id)
    if session:
        session.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(message)
    return message


def list_session_messages(db: Session, session_id: str, limit: int = 10) -> list[ChatMessage]:
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.id.desc())
        .limit(limit)
        .all()[::-1]
    )
