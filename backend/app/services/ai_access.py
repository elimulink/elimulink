from typing import Any, Dict

from fastapi import HTTPException

from app.db.supabase_client import get_supabase_client


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
    }


async def resolve_ai_family_access(uid: str, email: str, app_name: str) -> Dict[str, Any]:
    supabase = get_supabase_client()
    if supabase is None:
        raise HTTPException(
            status_code=500,
            detail="Supabase client not configured",
        )

    response = (
        supabase.table("user_profiles")
        .select("uid,email,role,institution_id,app_access,default_app,status")
        .eq("uid", uid)
        .limit(1)
        .execute()
    )

    rows = response.data or []
    if not rows:
        if app_name == "public":
            return {
                "allowed": True,
                "uid": uid,
                "email": email,
                "role": "public_user",
                "institution_id": None,
                "app_access": ["public"],
                "default_app": "public",
            }
        return _deny()

    user = rows[0]

    if user.get("status") != "active":
        return _deny()

    app_access = [str(item or "").strip().lower() for item in (user.get("app_access") or []) if str(item or "").strip()]

    if app_name == "public" and ("public" in app_access or len(app_access) > 0):
        return {
            "allowed": True,
            "uid": user.get("uid"),
            "email": user.get("email") or email,
            "role": _normalize_role(user.get("role"), "public"),
            "institution_id": user.get("institution_id"),
            "app_access": app_access,
            "default_app": user.get("default_app") or "public",
        }

    if app_name not in app_access:
        return _deny()

    return {
        "allowed": True,
        "uid": user.get("uid"),
        "email": user.get("email") or email,
        "role": _normalize_role(user.get("role"), app_name),
        "institution_id": user.get("institution_id"),
        "app_access": app_access,
        "default_app": user.get("default_app") or app_name,
    }
