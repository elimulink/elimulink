from typing import Any, Dict, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.services.ai_access import resolve_ai_family_access
from app.services.firebase_auth import verify_firebase_bearer_token


router = APIRouter(prefix="/api/auth", tags=["auth"])


class VerifyAccessRequest(BaseModel):
    app: str


@router.post("/verify-app-access")
async def verify_app_access(
    payload: VerifyAccessRequest,
    authorization: Optional[str] = Header(default=None),
) -> Dict[str, Any]:
    print(f"[AUTH_VERIFY_ROUTE] verify-app-access start app={payload.app!r} hasAuth={bool(authorization)}")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.replace("Bearer ", "").strip()
    decoded = verify_firebase_bearer_token(token)

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

    result = await resolve_ai_family_access(
        uid=uid,
        email=email,
        app_name=app_name,
    )
    print(
        f"[AUTH_VERIFY_ROUTE] verify-app-access success app={app_name} uid={uid} "
        f"allowed={result.get('allowed')} access={result.get('app_access')}"
    )
    return result
