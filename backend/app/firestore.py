from __future__ import annotations

import os
from typing import Any

import firebase_admin
from firebase_admin import firestore


APP_ID = os.getenv("APP_ID", "elimulink-pro-v2")


def db_client() -> firestore.Client:
    return firestore.client()


def get_user_profile(uid: str) -> dict[str, Any] | None:
    env = (os.getenv("APP_ENV") or os.getenv("ENV") or "").strip().lower()
    if env != "production" and not firebase_admin._apps:
        return None
    snap = db_client().document(f"artifacts/{APP_ID}/users/{uid}").get()
    if not snap.exists:
        return None
    data = snap.to_dict() or {}
    data["id"] = snap.id
    return data


def require_profile_with_institution(uid: str) -> dict[str, Any]:
    profile = get_user_profile(uid)
    if not profile or not profile.get("institutionId"):
        raise PermissionError("FORBIDDEN")
    return profile
