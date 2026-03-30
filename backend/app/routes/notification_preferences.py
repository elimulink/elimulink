from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..auth import CurrentUser, get_current_user
from ..database import SessionLocal
from ..models.notification_preferences import UserNotificationPreference


router = APIRouter(prefix="/api/v1/settings", tags=["notification-preferences"])

NOTIFICATION_ROWS = [
    {"id": "responses", "channels": ["push"]},
    {"id": "groupChats", "channels": ["push"]},
    {"id": "tasks", "channels": ["push", "email"]},
    {"id": "projects", "channels": ["email"]},
    {"id": "recommendations", "channels": ["push", "email"]},
    {"id": "usage", "channels": ["push", "email"]},
    {"id": "announcements", "channels": ["push", "email"]},
    {"id": "results", "channels": ["push", "email"]},
    {"id": "feesPayments", "channels": ["push", "email"]},
    {"id": "assignments", "channels": ["push", "email"]},
    {"id": "attendance", "channels": ["push", "email"]},
    {"id": "subgroups", "channels": ["push", "email"]},
    {"id": "meet", "channels": ["push", "email"]},
    {"id": "calendarReminders", "channels": ["push", "email"]},
    {"id": "institutionMessages", "channels": ["push", "email"]},
    {"id": "securityAlerts", "channels": ["push", "email"]},
    {"id": "systemUpdates", "channels": ["push", "email"]},
]


class DeliveryPreference(BaseModel):
    push: bool = False
    email: bool = False


class NotificationPreferencesRequest(BaseModel):
    mute_notifications: bool = False
    delivery: dict[str, DeliveryPreference] = Field(default_factory=dict)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def build_default_delivery() -> dict[str, dict[str, bool]]:
    return {
        row["id"]: {
            "push": "push" in row["channels"],
            "email": False,
        }
        for row in NOTIFICATION_ROWS
    }


def normalize_delivery(payload: dict[str, Any] | None) -> dict[str, dict[str, bool]]:
    defaults = build_default_delivery()
    raw = payload if isinstance(payload, dict) else {}
    normalized: dict[str, dict[str, bool]] = {}
    for row in NOTIFICATION_ROWS:
        row_id = row["id"]
        row_payload = raw.get(row_id) if isinstance(raw.get(row_id), dict) else {}
        normalized[row_id] = {
            "push": bool(row_payload.get("push")) if "push" in row["channels"] else False,
            "email": bool(row_payload.get("email")) if "email" in row["channels"] else False,
        }
        if row_id not in raw:
            normalized[row_id] = defaults[row_id]
    return normalized


def serialize_preferences(record: UserNotificationPreference | None) -> dict[str, Any]:
    if not record:
        return {
            "mute_notifications": False,
            "delivery": build_default_delivery(),
        }
    return {
        "mute_notifications": bool(record.mute_notifications),
        "delivery": normalize_delivery(record.delivery_json),
    }


@router.get("/notification-preferences")
def get_notification_preferences(
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    record = (
        db.query(UserNotificationPreference)
        .filter(
            UserNotificationPreference.uid == user.uid,
            UserNotificationPreference.app == "institution",
        )
        .first()
    )
    return {
        "ok": True,
        "preferences": serialize_preferences(record),
    }


@router.put("/notification-preferences")
def update_notification_preferences(
    body: NotificationPreferencesRequest,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    record = (
        db.query(UserNotificationPreference)
        .filter(
            UserNotificationPreference.uid == user.uid,
            UserNotificationPreference.app == "institution",
        )
        .first()
    )
    if not record:
        record = UserNotificationPreference(uid=user.uid, app="institution")
        db.add(record)

    record.mute_notifications = bool(body.mute_notifications)
    record.delivery_json = normalize_delivery(body.delivery)
    db.commit()
    db.refresh(record)

    return {
        "ok": True,
        "preferences": serialize_preferences(record),
    }
