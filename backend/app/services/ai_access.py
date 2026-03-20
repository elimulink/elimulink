import asyncio
import os
from typing import Any, Dict

from fastapi import HTTPException

from app.db.supabase_client import get_supabase_client

AI_ACCESS_TIMEOUT_SECONDS = 8
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


async def resolve_ai_family_access(uid: str, email: str, app_name: str) -> Dict[str, Any]:
    supabase = get_supabase_client()
    if supabase is None:
        if app_name == "institution" and TEMP_INSTITUTION_ACCESS_ENABLED and _is_work_email(email):
            return _temporary_institution_access(uid, email, "supabase_unavailable")
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
            return {
                "allowed": True,
                "uid": uid,
                "email": email,
                "role": "public_user",
                "institution_id": None,
                "app_access": ["public"],
                "default_app": "public",
                "access_mode": "verified",
            }
        if app_name == "institution" and TEMP_INSTITUTION_ACCESS_ENABLED and _is_work_email(email):
            return _temporary_institution_access(uid, email, "missing_profile")
        return _deny()

    user = rows[0]

    if user.get("status") != "active":
        print(f"[AI_ACCESS] resolve:inactive uid={uid} status={user.get('status')}")
        return _deny()

    app_access = [str(item or "").strip().lower() for item in (user.get("app_access") or []) if str(item or "").strip()]

    if app_name == "public" and ("public" in app_access or len(app_access) > 0):
        print(f"[AI_ACCESS] resolve:allow_public uid={uid} access={app_access}")
        return {
            "allowed": True,
            "uid": user.get("uid"),
            "email": user.get("email") or email,
            "role": _normalize_role(user.get("role"), "public"),
            "institution_id": user.get("institution_id"),
            "app_access": app_access,
            "default_app": user.get("default_app") or "public",
            "access_mode": "verified",
        }

    if app_name not in app_access:
        if app_name == "institution" and TEMP_INSTITUTION_ACCESS_ENABLED and _is_work_email(user.get("email") or email):
            return _temporary_institution_access(uid, user.get("email") or email, "missing_institution_mapping")
        print(f"[AI_ACCESS] resolve:deny_missing_app uid={uid} app={app_name} access={app_access}")
        return _deny()

    print(f"[AI_ACCESS] resolve:allow uid={uid} app={app_name} access={app_access}")
    return {
        "allowed": True,
        "uid": user.get("uid"),
        "email": user.get("email") or email,
        "role": _normalize_role(user.get("role"), app_name),
        "institution_id": user.get("institution_id"),
        "app_access": app_access,
        "default_app": user.get("default_app") or app_name,
        "access_mode": "verified",
    }
