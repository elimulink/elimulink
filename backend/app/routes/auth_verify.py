import time
from typing import Any, Dict, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from ..services.ai_access import resolve_ai_family_access
from ..services.firebase_auth import verify_firebase_bearer_token


router = APIRouter(prefix="/api/auth", tags=["auth"])


class VerifyAccessRequest(BaseModel):
    app: str


@router.post("/verify-app-access")
async def verify_app_access(
    payload: VerifyAccessRequest,
    authorization: Optional[str] = Header(default=None),
) -> Dict[str, Any]:
    started_at = time.perf_counter()
    print(f"[ENTRY_TIMING][backend] marker=verify_request_received app={payload.app!r} hasAuth={bool(authorization)}")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.replace("Bearer ", "").strip()
    firebase_started_at = time.perf_counter()
    print(f"[ENTRY_TIMING][backend] marker=firebase_verify_start app={payload.app!r}")
    decoded = verify_firebase_bearer_token(token)
    print(
        f"[ENTRY_TIMING][backend] marker=firebase_verify_done app={payload.app!r} "
        f"duration_ms={(time.perf_counter() - firebase_started_at) * 1000:.1f}"
    )

    email = decoded.get("email")
    uid = decoded.get("uid")

    if not uid or not email:
        raise HTTPException(status_code=401, detail="Invalid Firebase token")

    app_name = (payload.app or "").strip().lower()
    if app_name not in {"public", "student", "institution"}:
        print(f"[AUTH_VERIFY_ROUTE] invalid app app={app_name!r}")
        return {
            "allowed": False,
            "uid": None,
            "email": None,
            "role": None,
            "institution_id": None,
            "app_access": [],
            "default_app": None,
        }

    ai_access_started_at = time.perf_counter()
    print(f"[ENTRY_TIMING][backend] marker=ai_access_start app={app_name} uid={uid}")
    result = await resolve_ai_family_access(
        uid=uid,
        email=email,
        app_name=app_name,
    )
    print(
        f"[ENTRY_TIMING][backend] marker=ai_access_done app={app_name} uid={uid} "
        f"duration_ms={(time.perf_counter() - ai_access_started_at) * 1000:.1f}"
    )
    print(
        f"[ENTRY_TIMING][backend] marker=verify_response_sent app={app_name} uid={uid} "
        f"allowed={result.get('allowed')} access={result.get('app_access')} "
        f"duration_ms={(time.perf_counter() - started_at) * 1000:.1f}"
    )
    return result
