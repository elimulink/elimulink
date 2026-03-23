from __future__ import annotations

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def ensure_institution_research_schema(engine: Engine) -> None:
    with engine.begin() as conn:
        dialect = conn.dialect.name

        if dialect == "postgresql":
            conn.execute(text("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS family VARCHAR DEFAULT 'ai'"))
            conn.execute(text("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS app VARCHAR DEFAULT 'institution'"))
            conn.execute(text("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS title VARCHAR DEFAULT 'New conversation'"))
            conn.execute(text("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS owner_uid VARCHAR"))
            conn.execute(text("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
            conn.execute(text("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
            conn.execute(text("UPDATE conversations SET family = COALESCE(family, 'ai')"))
            conn.execute(text("UPDATE conversations SET app = COALESCE(app, 'institution')"))
            conn.execute(text("UPDATE conversations SET title = COALESCE(title, 'New conversation')"))
            conn.execute(text("UPDATE conversations SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP)"))
            conn.execute(text("UPDATE conversations SET updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_conversations_family ON conversations (family)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_conversations_app ON conversations (app)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_conversations_owner_uid ON conversations (owner_uid)"))

            conn.execute(
                text(
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
            )
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_messages_conversation_id ON messages (conversation_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_messages_role ON messages (role)"))

            conn.execute(
                text(
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
            )
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_sources_domain ON sources (domain)"))

            conn.execute(
                text(
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
            )
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_message_sources_message_id ON message_sources (message_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_message_sources_source_id ON message_sources (source_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_message_sources_citation_id ON message_sources (citation_id)"))

            conn.execute(
                text(
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
            )
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_share_links_conversation_id ON share_links (conversation_id)"))

            conn.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS share_link_messages (
                        id SERIAL PRIMARY KEY,
                        share_link_id VARCHAR NOT NULL REFERENCES share_links(id),
                        message_id VARCHAR NOT NULL REFERENCES messages(id),
                        position INTEGER NOT NULL DEFAULT 0
                    )
                    """
                )
            )
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_share_link_messages_share_link_id ON share_link_messages (share_link_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_share_link_messages_message_id ON share_link_messages (message_id)"))
            return

        inspector = inspect(conn)
        table_names = set(inspector.get_table_names())
        if "conversations" not in table_names:
            return

        columns = {column["name"] for column in inspector.get_columns("conversations")}
        if "family" not in columns:
            conn.execute(text("ALTER TABLE conversations ADD COLUMN family VARCHAR"))
            conn.execute(text("UPDATE conversations SET family = 'ai' WHERE family IS NULL"))
        if "app" not in columns:
            conn.execute(text("ALTER TABLE conversations ADD COLUMN app VARCHAR"))
            conn.execute(text("UPDATE conversations SET app = 'institution' WHERE app IS NULL"))
        if "title" not in columns:
            conn.execute(text("ALTER TABLE conversations ADD COLUMN title VARCHAR"))
            conn.execute(text("UPDATE conversations SET title = 'New conversation' WHERE title IS NULL"))
        if "owner_uid" not in columns:
            conn.execute(text("ALTER TABLE conversations ADD COLUMN owner_uid VARCHAR"))
        if "created_at" not in columns:
            conn.execute(text("ALTER TABLE conversations ADD COLUMN created_at DATETIME"))
        if "updated_at" not in columns:
            conn.execute(text("ALTER TABLE conversations ADD COLUMN updated_at DATETIME"))
