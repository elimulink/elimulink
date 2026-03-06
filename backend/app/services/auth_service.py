from __future__ import annotations

from typing import Optional

from typing import Optional

from fastapi import HTTPException

from ..auth import CurrentUser, verify_firebase_token


def resolve_app_type(app_type: Optional[str]) -> str:
    value = (app_type or "").strip().lower()
    if value in {"public", "student", "institution"}:
        return value
    return "public"


def resolve_role(user: CurrentUser | None) -> str:
    if not user:
        return "public"
    role = (user.role or "").strip().lower()
    return role or "student"


def resolve_user_from_header(authorization: Optional[str]) -> Optional[CurrentUser]:
    if not authorization:
        return None
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail={"code": "AUTH_INVALID", "message": "Invalid Authorization header"},
        )
    token = parts[1].strip()
    if not token:
        raise HTTPException(
            status_code=401,
            detail={"code": "AUTH_INVALID", "message": "Invalid Authorization header"},
        )
    decoded = verify_firebase_token(token)
    return CurrentUser(
        uid=str(decoded.get("uid")),
        role=str(decoded.get("role") or "student"),
        institution_id=decoded.get("institutionId"),
        department_id=decoded.get("departmentId"),
        email=decoded.get("email"),
        name=decoded.get("name"),
        claims=decoded,
    )
