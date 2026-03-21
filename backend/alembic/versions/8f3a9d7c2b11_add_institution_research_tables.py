"""add institution research tables

Revision ID: 8f3a9d7c2b11
Revises: 97feb81885e2
Create Date: 2026-03-21 15:10:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "8f3a9d7c2b11"
down_revision = "97feb81885e2"
branch_labels = None
depends_on = None


def _table_exists(inspector: sa.Inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names()


def _column_names(inspector: sa.Inspector, table_name: str) -> set[str]:
    if not _table_exists(inspector, table_name):
        return set()
    return {column["name"] for column in inspector.get_columns(table_name)}


def _index_names(inspector: sa.Inspector, table_name: str) -> set[str]:
    if not _table_exists(inspector, table_name):
        return set()
    return {index["name"] for index in inspector.get_indexes(table_name)}


def _add_column_if_missing(
    inspector: sa.Inspector,
    table_name: str,
    column: sa.Column,
) -> None:
    if column.name not in _column_names(inspector, table_name):
        op.add_column(table_name, column)


def _create_index_if_missing(
    inspector: sa.Inspector,
    table_name: str,
    index_name: str,
    columns: list[str],
) -> None:
    if index_name not in _index_names(inspector, table_name):
        op.create_index(index_name, table_name, columns, unique=False)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not _table_exists(inspector, "conversations"):
        op.create_table(
            "conversations",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("family", sa.String(), nullable=False, server_default="ai"),
            sa.Column("app", sa.String(), nullable=False, server_default="institution"),
            sa.Column("title", sa.String(), nullable=False, server_default="New conversation"),
            sa.Column("owner_uid", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.PrimaryKeyConstraint("id"),
        )
        inspector = sa.inspect(bind)
    else:
        _add_column_if_missing(
            inspector,
            "conversations",
            sa.Column("family", sa.String(), nullable=False, server_default="ai"),
        )
        _add_column_if_missing(
            inspector,
            "conversations",
            sa.Column("app", sa.String(), nullable=False, server_default="institution"),
        )
        _add_column_if_missing(
            inspector,
            "conversations",
            sa.Column("title", sa.String(), nullable=False, server_default="New conversation"),
        )
        _add_column_if_missing(
            inspector,
            "conversations",
            sa.Column("owner_uid", sa.String(), nullable=True),
        )
        _add_column_if_missing(
            inspector,
            "conversations",
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        )
        _add_column_if_missing(
            inspector,
            "conversations",
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        )
        inspector = sa.inspect(bind)

    _create_index_if_missing(inspector, "conversations", "ix_conversations_id", ["id"])
    _create_index_if_missing(inspector, "conversations", "ix_conversations_family", ["family"])
    _create_index_if_missing(inspector, "conversations", "ix_conversations_app", ["app"])
    _create_index_if_missing(inspector, "conversations", "ix_conversations_owner_uid", ["owner_uid"])

    if not _table_exists(inspector, "messages"):
        op.create_table(
            "messages",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("conversation_id", sa.String(), nullable=False),
            sa.Column("role", sa.String(), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("citations_json", sa.JSON(), nullable=False, server_default="[]"),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        inspector = sa.inspect(bind)
    _create_index_if_missing(inspector, "messages", "ix_messages_id", ["id"])
    _create_index_if_missing(inspector, "messages", "ix_messages_conversation_id", ["conversation_id"])
    _create_index_if_missing(inspector, "messages", "ix_messages_role", ["role"])

    if not _table_exists(inspector, "sources"):
        op.create_table(
            "sources",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("title", sa.String(), nullable=False),
            sa.Column("domain", sa.String(), nullable=False),
            sa.Column("url", sa.String(), nullable=True),
            sa.Column("snippet", sa.Text(), nullable=True),
            sa.Column("provider", sa.String(), nullable=True),
            sa.Column("type", sa.String(), nullable=True),
            sa.Column("published_at", sa.String(), nullable=True),
            sa.Column("favicon_url", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.PrimaryKeyConstraint("id"),
        )
        inspector = sa.inspect(bind)
    _create_index_if_missing(inspector, "sources", "ix_sources_id", ["id"])
    _create_index_if_missing(inspector, "sources", "ix_sources_domain", ["domain"])

    if not _table_exists(inspector, "message_sources"):
        op.create_table(
            "message_sources",
            sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
            sa.Column("message_id", sa.String(), nullable=False),
            sa.Column("source_id", sa.String(), nullable=False),
            sa.Column("citation_id", sa.String(), nullable=True),
            sa.Column("label", sa.String(), nullable=True),
            sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
            sa.ForeignKeyConstraint(["message_id"], ["messages.id"]),
            sa.ForeignKeyConstraint(["source_id"], ["sources.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        inspector = sa.inspect(bind)
    _create_index_if_missing(inspector, "message_sources", "ix_message_sources_id", ["id"])
    _create_index_if_missing(inspector, "message_sources", "ix_message_sources_message_id", ["message_id"])
    _create_index_if_missing(inspector, "message_sources", "ix_message_sources_source_id", ["source_id"])
    _create_index_if_missing(inspector, "message_sources", "ix_message_sources_citation_id", ["citation_id"])

    if not _table_exists(inspector, "share_links"):
        op.create_table(
            "share_links",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("conversation_id", sa.String(), nullable=False),
            sa.Column("visibility", sa.String(), nullable=False, server_default="unlisted"),
            sa.Column("allow_continue_chat", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("expires_at", sa.DateTime(), nullable=True),
            sa.Column("revoked_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        inspector = sa.inspect(bind)
    _create_index_if_missing(inspector, "share_links", "ix_share_links_id", ["id"])
    _create_index_if_missing(inspector, "share_links", "ix_share_links_conversation_id", ["conversation_id"])

    if not _table_exists(inspector, "share_link_messages"):
        op.create_table(
            "share_link_messages",
            sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
            sa.Column("share_link_id", sa.String(), nullable=False),
            sa.Column("message_id", sa.String(), nullable=False),
            sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
            sa.ForeignKeyConstraint(["share_link_id"], ["share_links.id"]),
            sa.ForeignKeyConstraint(["message_id"], ["messages.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        inspector = sa.inspect(bind)
    _create_index_if_missing(inspector, "share_link_messages", "ix_share_link_messages_id", ["id"])
    _create_index_if_missing(inspector, "share_link_messages", "ix_share_link_messages_share_link_id", ["share_link_id"])
    _create_index_if_missing(inspector, "share_link_messages", "ix_share_link_messages_message_id", ["message_id"])


def downgrade() -> None:
    op.drop_index("ix_share_link_messages_message_id", table_name="share_link_messages")
    op.drop_index("ix_share_link_messages_share_link_id", table_name="share_link_messages")
    op.drop_index("ix_share_link_messages_id", table_name="share_link_messages")
    op.drop_table("share_link_messages")

    op.drop_index("ix_share_links_conversation_id", table_name="share_links")
    op.drop_index("ix_share_links_id", table_name="share_links")
    op.drop_table("share_links")

    op.drop_index("ix_message_sources_citation_id", table_name="message_sources")
    op.drop_index("ix_message_sources_source_id", table_name="message_sources")
    op.drop_index("ix_message_sources_message_id", table_name="message_sources")
    op.drop_index("ix_message_sources_id", table_name="message_sources")
    op.drop_table("message_sources")

    op.drop_index("ix_sources_domain", table_name="sources")
    op.drop_index("ix_sources_id", table_name="sources")
    op.drop_table("sources")

    op.drop_index("ix_messages_role", table_name="messages")
    op.drop_index("ix_messages_conversation_id", table_name="messages")
    op.drop_index("ix_messages_id", table_name="messages")
    op.drop_table("messages")

    op.drop_index("ix_conversations_owner_uid", table_name="conversations")
    op.drop_index("ix_conversations_app", table_name="conversations")
    op.drop_index("ix_conversations_family", table_name="conversations")
    op.drop_index("ix_conversations_id", table_name="conversations")
    op.drop_table("conversations")
