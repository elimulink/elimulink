from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Literal
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, selectinload

from ..database import SessionLocal
from ..models.research import Conversation, Message, MessageSource, ShareLink, ShareLinkMessage, Source

router = APIRouter(prefix="/api/v1/ai/institution", tags=["institution-research-features"])


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime | None) -> str | None:
    if not dt:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc).isoformat()
    return dt.isoformat()


def make_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


def ok(payload: dict[str, Any]) -> dict[str, Any]:
    return {"ok": True, **payload}


def fail(status_code: int, code: str, message: str) -> None:
    raise HTTPException(
        status_code=status_code,
        detail={"ok": False, "error": {"code": code, "message": message}},
    )


def serialize_source(source: Source) -> dict[str, Any]:
    return {
        "id": source.id,
        "title": source.title,
        "domain": source.domain,
        "url": source.url,
        "snippet": source.snippet,
        "provider": source.provider,
        "type": source.type,
        "published_at": source.published_at,
        "favicon_url": source.favicon_url,
    }


def serialize_message(message: Message) -> dict[str, Any]:
    ordered_links = sorted(message.message_sources, key=lambda item: item.position)
    sources = [serialize_source(link.source) for link in ordered_links]
    citations = list(message.citations_json or [])
    return {
        "id": message.id,
        "conversation_id": message.conversation_id,
        "role": message.role,
        "content": message.content,
        "created_at": iso(message.created_at),
        "citations": citations,
        "sources": sources,
    }


def get_conversation_or_404(db: Session, conversation_id: str) -> Conversation:
    conversation = (
        db.query(Conversation)
        .options(
            selectinload(Conversation.messages)
            .selectinload(Message.message_sources)
            .selectinload(MessageSource.source)
        )
        .filter(Conversation.id == conversation_id, Conversation.family == "ai", Conversation.app == "institution")
        .first()
    )
    if not conversation:
        fail(404, "NOT_FOUND", "Conversation not found.")
    return conversation


def get_message_or_404(db: Session, message_id: str) -> Message:
    message = (
        db.query(Message)
        .options(selectinload(Message.message_sources).selectinload(MessageSource.source))
        .filter(Message.id == message_id)
        .first()
    )
    if not message:
        fail(404, "MESSAGE_NOT_FOUND", "Message not found.")
    return message


def get_share_or_404(db: Session, share_id: str) -> ShareLink:
    share = (
        db.query(ShareLink)
        .options(selectinload(ShareLink.share_link_messages).selectinload(ShareLinkMessage.message))
        .filter(ShareLink.id == share_id)
        .first()
    )
    if not share:
        fail(404, "NOT_FOUND", "Share link not found.")
    if share.revoked_at:
        fail(410, "EXPIRED_SHARE_LINK", "Share link has been revoked.")
    if share.expires_at and share.expires_at.replace(tzinfo=timezone.utc) < now_utc():
        fail(410, "EXPIRED_SHARE_LINK", "Share link has expired.")
    return share


def normalize_source_payload(source: dict[str, Any], index: int) -> dict[str, Any]:
    return {
        "id": str(source.get("id") or make_id("src")),
        "title": str(source.get("title") or source.get("label") or f"Source {index + 1}"),
        "domain": str(source.get("domain") or source.get("provider") or ""),
        "url": source.get("url") or source.get("link") or source.get("href"),
        "snippet": source.get("snippet") or source.get("text") or source.get("summary") or source.get("description"),
        "provider": source.get("provider"),
        "type": source.get("type"),
        "published_at": source.get("published_at"),
        "favicon_url": source.get("favicon_url"),
    }


def persist_sources_for_message(
    db: Session,
    message: Message,
    citations: list[dict[str, Any]],
    sources: list[dict[str, Any]],
) -> None:
    for index, source_payload in enumerate(sources):
        normalized = normalize_source_payload(source_payload, index)
        source = db.query(Source).filter(Source.id == normalized["id"]).first()
        if not source:
            source = Source(id=normalized["id"])
            db.add(source)
        source.title = normalized["title"]
        source.domain = normalized["domain"]
        source.url = normalized["url"]
        source.snippet = normalized["snippet"]
        source.provider = normalized["provider"]
        source.type = normalized["type"]
        source.published_at = normalized["published_at"]
        source.favicon_url = normalized["favicon_url"]
        db.flush()

        citation = citations[index] if index < len(citations) else {}
        db.add(
            MessageSource(
                message_id=message.id,
                source_id=source.id,
                citation_id=str(citation.get("id") or make_id("cit")),
                label=str(citation.get("label") or normalized["title"]),
                position=int(citation.get("position") if citation.get("position") is not None else index),
            )
        )


def create_demo_assistant_answer(user_content: str) -> tuple[str, list[dict[str, Any]], list[dict[str, Any]]]:
    src1_id = make_id("src")
    src2_id = make_id("src")
    source1 = {
        "id": src1_id,
        "title": "Guardian Jet",
        "domain": "guardianjet.com",
        "url": "https://guardianjet.com/",
        "snippet": "Market pricing and aircraft listing summary.",
        "provider": "web",
        "type": "article",
        "published_at": iso(now_utc()),
        "favicon_url": None,
    }
    source2 = {
        "id": src2_id,
        "title": "Mercury Jets",
        "domain": "mercuryjets.com",
        "url": "https://www.mercuryjets.com/",
        "snippet": "Charter pricing guide and route references.",
        "provider": "web",
        "type": "pricing-page",
        "published_at": iso(now_utc()),
        "favicon_url": None,
    }
    citations = [
        {"id": make_id("cit"), "source_id": src1_id, "label": "Guardian Jet", "position": 0},
        {"id": make_id("cit"), "source_id": src2_id, "label": "Mercury Jets", "position": 1},
    ]
    answer = (
        f"You asked: {user_content}\n\n"
        "Here is a source-backed answer. Use chartering or pricing references as a starting point."
    )
    return answer, citations, [source1, source2]


Visibility = Literal["unlisted", "internal"]


class SourceOut(BaseModel):
    id: str
    title: str
    domain: str
    url: str | None = None
    snippet: str | None = None
    provider: str | None = None
    type: str | None = None
    published_at: str | None = None
    favicon_url: str | None = None


class CitationOut(BaseModel):
    id: str
    source_id: str | None = None
    label: str
    position: int = 0


class CreateConversationRequest(BaseModel):
    title: str = "New conversation"
    owner_uid: str | None = None


class CreateMessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=12000)
    assistant_content: str | None = None
    citations: list[CitationOut] = Field(default_factory=list)
    sources: list[SourceOut] = Field(default_factory=list)


class CreateShareLinkRequest(BaseModel):
    conversation_id: str
    message_ids: list[str] | None = None
    visibility: Visibility = "unlisted"
    allow_continue_chat: bool = True
    expires_in_days: int | None = 30


@router.post("/conversations")
def create_conversation(body: CreateConversationRequest) -> dict[str, Any]:
    with SessionLocal() as db:
        conversation = Conversation(
            id=make_id("conv"),
            family="ai",
            app="institution",
            title=body.title,
            owner_uid=body.owner_uid,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        return ok(
            {
                "conversation": {
                    "id": conversation.id,
                    "family": conversation.family,
                    "app": conversation.app,
                    "title": conversation.title,
                    "created_at": iso(conversation.created_at),
                    "updated_at": iso(conversation.updated_at),
                }
            }
        )


@router.get("/conversations/{conversation_id}")
def get_conversation(conversation_id: str) -> dict[str, Any]:
    with SessionLocal() as db:
        conversation = get_conversation_or_404(db, conversation_id)
        ordered_messages = sorted(conversation.messages, key=lambda msg: msg.created_at)
        return ok(
            {
                "conversation": {
                    "id": conversation.id,
                    "family": conversation.family,
                    "app": conversation.app,
                    "title": conversation.title,
                    "created_at": iso(conversation.created_at),
                    "updated_at": iso(conversation.updated_at),
                },
                "messages": [serialize_message(message) for message in ordered_messages],
            }
        )


@router.post("/conversations/{conversation_id}/messages")
def create_message(conversation_id: str, body: CreateMessageRequest) -> dict[str, Any]:
    with SessionLocal() as db:
        conversation = get_conversation_or_404(db, conversation_id)
        user_message = Message(
            id=make_id("msg"),
            conversation_id=conversation.id,
            role="user",
            content=body.content,
            citations_json=[],
            created_at=datetime.utcnow(),
        )
        db.add(user_message)

        assistant_content = body.assistant_content
        citations = [citation.model_dump() for citation in body.citations]
        sources = [source.model_dump() for source in body.sources]
        if not assistant_content:
            assistant_content, citations, sources = create_demo_assistant_answer(body.content)

        assistant_message = Message(
            id=make_id("msg"),
            conversation_id=conversation.id,
            role="assistant",
            content=assistant_content,
            citations_json=citations,
            created_at=datetime.utcnow(),
        )
        db.add(assistant_message)
        db.flush()

        persist_sources_for_message(db, assistant_message, citations, sources)
        conversation.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user_message)
        db.refresh(assistant_message)
        assistant_message = get_message_or_404(db, assistant_message.id)

        return ok(
            {
                "conversation": {
                    "id": conversation.id,
                    "family": conversation.family,
                    "app": conversation.app,
                    "title": conversation.title,
                    "created_at": iso(conversation.created_at),
                    "updated_at": iso(conversation.updated_at),
                },
                "user_message": serialize_message(user_message),
                "assistant_message": serialize_message(assistant_message),
            }
        )


@router.get("/messages/{message_id}/sources")
def get_message_sources(message_id: str) -> dict[str, Any]:
    with SessionLocal() as db:
        message = get_message_or_404(db, message_id)
        payload = serialize_message(message)
        return ok({"message_id": message_id, "citations": payload["citations"], "sources": payload["sources"]})


@router.get("/sources/{source_id}")
def get_source(source_id: str) -> dict[str, Any]:
    with SessionLocal() as db:
        source = db.query(Source).filter(Source.id == source_id).first()
        if not source:
            fail(404, "SOURCE_NOT_FOUND", "Source not found.")
        return ok({"source": serialize_source(source)})


@router.post("/share-links")
def create_share_link(
    body: CreateShareLinkRequest,
    base_url: str = Query(default="https://institution.elimulink.co.ke"),
) -> dict[str, Any]:
    with SessionLocal() as db:
        conversation = get_conversation_or_404(db, body.conversation_id)
        available_ids = {message.id for message in conversation.messages}
        message_ids = body.message_ids or [message.id for message in sorted(conversation.messages, key=lambda item: item.created_at)]
        for message_id in message_ids:
            if message_id not in available_ids:
                fail(400, "INVALID_REQUEST", f"Message {message_id} does not belong to the conversation.")

        share_link = ShareLink(
            id=make_id("shr"),
            conversation_id=conversation.id,
            visibility=body.visibility,
            allow_continue_chat=body.allow_continue_chat,
            created_at=datetime.utcnow(),
            expires_at=(datetime.utcnow() + timedelta(days=body.expires_in_days)) if body.expires_in_days else None,
            revoked_at=None,
        )
        db.add(share_link)
        db.flush()

        for index, message_id in enumerate(message_ids):
            db.add(ShareLinkMessage(share_link_id=share_link.id, message_id=message_id, position=index))

        db.commit()
        db.refresh(share_link)
        url = f"{base_url.rstrip('/')}/shared/{share_link.id}"
        return ok(
            {
                "share_link": {
                    "id": share_link.id,
                    "conversation_id": conversation.id,
                    "url": url,
                    "visibility": share_link.visibility,
                    "allow_continue_chat": share_link.allow_continue_chat,
                    "created_at": iso(share_link.created_at),
                    "expires_at": iso(share_link.expires_at),
                }
            }
        )


@router.get("/share-links/{share_id}")
def get_share_link(share_id: str) -> dict[str, Any]:
    with SessionLocal() as db:
        share = get_share_or_404(db, share_id)
        conversation = get_conversation_or_404(db, share.conversation_id)
        link_rows = (
            db.query(ShareLinkMessage)
            .options(selectinload(ShareLinkMessage.message).selectinload(Message.message_sources).selectinload(MessageSource.source))
            .filter(ShareLinkMessage.share_link_id == share.id)
            .order_by(ShareLinkMessage.position.asc())
            .all()
        )
        return ok(
            {
                "share_link": {
                    "id": share.id,
                    "visibility": share.visibility,
                    "allow_continue_chat": share.allow_continue_chat,
                    "created_at": iso(share.created_at),
                    "expires_at": iso(share.expires_at),
                },
                "conversation": {
                    "id": conversation.id,
                    "title": conversation.title,
                    "messages": [serialize_message(link.message) for link in link_rows],
                },
            }
        )


@router.delete("/share-links/{share_id}")
def delete_share_link(share_id: str) -> dict[str, Any]:
    with SessionLocal() as db:
        share = db.query(ShareLink).filter(ShareLink.id == share_id).first()
        if not share:
            fail(404, "NOT_FOUND", "Share link not found.")
        share.revoked_at = datetime.utcnow()
        db.commit()
        return ok({})
