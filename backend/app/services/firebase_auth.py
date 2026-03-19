import json
import os
from pathlib import Path

import firebase_admin
from fastapi import HTTPException
from firebase_admin import auth, credentials


SERVICE_ACCOUNT_PATH = Path(__file__).resolve().parents[1] / "keys" / "firebase-service-account.json"


def _load_service_account_credentials():
    sa_json = (os.getenv("FIREBASE_ADMIN_SA") or "").strip()
    if sa_json:
        return credentials.Certificate(json.loads(sa_json))

    google_credentials_path = (os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or "").strip()
    if google_credentials_path:
        credentials_path = Path(google_credentials_path).expanduser()
        if credentials_path.exists():
            return credentials.Certificate(str(credentials_path))

    if SERVICE_ACCOUNT_PATH.exists():
        return credentials.Certificate(str(SERVICE_ACCOUNT_PATH))

    return None


def _init_firebase_admin() -> None:
    if firebase_admin._apps:
        return

    cred = _load_service_account_credentials()
    if cred is not None:
        firebase_admin.initialize_app(cred)
        return

    raise HTTPException(
        status_code=500,
        detail="Firebase Admin credentials not configured",
    )


def verify_firebase_bearer_token(token: str):
    try:
        _init_firebase_admin()
        return auth.verify_id_token(token)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=401,
            detail=f"Firebase token verification failed: {exc}",
        ) from exc
