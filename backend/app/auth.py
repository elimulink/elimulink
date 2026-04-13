from __future__ import annotations

import json
import os
import ipaddress
from pathlib import Path
from dataclasses import dataclass
from typing import Optional

import firebase_admin
from fastapi import Depends, Header, HTTPException, Request
from firebase_admin import auth as fb_auth
from firebase_admin import credentials


_firebase_ready = False
_dev_fallback_warned = False
_service_account_path = Path(__file__).resolve().parent / "keys" / "firebase-service-account.json"


def _is_production() -> bool:
    env = (os.getenv("APP_ENV") or os.getenv("ENV") or "").strip().lower()
    return env == "production"


def _is_allowed_dev_host(host: str) -> bool:
    value = str(host or "").strip().lower()
    if value in {"127.0.0.1", "::1", "localhost"}:
        return True
    try:
        ip = ipaddress.ip_address(value)
    except ValueError:
        return False
    return bool(ip.is_private or ip.is_loopback)


def init_firebase_admin() -> None:
    global _firebase_ready
    if firebase_admin._apps:
        _firebase_ready = True
        return

    sa_json = os.getenv("FIREBASE_ADMIN_SA", "").strip()
    google_credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "").strip()

    if sa_json:
        sa_data = json.loads(sa_json)
        cred_obj = credentials.Certificate(sa_data)
        firebase_admin.initialize_app(cred_obj)
    elif google_credentials_path:
        cred_obj = credentials.Certificate(google_credentials_path)
        firebase_admin.initialize_app(cred_obj)
        sa_data = {}
    elif _service_account_path.exists():
        cred_obj = credentials.Certificate(str(_service_account_path))
        firebase_admin.initialize_app(cred_obj)
        sa_data = {}
    else:
        if _is_production():
            raise RuntimeError(
                "Firebase Admin credentials are required in production for token verification."
            )
        print("[AUTH_STARTUP] DEV AUTH FALLBACK ACTIVE - Firebase token verification disabled")
        _firebase_ready = False
        return

    project_id = (sa_data or {}).get("project_id")
    frontend_project_id = os.getenv("VITE_FIREBASE_PROJECT_ID")
    if frontend_project_id and project_id and frontend_project_id != project_id:
        raise RuntimeError(
            "FIREBASE_ADMIN_SA project_id does not match VITE_FIREBASE_PROJECT_ID. "
            f"admin={project_id} frontend={frontend_project_id}"
        )
    _firebase_ready = True
    print(f"[AUTH_STARTUP] firebase_admin_initialized=true projectId={project_id}")


@dataclass
class CurrentUser:
    uid: str
    role: str
    institution_id: Optional[str] = None
    department_id: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    claims: Optional[dict] = None


def _canonical_role(role: Optional[str]) -> str:
    value = str(role or "public")
    if value == "superAdmin":
        return "super_admin"
    if value == "institutionAdmin":
        return "institution_admin"
    if value in {"departmentAdmin", "staff"}:
        return "department_head" if value == "departmentAdmin" else "lecturer"
    if value in {"institution_student", "student_general"}:
        return "student"
    return value


def _extract_bearer(authorization: Optional[str]) -> str:
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail={"code": "AUTH_MISSING", "message": "Missing Authorization header"},
        )
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
    return token


def verify_firebase_token(id_token: str) -> dict:
    try:
        return fb_auth.verify_id_token(id_token)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=401,
            detail={"code": "AUTH_INVALID", "message": "Invalid or expired token"},
        ) from exc


def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(default=None),
) -> CurrentUser:
    if not _firebase_ready and not _is_production():
        global _dev_fallback_warned
        if not _dev_fallback_warned:
            print("[AUTH] DEV AUTH FALLBACK ACTIVE - Firebase token verification disabled")
            _dev_fallback_warned = True
        host = (request.client.host if request.client else "") or ""
        if not _is_allowed_dev_host(host):
            raise HTTPException(
                status_code=401,
                detail={"code": "AUTH_REQUIRED", "message": "Authorization required"},
            )
        return CurrentUser(
            uid="dev-user",
            role="institution_admin",
            institution_id="dev-institution",
            department_id="general",
            email="dev@local",
            name="Dev User",
            claims={"dev": True},
        )

    request_id = getattr(request.state, "request_id", None)
    has_auth_header = bool(authorization and authorization.startswith("Bearer "))
    endpoint = str(request.url.path or "")
    try:
        token = _extract_bearer(authorization)
        decoded = verify_firebase_token(token)
    except HTTPException as exc:
        print(
            f"[AUTH_VERIFY] rid={request_id} endpoint={endpoint} headerExists={has_auth_header} "
            f"uid=none status={exc.status_code} detail={exc.detail}"
        )
        raise
    except Exception as exc:  # noqa: BLE001
        print(
            f"[AUTH_VERIFY] rid={request_id} endpoint={endpoint} headerExists={has_auth_header} "
            f"uid=none status=401 error={str(exc)}"
        )
        raise HTTPException(
            status_code=401,
            detail={"code": "AUTH_INVALID", "message": "Invalid or expired token"},
        ) from exc

    role = _canonical_role(decoded.get("role"))
    institution_id = decoded.get("institutionId")
    department_id = decoded.get("departmentId")
    sign_in_provider = ((decoded.get("firebase") or {}).get("sign_in_provider"))

    print(
        f"[AUTH_VERIFY] rid={request_id} endpoint={endpoint} headerExists={has_auth_header} "
        f"uid={decoded.get('uid')} aud={decoded.get('aud')} iss={decoded.get('iss')} "
        f"provider={sign_in_provider}"
    )

    request.state.uid = decoded.get("uid")
    request.state.role = role
    request.state.institution_id = institution_id
    request.state.department_id = department_id

    return CurrentUser(
        uid=str(decoded.get("uid")),
        role=role,
        institution_id=institution_id,
        department_id=department_id,
        email=decoded.get("email"),
        name=decoded.get("name"),
        claims=decoded,
    )


def require_roles(*roles: str):
    def _dep(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in roles:
            raise HTTPException(
                status_code=403,
                detail={"code": "FORBIDDEN", "message": "Insufficient role"},
            )
        return user

    return _dep
