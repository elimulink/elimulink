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
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS family VARCHAR DEFAULT 'ai'")
        op.execute("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS app VARCHAR DEFAULT 'institution'")
        op.execute("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS title VARCHAR DEFAULT 'New conversation'")
        op.execute("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS owner_uid VARCHAR")
        op.execute("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        op.execute("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        op.execute("UPDATE conversations SET family = COALESCE(family, 'ai')")
        op.execute("UPDATE conversations SET app = COALESCE(app, 'institution')")
        op.execute("UPDATE conversations SET title = COALESCE(title, 'New conversation')")
        op.execute("UPDATE conversations SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP)")
        op.execute("UPDATE conversations SET updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)")
        op.execute("CREATE INDEX IF NOT EXISTS ix_conversations_family ON conversations (family)")
        op.execute("CREATE INDEX IF NOT EXISTS ix_conversations_app ON conversations (app)")
        op.execute("CREATE INDEX IF NOT EXISTS ix_conversations_owner_uid ON conversations (owner_uid)")

        op.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
                id VARCHAR PRIMARY KEY,
                conversation_id VARCHAR NOT NULL REFERENCES conversations(id),
                role VARCHAR NOT NULL,
                content TEXT NOT NULL,
                citations_json JSON NOT NULL DEFAULT '[]'::json,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        op.execute("CREATE INDEX IF NOT EXISTS ix_messages_conversation_id ON messages (conversation_id)")
        op.execute("CREATE INDEX IF NOT EXISTS ix_messages_role ON messages (role)")

        op.execute(
            """
            CREATE TABLE IF NOT EXISTS sources (
                id VARCHAR PRIMARY KEY,
                title VARCHAR NOT NULL,
                domain VARCHAR NOT NULL,
                url VARCHAR,
                snippet TEXT,
                provider VARCHAR,
                type VARCHAR,
                published_at VARCHAR,
                favicon_url VARCHAR,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        op.execute("CREATE INDEX IF NOT EXISTS ix_sources_domain ON sources (domain)")

        op.execute(
            """
            CREATE TABLE IF NOT EXISTS message_sources (
                id SERIAL PRIMARY KEY,
                message_id VARCHAR NOT NULL REFERENCES messages(id),
                source_id VARCHAR NOT NULL REFERENCES sources(id),
                citation_id VARCHAR,
                label VARCHAR,
                position INTEGER NOT NULL DEFAULT 0
            )
            """
        )
        op.execute("CREATE INDEX IF NOT EXISTS ix_message_sources_message_id ON message_sources (message_id)")
        op.execute("CREATE INDEX IF NOT EXISTS ix_message_sources_source_id ON message_sources (source_id)")
        op.execute("CREATE INDEX IF NOT EXISTS ix_message_sources_citation_id ON message_sources (citation_id)")

        op.execute(
            """
            CREATE TABLE IF NOT EXISTS share_links (
                id VARCHAR PRIMARY KEY,
                conversation_id VARCHAR NOT NULL REFERENCES conversations(id),
                visibility VARCHAR NOT NULL DEFAULT 'unlisted',
                allow_continue_chat BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                revoked_at TIMESTAMP
            )
            """
        )
        op.execute("CREATE INDEX IF NOT EXISTS ix_share_links_conversation_id ON share_links (conversation_id)")

        op.execute(
            """
            CREATE TABLE IF NOT EXISTS share_link_messages (
                id SERIAL PRIMARY KEY,
                share_link_id VARCHAR NOT NULL REFERENCES share_links(id),
                message_id VARCHAR NOT NULL REFERENCES messages(id),
                position INTEGER NOT NULL DEFAULT 0
            )
            """
        )
        op.execute("CREATE INDEX IF NOT EXISTS ix_share_link_messages_share_link_id ON share_link_messages (share_link_id)")
        op.execute("CREATE INDEX IF NOT EXISTS ix_share_link_messages_message_id ON share_link_messages (message_id)")
        return

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
        _add_column_if_missing(inspector, "conversations", sa.Column("family", sa.String(), nullable=True))
        _add_column_if_missing(inspector, "conversations", sa.Column("app", sa.String(), nullable=True))
        _add_column_if_missing(inspector, "conversations", sa.Column("title", sa.String(), nullable=True))
        _add_column_if_missing(inspector, "conversations", sa.Column("owner_uid", sa.String(), nullable=True))
        _add_column_if_missing(inspector, "conversations", sa.Column("created_at", sa.DateTime(), nullable=True))
        _add_column_if_missing(inspector, "conversations", sa.Column("updated_at", sa.DateTime(), nullable=True))


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
