from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship

from ..database import Base


CONVERSATION_KEY_TYPE = String().with_variant(PGUUID(as_uuid=False), "postgresql")
MESSAGE_KEY_TYPE = String().with_variant(PGUUID(as_uuid=False), "postgresql")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(CONVERSATION_KEY_TYPE, primary_key=True, index=True)
    family = Column(String, nullable=False, index=True, default="ai")
    app = Column(String, nullable=False, index=True, default="institution")
    title = Column(String, nullable=False, default="New conversation")
    owner_uid = Column(String, nullable=True, index=True)
    owner_user_id = Column(String, nullable=True)
    workspace_kind = Column(String, nullable=True, index=True)
    workspace_settings_json = Column(JSON, nullable=False, default=dict)
    is_archived = Column(Boolean, nullable=False, index=True, default=False)
    archived_at = Column(DateTime, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    share_links = relationship("ShareLink", back_populates="conversation", cascade="all, delete-orphan")
    notebook_items = relationship("NotebookItem", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(MESSAGE_KEY_TYPE, primary_key=True, index=True)
    conversation_id = Column(CONVERSATION_KEY_TYPE, ForeignKey("conversations.id"), nullable=False, index=True)
    role = Column(String, nullable=False, index=True)
    content = Column(Text, nullable=False)
    citations_json = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    conversation = relationship("Conversation", back_populates="messages")
    message_sources = relationship("MessageSource", back_populates="message", cascade="all, delete-orphan")
    share_link_messages = relationship("ShareLinkMessage", back_populates="message", cascade="all, delete-orphan")


class Source(Base):
    __tablename__ = "sources"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    domain = Column(String, nullable=False, index=True)
    url = Column(String, nullable=True)
    snippet = Column(Text, nullable=True)
    provider = Column(String, nullable=True)
    type = Column(String, nullable=True)
    published_at = Column(String, nullable=True)
    favicon_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    message_sources = relationship("MessageSource", back_populates="source", cascade="all, delete-orphan")


class MessageSource(Base):
    __tablename__ = "message_sources"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(MESSAGE_KEY_TYPE, ForeignKey("messages.id"), nullable=False, index=True)
    source_id = Column(String, ForeignKey("sources.id"), nullable=False, index=True)
    citation_id = Column(String, nullable=True, index=True)
    label = Column(String, nullable=True)
    position = Column(Integer, nullable=False, default=0)

    message = relationship("Message", back_populates="message_sources")
    source = relationship("Source", back_populates="message_sources")


class ShareLink(Base):
    __tablename__ = "share_links"

    id = Column(String, primary_key=True, index=True)
    conversation_id = Column(CONVERSATION_KEY_TYPE, ForeignKey("conversations.id"), nullable=False, index=True)
    visibility = Column(String, nullable=False, default="unlisted")
    access_level = Column(String, nullable=False, default="anyone-with-link")
    invited_emails_json = Column(JSON, nullable=False, default=list)
    subgroup_id = Column(Integer, nullable=True, index=True)
    subgroup_name = Column(String, nullable=True)
    allow_continue_chat = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)

    conversation = relationship("Conversation", back_populates="share_links")
    share_link_messages = relationship("ShareLinkMessage", back_populates="share_link", cascade="all, delete-orphan")


class ShareLinkMessage(Base):
    __tablename__ = "share_link_messages"

    id = Column(Integer, primary_key=True, index=True)
    share_link_id = Column(String, ForeignKey("share_links.id"), nullable=False, index=True)
    message_id = Column(MESSAGE_KEY_TYPE, ForeignKey("messages.id"), nullable=False, index=True)
    position = Column(Integer, nullable=False, default=0)

    share_link = relationship("ShareLink", back_populates="share_link_messages")
    message = relationship("Message", back_populates="share_link_messages")


class NotebookItem(Base):
    __tablename__ = "notebook_items"

    id = Column(String, primary_key=True, index=True)
    conversation_id = Column(CONVERSATION_KEY_TYPE, ForeignKey("conversations.id"), nullable=False, index=True)
    owner_uid = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False, default="Untitled Note")
    content = Column(Text, nullable=False, default="")
    is_archived = Column(Boolean, nullable=False, index=True, default=False)
    archived_at = Column(DateTime, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    conversation = relationship("Conversation", back_populates="notebook_items")
