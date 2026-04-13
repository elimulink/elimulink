import asyncio
import os
import time
from typing import Any, Dict

from fastapi import HTTPException

from ..db.supabase_client import get_supabase_client

AI_ACCESS_TIMEOUT_SECONDS = 20
AI_ACCESS_CACHE_TTL_SECONDS = 20
# Temporary bridge for institution users while profile mapping is still being finalized.
# Keep this explicit so it can be disabled by env without changing the rest of the auth flow.
TEMP_INSTITUTION_ACCESS_ENABLED = str(os.getenv("TEMP_INSTITUTION_ACCESS_ENABLED", "1")).strip().lower() not in {"0", "false", "no", "off"}
PUBLIC_EMAIL_DOMAINS = {
    "gmail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "live.com",
    "icloud.com",
    "aol.com",
    "protonmail.com",
    "gmx.com",
    "mail.com",
}
_ACCESS_CACHE: dict[str, tuple[float, Dict[str, Any]]] = {}

if TEMP_INSTITUTION_ACCESS_ENABLED:
    print("[AI_ACCESS] temporary institution access fallback is enabled")


def _normalize_role(role: str | None, app_name: str) -> str:
    value = str(role or "").strip().lower()
    mapping = {
        "superadmin": "super_admin",
        "institutionadmin": "institution_admin",
        "departmentadmin": "department_head",
        "student_general": "student",
    }
    normalized = mapping.get(value, value)
    if normalized:
        return normalized
    if app_name == "public":
        return "public_user"
    return "student"


def _deny() -> Dict[str, Any]:
    return {
        "allowed": False,
        "uid": None,
        "email": None,
        "role": None,
        "institution_id": None,
        "app_access": [],
        "default_app": None,
        "access_mode": "denied",
    }


def _email_domain(email: str | None) -> str:
    value = str(email or "").strip().lower()
    if "@" not in value:
        return ""
    return value.rsplit("@", 1)[-1]


def _is_work_email(email: str | None) -> bool:
    domain = _email_domain(email)
    if not domain:
        return False
    return domain not in PUBLIC_EMAIL_DOMAINS


def _temporary_institution_access(uid: str, email: str, reason: str) -> Dict[str, Any]:
    domain = _email_domain(email)
    print(f"[AI_ACCESS] resolve:temporary_allow uid={uid} email={email} domain={domain} reason={reason}")
    return {
        "allowed": True,
        "uid": uid,
        "email": email,
        "role": "institution_member",
        "institution_id": None,
        "app_access": ["institution"],
        "default_app": "institution",
        "access_mode": "temporary",
        "temporary_reason": reason,
    }


def _cache_key(uid: str, app_name: str) -> str:
    return f"{uid}:{app_name}"


def _get_cached_access(uid: str, app_name: str) -> Dict[str, Any] | None:
    cached = _ACCESS_CACHE.get(_cache_key(uid, app_name))
    if not cached:
        return None
    expires_at, payload = cached
    if expires_at <= time.monotonic():
        _ACCESS_CACHE.pop(_cache_key(uid, app_name), None)
        return None
    return dict(payload)


def _store_cached_access(uid: str, app_name: str, payload: Dict[str, Any]) -> None:
    if payload.get("allowed") is not True:
        return
    _ACCESS_CACHE[_cache_key(uid, app_name)] = (
        time.monotonic() + AI_ACCESS_CACHE_TTL_SECONDS,
        dict(payload),
    )


async def resolve_ai_family_access(uid: str, email: str, app_name: str) -> Dict[str, Any]:
    cached_payload = _get_cached_access(uid, app_name)
    if cached_payload is not None:
        print(f"[AI_ACCESS] resolve:cache_hit uid={uid} app={app_name}")
        return cached_payload

    supabase = get_supabase_client()
    if supabase is None:
        if app_name == "institution" and TEMP_INSTITUTION_ACCESS_ENABLED and _is_work_email(email):
            payload = _temporary_institution_access(uid, email, "supabase_unavailable")
            _store_cached_access(uid, app_name, payload)
            return payload
        raise HTTPException(
            status_code=500,
            detail="Supabase client not configured",
        )

    print(f"[AI_ACCESS] resolve:start uid={uid} app={app_name} email={email}")
    try:
        response = await asyncio.wait_for(
            asyncio.to_thread(
                lambda: (
                    supabase.table("user_profiles")
                    .select("uid,email,role,institution_id,app_access,default_app,status")
                    .eq("uid", uid)
                    .limit(1)
                    .execute()
                )
            ),
            timeout=AI_ACCESS_TIMEOUT_SECONDS,
        )
    except TimeoutError as exc:
        print(f"[AI_ACCESS] resolve:timeout uid={uid} app={app_name}")
        raise HTTPException(status_code=504, detail="AI family access lookup timed out") from exc
    except Exception as exc:  # noqa: BLE001
        print(f"[AI_ACCESS] resolve:error uid={uid} app={app_name} error={exc}")
        raise HTTPException(status_code=500, detail="AI family access lookup failed") from exc

    rows = response.data or []
    print(f"[AI_ACCESS] resolve:rows uid={uid} app={app_name} count={len(rows)}")
    if not rows:
        if app_name == "public":
            print(f"[AI_ACCESS] resolve:fallback_public uid={uid}")
            payload = {
                "allowed": True,
                "uid": uid,
                "email": email,
                "role": "public_user",
                "institution_id": None,
                "app_access": ["public"],
                "default_app": "public",
                "access_mode": "verified",
            }
            _store_cached_access(uid, app_name, payload)
            return payload
        if app_name == "institution" and TEMP_INSTITUTION_ACCESS_ENABLED and _is_work_email(email):
            payload = _temporary_institution_access(uid, email, "missing_profile")
            _store_cached_access(uid, app_name, payload)
            return payload
        return _deny()

    user = rows[0]

    if user.get("status") != "active":
        print(f"[AI_ACCESS] resolve:inactive uid={uid} status={user.get('status')}")
        return _deny()

    app_access = [str(item or "").strip().lower() for item in (user.get("app_access") or []) if str(item or "").strip()]

    if app_name == "public" and ("public" in app_access or len(app_access) > 0):
        print(f"[AI_ACCESS] resolve:allow_public uid={uid} access={app_access}")
        payload = {
            "allowed": True,
            "uid": user.get("uid"),
            "email": user.get("email") or email,
            "role": _normalize_role(user.get("role"), "public"),
            "institution_id": user.get("institution_id"),
            "app_access": app_access,
            "default_app": user.get("default_app") or "public",
            "access_mode": "verified",
        }
        _store_cached_access(uid, app_name, payload)
        return payload

    if app_name not in app_access:
        if app_name == "institution" and TEMP_INSTITUTION_ACCESS_ENABLED and _is_work_email(user.get("email") or email):
            payload = _temporary_institution_access(uid, user.get("email") or email, "missing_institution_mapping")
            _store_cached_access(uid, app_name, payload)
            return payload
        print(f"[AI_ACCESS] resolve:deny_missing_app uid={uid} app={app_name} access={app_access}")
        return _deny()

    print(f"[AI_ACCESS] resolve:allow uid={uid} app={app_name} access={app_access}")
    payload = {
        "allowed": True,
        "uid": user.get("uid"),
        "email": user.get("email") or email,
        "role": _normalize_role(user.get("role"), app_name),
        "institution_id": user.get("institution_id"),
        "app_access": app_access,
        "default_app": user.get("default_app") or app_name,
        "access_mode": "verified",
    }
    _store_cached_access(uid, app_name, payload)
    return payload
