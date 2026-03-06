from __future__ import annotations

import os


class Settings:
    def __init__(self) -> None:
        self.env = (os.getenv("APP_ENV") or os.getenv("ENV") or "").strip().lower()
        self.database_url = os.getenv("DATABASE_URL", "sqlite:///./elimulink.db")
        self.gemini_api_key = os.getenv("GEMINI_API_KEY", "")


settings = Settings()
