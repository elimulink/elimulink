from __future__ import annotations

from fastapi import APIRouter


router = APIRouter(prefix="/api/audit", tags=["Audit"])


@router.get("")
def audit_logs():
    return [{"action": "Created course", "user_id": 1}]
