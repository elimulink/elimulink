from __future__ import annotations

from fastapi import APIRouter


router = APIRouter(prefix="/api/finance", tags=["Finance"])


@router.get("/{user_id}")
def finance(user_id: str):
    return {"user_id": user_id, "balance": 15000}
