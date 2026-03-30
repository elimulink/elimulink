from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, JSON, String, UniqueConstraint

from ..database import Base


class UserNotificationPreference(Base):
    __tablename__ = "user_notification_preferences"
    __table_args__ = (
        UniqueConstraint("uid", "app", name="uq_user_notification_preferences_uid_app"),
    )

    id = Column(Integer, primary_key=True, index=True)
    uid = Column(String, nullable=False, index=True)
    app = Column(String, nullable=False, index=True, default="institution")
    mute_notifications = Column(Boolean, nullable=False, default=False)
    delivery_json = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
