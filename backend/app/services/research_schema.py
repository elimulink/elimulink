from __future__ import annotations

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def _compiled_column_type_sql(engine: Engine, table_name: str, column_name: str) -> str:
    inspector = inspect(engine)
    for column in inspector.get_columns(table_name):
        if column["name"] == column_name:
            return column["type"].compile(dialect=engine.dialect)
    raise KeyError(f"Column {table_name}.{column_name} not found")


def ensure_institution_research_schema(engine: Engine) -> None:
    with engine.begin() as conn:
        dialect = conn.dialect.name

        if dialect == "postgresql":
            conn.execute(text("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS family VARCHAR DEFAULT 'ai'"))
            conn.execute(text("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS app VARCHAR DEFAULT 'institution'"))
            conn.execute(text("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS title VARCHAR DEFAULT 'New conversation'"))
            conn.execute(text("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS owner_uid VARCHAR"))
            conn.execute(text("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS workspace_kind VARCHAR"))
            conn.execute(text("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS workspace_settings_json JSONB DEFAULT '{}'::jsonb"))
            conn.execute(text("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE"))
            conn.execute(text("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP"))
            conn.execute(text("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
            conn.execute(text("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
            conn.execute(text("UPDATE conversations SET family = COALESCE(family, 'ai')"))
            conn.execute(text("UPDATE conversations SET app = COALESCE(app, 'institution')"))
            conn.execute(text("UPDATE conversations SET title = COALESCE(title, 'New conversation')"))
            conn.execute(text("UPDATE conversations SET is_archived = COALESCE(is_archived, FALSE)"))
            conn.execute(text("UPDATE conversations SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP)"))
            conn.execute(text("UPDATE conversations SET updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_conversations_family ON conversations (family)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_conversations_app ON conversations (app)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_conversations_owner_uid ON conversations (owner_uid)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_conversations_workspace_kind ON conversations (workspace_kind)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_conversations_is_archived ON conversations (is_archived)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_conversations_archived_at ON conversations (archived_at)"))

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
                        access_level VARCHAR NOT NULL DEFAULT 'anyone-with-link',
                        invited_emails_json JSON NOT NULL DEFAULT '[]'::json,
                        subgroup_id INTEGER,
                        subgroup_name VARCHAR,
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

            conn.execute(
                text(
                    f"""
                    CREATE TABLE IF NOT EXISTS notebook_items (
                        id VARCHAR PRIMARY KEY,
                        conversation_id {_compiled_column_type_sql(engine, "conversations", "id")} NOT NULL REFERENCES conversations(id),
                        owner_uid VARCHAR NOT NULL,
                        title VARCHAR NOT NULL DEFAULT 'Untitled Note',
                        content TEXT NOT NULL DEFAULT '',
                        is_archived BOOLEAN NOT NULL DEFAULT FALSE,
                        archived_at TIMESTAMP,
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )
                    """
                )
            )
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_notebook_items_conversation_id ON notebook_items (conversation_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_notebook_items_owner_uid ON notebook_items (owner_uid)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_notebook_items_is_archived ON notebook_items (is_archived)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_notebook_items_archived_at ON notebook_items (archived_at)"))
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
        if "workspace_kind" not in columns:
            conn.execute(text("ALTER TABLE conversations ADD COLUMN workspace_kind VARCHAR"))
        if "workspace_settings_json" not in columns:
            conn.execute(text("ALTER TABLE conversations ADD COLUMN workspace_settings_json JSON"))
            conn.execute(text("UPDATE conversations SET workspace_settings_json = '{}' WHERE workspace_settings_json IS NULL"))
        if "is_archived" not in columns:
            conn.execute(text("ALTER TABLE conversations ADD COLUMN is_archived BOOLEAN DEFAULT 0"))
            conn.execute(text("UPDATE conversations SET is_archived = 0 WHERE is_archived IS NULL"))
        if "archived_at" not in columns:
            conn.execute(text("ALTER TABLE conversations ADD COLUMN archived_at DATETIME"))
        if "created_at" not in columns:
            conn.execute(text("ALTER TABLE conversations ADD COLUMN created_at DATETIME"))
        if "updated_at" not in columns:
            conn.execute(text("ALTER TABLE conversations ADD COLUMN updated_at DATETIME"))

        if "notebook_items" not in table_names:
            conn.execute(
                text(
                    f"""
                    CREATE TABLE notebook_items (
                        id VARCHAR PRIMARY KEY,
                        conversation_id {_compiled_column_type_sql(engine, "conversations", "id")} NOT NULL REFERENCES conversations(id),
                        owner_uid VARCHAR NOT NULL,
                        title VARCHAR NOT NULL DEFAULT 'Untitled Note',
                        content TEXT NOT NULL DEFAULT '',
                        is_archived BOOLEAN DEFAULT 0,
                        archived_at DATETIME,
                        created_at DATETIME,
                        updated_at DATETIME
                    )
                    """
                )
            )

        if "message_sources" in table_names:
            message_source_columns = {column["name"] for column in inspector.get_columns("message_sources")}
            if "citation_id" not in message_source_columns:
                conn.execute(text("ALTER TABLE message_sources ADD COLUMN citation_id VARCHAR"))

        share_columns = {column["name"] for column in inspector.get_columns("share_links")} if "share_links" in table_names else set()
        if "share_links" in table_names:
            if "access_level" not in share_columns:
                conn.execute(text("ALTER TABLE share_links ADD COLUMN access_level VARCHAR"))
                conn.execute(text("UPDATE share_links SET access_level = 'anyone-with-link' WHERE access_level IS NULL"))
            if "invited_emails_json" not in share_columns:
                conn.execute(text("ALTER TABLE share_links ADD COLUMN invited_emails_json JSON"))
                conn.execute(text("UPDATE share_links SET invited_emails_json = '[]' WHERE invited_emails_json IS NULL"))
            if "subgroup_id" not in share_columns:
                conn.execute(text("ALTER TABLE share_links ADD COLUMN subgroup_id INTEGER"))
            if "subgroup_name" not in share_columns:
                conn.execute(text("ALTER TABLE share_links ADD COLUMN subgroup_name VARCHAR"))
