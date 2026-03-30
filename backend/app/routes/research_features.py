from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any, Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, selectinload

from ..auth import CurrentUser, get_current_user
from ..database import SessionLocal, engine
from ..models.research import Conversation, Message, MessageSource, NotebookItem, ShareLink, ShareLinkMessage, Source
from ..models.user import Group, GroupMember
from ..services.research_schema import ensure_institution_research_schema

router = APIRouter(prefix="/api/v1/ai/institution", tags=["institution-research-features"])

WORKSPACE_KIND_NOTEBOOK = "notebook_workspace"
DEFAULT_NOTEBOOK_WORKSPACE_SETTINGS = {
    "instructions": "",
    "visibility": "institution",
    "permissions": "members-can-view",
    "linked_institution": "ElimuLink University",
    "linked_subgroup": "Not linked",
    "linked_subgroup_id": None,
    "linked_subgroup_label": "",
    "memory_behavior": "workspace-default",
    "project_archived": False,
    "project_archived_at": None,
}


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


def make_conversation_id() -> str:
    return str(uuid4())


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


def serialize_conversation_summary(conversation: Conversation) -> dict[str, Any]:
    return {
        "id": conversation.id,
        "family": conversation.family,
        "app": conversation.app,
        "title": conversation.title,
        "is_archived": bool(conversation.is_archived),
        "archived_at": iso(conversation.archived_at),
        "created_at": iso(conversation.created_at),
        "updated_at": iso(conversation.updated_at),
    }


def normalize_email_list(values: list[str] | None) -> list[str]:
    seen: set[str] = set()
    normalized: list[str] = []
    for value in values or []:
        email = str(value or "").strip().lower()
        if not email or "@" not in email or email in seen:
            continue
        seen.add(email)
        normalized.append(email)
    return normalized


def conversation_workspace_settings(conversation: Conversation) -> dict[str, Any]:
    current = dict(DEFAULT_NOTEBOOK_WORKSPACE_SETTINGS)
    current.update(dict(conversation.workspace_settings_json or {}))
    return current


def serialize_share_link(share_link: ShareLink, base_url: str) -> dict[str, Any]:
    return {
        "id": share_link.id,
        "conversation_id": share_link.conversation_id,
        "url": f"{base_url.rstrip('/')}/shared/{share_link.id}",
        "visibility": share_link.visibility,
        "access_level": share_link.access_level or "anyone-with-link",
        "invited_emails": normalize_email_list(list(share_link.invited_emails_json or [])),
        "subgroup_id": share_link.subgroup_id,
        "subgroup_name": share_link.subgroup_name,
        "allow_continue_chat": share_link.allow_continue_chat,
        "created_at": iso(share_link.created_at),
        "expires_at": iso(share_link.expires_at),
    }


def serialize_share_link_list_item(share_link: ShareLink, base_url: str) -> dict[str, Any]:
    conversation = share_link.conversation
    return {
        "id": share_link.id,
        "conversation_id": share_link.conversation_id,
        "title": (conversation.title if conversation else None) or "Shared conversation",
        "type": "Conversation",
        "url": f"{base_url.rstrip('/')}/shared/{share_link.id}",
        "visibility": share_link.visibility,
        "access_level": share_link.access_level or "anyone-with-link",
        "subgroup_id": share_link.subgroup_id,
        "subgroup_name": share_link.subgroup_name,
        "created_at": iso(share_link.created_at),
        "updated_at": iso((conversation.updated_at if conversation else None) or share_link.created_at),
        "expires_at": iso(share_link.expires_at),
    }


def serialize_notebook_workspace(
    conversation: Conversation,
    *,
    base_url: str,
    share_link: ShareLink | None = None,
) -> dict[str, Any]:
    settings = conversation_workspace_settings(conversation)
    return {
        "conversation_id": conversation.id,
        "title": conversation.title or "ElimuLink Notebook",
        "workspace_kind": conversation.workspace_kind,
        "updated_at": iso(conversation.updated_at),
        "settings": settings,
        "share_link": serialize_share_link(share_link, base_url) if share_link else None,
    }


def build_notebook_item_preview(content: str | None) -> str:
    text = " ".join(str(content or "").split()).strip()
    if not text:
        return "Open this note to continue writing."
    return text[:160]


def serialize_notebook_item_summary(item: NotebookItem) -> dict[str, Any]:
    return {
        "id": item.id,
        "conversation_id": item.conversation_id,
        "title": item.title or "Untitled Note",
        "preview": build_notebook_item_preview(item.content),
        "is_archived": bool(item.is_archived),
        "archived_at": iso(item.archived_at),
        "created_at": iso(item.created_at),
        "updated_at": iso(item.updated_at),
    }


def serialize_notebook_item(item: NotebookItem) -> dict[str, Any]:
    payload = serialize_notebook_item_summary(item)
    payload["content"] = item.content or ""
    return payload


def build_conversation_preview(conversation: Conversation) -> str:
    ordered_messages = sorted(conversation.messages, key=lambda msg: msg.created_at or datetime.min)
    for message in reversed(ordered_messages):
        content = str(message.content or "").strip()
        if content:
            return content[:160]
    return "Conversation preview unavailable."


def serialize_archived_conversation(conversation: Conversation) -> dict[str, Any]:
    return {
        "id": conversation.id,
        "conversation_id": conversation.id,
        "title": conversation.title or "Archived conversation",
        "preview": build_conversation_preview(conversation),
        "archived_at": iso(conversation.archived_at or conversation.updated_at or conversation.created_at),
        "updated_at": iso(conversation.updated_at),
    }


def get_owned_chat_conversations_query(db: Session, user: CurrentUser):
    return db.query(Conversation).filter(
        Conversation.family == "ai",
        Conversation.app == "institution",
        Conversation.owner_uid == user.uid,
        Conversation.workspace_kind.is_(None),
    )


def serialize_export_conversation(conversation: Conversation, base_url: str) -> dict[str, Any]:
    ordered_messages = sorted(conversation.messages, key=lambda item: item.created_at or datetime.min)
    active_share_links = [
        share
        for share in conversation.share_links
        if not share.revoked_at and (not share.expires_at or share.expires_at.replace(tzinfo=timezone.utc) >= now_utc())
    ]
    return {
        "id": conversation.id,
        "title": conversation.title or "Conversation",
        "is_archived": bool(conversation.is_archived),
        "archived_at": iso(conversation.archived_at),
        "created_at": iso(conversation.created_at),
        "updated_at": iso(conversation.updated_at),
        "messages": [serialize_message(message) for message in ordered_messages],
        "share_links": [serialize_share_link(share, base_url) for share in active_share_links],
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


def get_owned_conversation_or_404(db: Session, conversation_id: str, user: CurrentUser) -> Conversation:
    conversation = (
        db.query(Conversation)
        .options(
            selectinload(Conversation.messages)
            .selectinload(Message.message_sources)
            .selectinload(MessageSource.source)
        )
        .filter(
            Conversation.id == conversation_id,
            Conversation.family == "ai",
            Conversation.app == "institution",
            Conversation.owner_uid == user.uid,
        )
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


def get_owned_share_or_404(db: Session, share_id: str, user: CurrentUser) -> ShareLink:
    share = get_share_or_404(db, share_id)
    conversation = (
        db.query(Conversation)
        .filter(
            Conversation.id == share.conversation_id,
            Conversation.family == "ai",
            Conversation.app == "institution",
            Conversation.owner_uid == user.uid,
        )
        .first()
    )
    if not conversation:
        fail(404, "NOT_FOUND", "Share link not found.")
    return share


def get_optional_current_user(
    request: Request,
    authorization: str | None = Header(default=None),
) -> CurrentUser | None:
    if not authorization:
        return None
    try:
        return get_current_user(request, authorization)
    except HTTPException:
        return None


def resolve_group_by_id(db: Session, group_id: int | None) -> Group | None:
    if not group_id:
        return None
    return db.query(Group).filter(Group.id == group_id).first()


def resolve_group_by_name(db: Session, name: str | None) -> Group | None:
    normalized = str(name or "").strip()
    if not normalized or normalized.lower() == "not linked":
        return None
    return db.query(Group).filter(Group.name == normalized).first()


def resolve_workspace_group(
    db: Session,
    *,
    subgroup_id: int | None = None,
    subgroup_name: str | None = None,
) -> Group | None:
    group = resolve_group_by_id(db, subgroup_id)
    if group:
        return group
    return resolve_group_by_name(db, subgroup_name)


def ensure_workspace_group_or_fail(
    db: Session,
    *,
    subgroup_id: int | None = None,
    subgroup_name: str | None = None,
) -> Group:
    group = resolve_workspace_group(db, subgroup_id=subgroup_id, subgroup_name=subgroup_name)
    if not group:
        fail(400, "INVALID_SUBGROUP", "Select a valid subgroup before enabling subgroup-only access.")
    return group


def user_is_group_member(db: Session, *, group_id: int, user_id: str) -> bool:
    return (
        db.query(GroupMember)
        .filter(GroupMember.group_id == group_id, GroupMember.user_id == user_id)
        .first()
        is not None
    )


def resolve_share_access(db: Session, share: ShareLink, conversation: Conversation, user: CurrentUser | None) -> None:
    access_level = str(share.access_level or "anyone-with-link")
    if access_level == "anyone-with-link":
        return

    if not user:
        fail(401, "AUTH_REQUIRED", "This share link requires sign-in.")

    invited = set(normalize_email_list(list(share.invited_emails_json or [])))
    current_email = str(user.email or "").strip().lower()
    is_owner = conversation.owner_uid == user.uid
    is_invited = bool(current_email and current_email in invited)

    if access_level == "only-invited":
        if is_owner or is_invited:
            return
        fail(403, "FORBIDDEN", "Only invited members can open this share link.")

    if access_level == "institution-only":
        return

    if access_level == "subgroup-only":
        if is_owner:
            return
        if not share.subgroup_id:
            fail(403, "FORBIDDEN", "This share link is missing a valid subgroup binding.")
        group = resolve_group_by_id(db, share.subgroup_id)
        if not group:
            fail(403, "FORBIDDEN", "This share link points to a subgroup that no longer exists.")
        if user_is_group_member(db, group_id=group.id, user_id=user.uid):
            return
        fail(403, "FORBIDDEN", "Only members of the linked subgroup can open this share link.")


def get_latest_active_share_link(db: Session, conversation_id: str) -> ShareLink | None:
    return (
        db.query(ShareLink)
        .filter(
            ShareLink.conversation_id == conversation_id,
            ShareLink.revoked_at.is_(None),
        )
        .order_by(ShareLink.created_at.desc())
        .first()
    )


def get_or_create_notebook_workspace(db: Session, user: CurrentUser) -> Conversation:
    conversation = (
        db.query(Conversation)
        .filter(
            Conversation.family == "ai",
            Conversation.app == "institution",
            Conversation.owner_uid == user.uid,
            Conversation.workspace_kind == WORKSPACE_KIND_NOTEBOOK,
        )
        .order_by(Conversation.updated_at.desc())
        .first()
    )
    if conversation:
        if conversation.workspace_settings_json is None:
            conversation.workspace_settings_json = dict(DEFAULT_NOTEBOOK_WORKSPACE_SETTINGS)
            conversation.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(conversation)
        return conversation

    conversation = Conversation(
        id=make_conversation_id(),
        family="ai",
        app="institution",
        title="ElimuLink Notebook",
        owner_uid=user.uid,
        workspace_kind=WORKSPACE_KIND_NOTEBOOK,
        workspace_settings_json=dict(DEFAULT_NOTEBOOK_WORKSPACE_SETTINGS),
        is_archived=False,
        archived_at=None,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


def get_owned_notebook_item_or_404(db: Session, item_id: str, user: CurrentUser) -> NotebookItem:
    item = (
        db.query(NotebookItem)
        .join(Conversation, NotebookItem.conversation_id == Conversation.id)
        .filter(
            NotebookItem.id == item_id,
            NotebookItem.owner_uid == user.uid,
            Conversation.family == "ai",
            Conversation.app == "institution",
            Conversation.workspace_kind == WORKSPACE_KIND_NOTEBOOK,
            Conversation.owner_uid == user.uid,
        )
        .first()
    )
    if not item:
        fail(404, "NOTEBOOK_ITEM_NOT_FOUND", "Notebook item not found.")
    return item


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
ShareAccessLevel = Literal["only-invited", "anyone-with-link", "institution-only", "subgroup-only"]


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
    access_level: ShareAccessLevel = "anyone-with-link"
    invited_emails: list[str] = Field(default_factory=list)
    subgroup_id: int | None = None
    subgroup_name: str | None = None
    allow_continue_chat: bool = True
    expires_in_days: int | None = 30


class UpdateShareLinkRequest(BaseModel):
    access_level: ShareAccessLevel | None = None
    invited_emails: list[str] | None = None
    subgroup_id: int | None = None
    subgroup_name: str | None = None


class UpdateNotebookWorkspaceRequest(BaseModel):
    title: str | None = None
    instructions: str | None = None
    visibility: str | None = None
    permissions: str | None = None
    linked_institution: str | None = None
    linked_subgroup: str | None = None
    linked_subgroup_id: int | None = None
    memory_behavior: str | None = None
    project_archived: bool | None = None


class CreateNotebookItemRequest(BaseModel):
    title: str | None = None
    content: str | None = ""


class UpdateNotebookItemRequest(BaseModel):
    title: str | None = None
    content: str | None = None
    archived: bool | None = None


class ArchiveConversationRequest(BaseModel):
    archived: bool = True


@router.post("/conversations")
def create_conversation(body: CreateConversationRequest) -> dict[str, Any]:
    with SessionLocal() as db:
        conversation = Conversation(
            id=make_conversation_id(),
            family="ai",
            app="institution",
            title=body.title,
            owner_uid=body.owner_uid,
            is_archived=False,
            archived_at=None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        return ok(
            {
                "conversation": serialize_conversation_summary(conversation)
            }
        )


@router.get("/conversations/{conversation_id}")
def get_conversation(conversation_id: str) -> dict[str, Any]:
    with SessionLocal() as db:
        conversation = get_conversation_or_404(db, conversation_id)
        ordered_messages = sorted(conversation.messages, key=lambda msg: msg.created_at)
        return ok(
            {
                "conversation": serialize_conversation_summary(conversation),
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
                "conversation": serialize_conversation_summary(conversation),
                "user_message": serialize_message(user_message),
                "assistant_message": serialize_message(assistant_message),
            }
        )


@router.get("/notebook-workspace")
def get_notebook_workspace(
    base_url: str = Query(default="https://institution.elimulink.co.ke"),
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    ensure_institution_research_schema(engine)
    with SessionLocal() as db:
        conversation = get_or_create_notebook_workspace(db, user)
        share_link = get_latest_active_share_link(db, conversation.id)
        return ok({"workspace": serialize_notebook_workspace(conversation, base_url=base_url, share_link=share_link)})


@router.patch("/notebook-workspace")
def update_notebook_workspace(
    body: UpdateNotebookWorkspaceRequest,
    base_url: str = Query(default="https://institution.elimulink.co.ke"),
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    ensure_institution_research_schema(engine)
    with SessionLocal() as db:
        conversation = get_or_create_notebook_workspace(db, user)
        settings = conversation_workspace_settings(conversation)

        if body.title is not None:
            conversation.title = str(body.title or "").strip() or "ElimuLink Notebook"
        if body.instructions is not None:
            settings["instructions"] = str(body.instructions or "")
        if body.visibility is not None:
            settings["visibility"] = str(body.visibility or "institution")
        if body.permissions is not None:
            settings["permissions"] = str(body.permissions or "members-can-view")
        if body.linked_institution is not None:
            settings["linked_institution"] = str(body.linked_institution or "")
        next_group = None
        requested_subgroup_name = body.linked_subgroup
        requested_subgroup_id = body.linked_subgroup_id
        if requested_subgroup_id is not None or requested_subgroup_name is not None:
            next_group = resolve_workspace_group(
                db,
                subgroup_id=requested_subgroup_id,
                subgroup_name=requested_subgroup_name,
            )
            raw_name = str(requested_subgroup_name or "").strip()
            if raw_name and raw_name.lower() != "not linked" and next_group is None:
                fail(400, "INVALID_SUBGROUP", "Linked subgroup must match an existing subgroup id or exact subgroup name.")
            settings["linked_subgroup_id"] = next_group.id if next_group else None
            settings["linked_subgroup_label"] = next_group.name if next_group else ""
            settings["linked_subgroup"] = next_group.name if next_group else "Not linked"
        if body.memory_behavior is not None:
            settings["memory_behavior"] = str(body.memory_behavior or "workspace-default")
        if body.project_archived is not None:
            settings["project_archived"] = bool(body.project_archived)
            settings["project_archived_at"] = iso(datetime.utcnow()) if body.project_archived else None

        conversation.workspace_settings_json = settings
        conversation.updated_at = datetime.utcnow()
        if requested_subgroup_id is not None or requested_subgroup_name is not None:
            active_share_links = (
                db.query(ShareLink)
                .filter(
                    ShareLink.conversation_id == conversation.id,
                    ShareLink.revoked_at.is_(None),
                    ShareLink.access_level == "subgroup-only",
                )
                .all()
            )
            for share_link in active_share_links:
                share_link.subgroup_id = next_group.id if next_group else None
                share_link.subgroup_name = next_group.name if next_group else None
        db.commit()
        db.refresh(conversation)
        share_link = get_latest_active_share_link(db, conversation.id)
        return ok({"workspace": serialize_notebook_workspace(conversation, base_url=base_url, share_link=share_link)})


@router.delete("/notebook-workspace")
def delete_notebook_workspace(
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    ensure_institution_research_schema(engine)
    with SessionLocal() as db:
        conversation = (
            db.query(Conversation)
            .filter(
                Conversation.family == "ai",
                Conversation.app == "institution",
                Conversation.owner_uid == user.uid,
                Conversation.workspace_kind == WORKSPACE_KIND_NOTEBOOK,
            )
            .order_by(Conversation.updated_at.desc())
            .first()
        )
        if not conversation:
            return ok({"deleted": False, "message": "Notebook workspace was already removed."})
        conversation.title = "ElimuLink Notebook"
        conversation.workspace_settings_json = dict(DEFAULT_NOTEBOOK_WORKSPACE_SETTINGS)
        conversation.updated_at = datetime.utcnow()
        for share_link in list(conversation.share_links):
            db.delete(share_link)
        db.commit()
        return ok(
            {
                "deleted": True,
                "deleted_scope": "workspace-metadata-and-share-links",
                "message": "Notebook workspace metadata and share links deleted. Notebook items were preserved.",
            }
        )


@router.get("/notebook-workspace/items")
def list_notebook_items(
    include_archived: bool = Query(default=False),
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    ensure_institution_research_schema(engine)
    with SessionLocal() as db:
        workspace = get_or_create_notebook_workspace(db, user)
        query = (
            db.query(NotebookItem)
            .filter(
                NotebookItem.conversation_id == workspace.id,
                NotebookItem.owner_uid == user.uid,
            )
            .order_by(NotebookItem.updated_at.desc(), NotebookItem.created_at.desc())
        )
        if not include_archived:
            query = query.filter(NotebookItem.is_archived.is_(False))
        items = query.all()
        return ok({"items": [serialize_notebook_item_summary(item) for item in items]})


@router.post("/notebook-workspace/items")
def create_notebook_item(
    body: CreateNotebookItemRequest,
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    ensure_institution_research_schema(engine)
    with SessionLocal() as db:
        workspace = get_or_create_notebook_workspace(db, user)
        timestamp = datetime.utcnow()
        item = NotebookItem(
            id=make_id("note"),
            conversation_id=workspace.id,
            owner_uid=user.uid,
            title=str(body.title or "").strip() or "Untitled Note",
            content=str(body.content or ""),
            is_archived=False,
            archived_at=None,
            created_at=timestamp,
            updated_at=timestamp,
        )
        workspace.updated_at = timestamp
        db.add(item)
        db.commit()
        db.refresh(item)
        return ok({"item": serialize_notebook_item(item)})


@router.get("/notebook-workspace/items/{item_id}")
def get_notebook_item(
    item_id: str,
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    ensure_institution_research_schema(engine)
    with SessionLocal() as db:
        item = get_owned_notebook_item_or_404(db, item_id, user)
        return ok({"item": serialize_notebook_item(item)})


@router.patch("/notebook-workspace/items/{item_id}")
def update_notebook_item(
    item_id: str,
    body: UpdateNotebookItemRequest,
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    ensure_institution_research_schema(engine)
    with SessionLocal() as db:
        item = get_owned_notebook_item_or_404(db, item_id, user)
        timestamp = datetime.utcnow()
        if body.title is not None:
            item.title = str(body.title or "").strip() or "Untitled Note"
        if body.content is not None:
            item.content = str(body.content or "")
        if body.archived is not None:
            item.is_archived = bool(body.archived)
            item.archived_at = timestamp if item.is_archived else None
        item.updated_at = timestamp
        item.conversation.updated_at = timestamp
        db.commit()
        db.refresh(item)
        return ok({"item": serialize_notebook_item(item)})


@router.delete("/notebook-workspace/items/{item_id}")
def delete_notebook_item(
    item_id: str,
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    ensure_institution_research_schema(engine)
    with SessionLocal() as db:
        item = get_owned_notebook_item_or_404(db, item_id, user)
        deleted_id = item.id
        item.conversation.updated_at = datetime.utcnow()
        db.delete(item)
        db.commit()
        return ok({"deleted": True, "item_id": deleted_id})


@router.get("/archived-chats")
def get_archived_chats(
    limit: int = Query(default=50, ge=1, le=200),
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    ensure_institution_research_schema(engine)
    with SessionLocal() as db:
        conversations = (
            db.query(Conversation)
            .options(
                selectinload(Conversation.messages)
                .selectinload(Message.message_sources)
                .selectinload(MessageSource.source)
            )
            .filter(
                Conversation.family == "ai",
                Conversation.app == "institution",
                Conversation.owner_uid == user.uid,
                Conversation.is_archived.is_(True),
            )
            .order_by(Conversation.archived_at.desc(), Conversation.updated_at.desc())
            .limit(limit)
            .all()
        )
        return ok({"archived_chats": [serialize_archived_conversation(item) for item in conversations]})


@router.patch("/conversations/archive-all")
def archive_all_conversations(
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    ensure_institution_research_schema(engine)
    with SessionLocal() as db:
        conversations = (
            get_owned_chat_conversations_query(db, user)
            .filter(Conversation.is_archived.is_(False))
            .all()
        )
        timestamp = datetime.utcnow()
        archived_ids: list[str] = []
        for conversation in conversations:
            conversation.is_archived = True
            conversation.archived_at = timestamp
            conversation.updated_at = timestamp
            archived_ids.append(conversation.id)
        db.commit()
        return ok({"archived_conversation_ids": archived_ids, "count": len(archived_ids)})


@router.patch("/conversations/{conversation_id}/archive")
def archive_conversation(
    conversation_id: str,
    body: ArchiveConversationRequest | None = None,
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    ensure_institution_research_schema(engine)
    with SessionLocal() as db:
        conversation = get_owned_conversation_or_404(db, conversation_id, user)
        if body and body.archived is False:
            conversation.is_archived = False
            conversation.archived_at = None
        else:
            conversation.is_archived = True
            conversation.archived_at = datetime.utcnow()
        conversation.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(conversation)
        return ok({"conversation": serialize_archived_conversation(conversation)})


@router.delete("/conversations")
def delete_all_conversations(
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    ensure_institution_research_schema(engine)
    with SessionLocal() as db:
        conversations = get_owned_chat_conversations_query(db, user).all()
        deleted_ids = [conversation.id for conversation in conversations]
        for conversation in conversations:
            db.delete(conversation)
        db.commit()
        return ok({"deleted_conversation_ids": deleted_ids, "count": len(deleted_ids)})


@router.patch("/conversations/{conversation_id}/restore")
def restore_conversation(
    conversation_id: str,
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    ensure_institution_research_schema(engine)
    with SessionLocal() as db:
        conversation = get_owned_conversation_or_404(db, conversation_id, user)
        conversation.is_archived = False
        conversation.archived_at = None
        conversation.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(conversation)
        return ok({"conversation": serialize_conversation_summary(conversation)})


@router.get("/export-data")
def export_data(
    base_url: str = Query(default="https://institution.elimulink.co.ke"),
    user: CurrentUser = Depends(get_current_user),
) -> Response:
    ensure_institution_research_schema(engine)
    with SessionLocal() as db:
        conversations = (
            get_owned_chat_conversations_query(db, user)
            .options(
                selectinload(Conversation.messages)
                .selectinload(Message.message_sources)
                .selectinload(MessageSource.source),
                selectinload(Conversation.share_links),
            )
            .order_by(Conversation.updated_at.desc(), Conversation.created_at.desc())
            .all()
        )
        payload = {
            "exported_at": iso(now_utc()),
            "app": "institution",
            "scope": "owned-chat-conversations",
            "conversation_count": len(conversations),
            "conversations": [serialize_export_conversation(conversation, base_url) for conversation in conversations],
        }
        filename = f"elimulink-institution-export-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}.json"
        return Response(
            content=json.dumps(payload),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
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
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    with SessionLocal() as db:
        conversation = get_owned_conversation_or_404(db, body.conversation_id, user)
        workspace_settings = conversation_workspace_settings(conversation)
        available_ids = {message.id for message in conversation.messages}
        message_ids = body.message_ids or [message.id for message in sorted(conversation.messages, key=lambda item: item.created_at)]
        for message_id in message_ids:
            if message_id not in available_ids:
                fail(400, "INVALID_REQUEST", f"Message {message_id} does not belong to the conversation.")

        subgroup_id = body.subgroup_id
        subgroup_name = str(body.subgroup_name or "").strip() or None
        if body.access_level == "subgroup-only":
            group = ensure_workspace_group_or_fail(
                db,
                subgroup_id=subgroup_id if subgroup_id is not None else workspace_settings.get("linked_subgroup_id"),
                subgroup_name=subgroup_name or workspace_settings.get("linked_subgroup_label") or workspace_settings.get("linked_subgroup"),
            )
            subgroup_id = group.id
            subgroup_name = group.name

        share_link = ShareLink(
            id=make_id("shr"),
            conversation_id=conversation.id,
            visibility="unlisted" if body.access_level == "anyone-with-link" else "internal",
            access_level=body.access_level,
            invited_emails_json=normalize_email_list(body.invited_emails),
            subgroup_id=subgroup_id,
            subgroup_name=subgroup_name,
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
        return ok({"share_link": serialize_share_link(share_link, base_url)})


@router.get("/share-links")
def list_share_links(
    base_url: str = Query(default="https://institution.elimulink.co.ke"),
    limit: int = Query(default=100, ge=1, le=200),
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    with SessionLocal() as db:
        shares = (
            db.query(ShareLink)
            .join(Conversation, Conversation.id == ShareLink.conversation_id)
            .options(selectinload(ShareLink.conversation))
            .filter(
                Conversation.family == "ai",
                Conversation.app == "institution",
                Conversation.owner_uid == user.uid,
                ShareLink.revoked_at.is_(None),
            )
            .order_by(ShareLink.created_at.desc())
            .limit(limit)
            .all()
        )
        active_shares = [
            share
            for share in shares
            if not share.expires_at or share.expires_at.replace(tzinfo=timezone.utc) >= now_utc()
        ]
        return ok({"share_links": [serialize_share_link_list_item(share, base_url) for share in active_shares]})


@router.get("/share-links/{share_id}")
def get_share_link(
    share_id: str,
    base_url: str = Query(default="https://institution.elimulink.co.ke"),
    user: CurrentUser | None = Depends(get_optional_current_user),
) -> dict[str, Any]:
    with SessionLocal() as db:
        share = get_share_or_404(db, share_id)
        conversation = get_conversation_or_404(db, share.conversation_id)
        resolve_share_access(db, share, conversation, user)
        link_rows = (
            db.query(ShareLinkMessage)
            .options(selectinload(ShareLinkMessage.message).selectinload(Message.message_sources).selectinload(MessageSource.source))
            .filter(ShareLinkMessage.share_link_id == share.id)
            .order_by(ShareLinkMessage.position.asc())
            .all()
        )
        return ok(
            {
                "share_link": serialize_share_link(share, base_url),
                "conversation": {
                    "id": conversation.id,
                    "title": conversation.title,
                    "messages": [serialize_message(link.message) for link in link_rows],
                },
            }
        )


@router.patch("/share-links/{share_id}")
def update_share_link(
    share_id: str,
    body: UpdateShareLinkRequest,
    base_url: str = Query(default="https://institution.elimulink.co.ke"),
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    with SessionLocal() as db:
        share = get_owned_share_or_404(db, share_id, user)
        conversation = get_owned_conversation_or_404(db, share.conversation_id, user)
        workspace_settings = conversation_workspace_settings(conversation)
        if body.access_level is not None:
            share.access_level = body.access_level
            share.visibility = "unlisted" if body.access_level == "anyone-with-link" else "internal"
        if body.invited_emails is not None:
            share.invited_emails_json = normalize_email_list(body.invited_emails)
        next_subgroup_id = body.subgroup_id if body.subgroup_id is not None else share.subgroup_id
        next_subgroup_name = (
            str(body.subgroup_name or "").strip() or None
            if body.subgroup_name is not None
            else share.subgroup_name
        )
        if share.access_level == "subgroup-only":
            group = ensure_workspace_group_or_fail(
                db,
                subgroup_id=next_subgroup_id if next_subgroup_id is not None else workspace_settings.get("linked_subgroup_id"),
                subgroup_name=next_subgroup_name or workspace_settings.get("linked_subgroup_label") or workspace_settings.get("linked_subgroup"),
            )
            share.subgroup_id = group.id
            share.subgroup_name = group.name
        elif body.subgroup_id is not None or body.subgroup_name is not None:
            group = resolve_workspace_group(db, subgroup_id=next_subgroup_id, subgroup_name=next_subgroup_name)
            share.subgroup_id = group.id if group else None
            share.subgroup_name = group.name if group else None
        db.commit()
        db.refresh(share)
        return ok({"share_link": serialize_share_link(share, base_url)})


@router.delete("/share-links/{share_id}")
def delete_share_link(
    share_id: str,
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    with SessionLocal() as db:
        share = get_owned_share_or_404(db, share_id, user)
        share.revoked_at = datetime.utcnow()
        db.commit()
        return ok({})
