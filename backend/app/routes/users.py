from __future__ import annotations

from fastapi import APIRouter


router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("")
def get_users():
    return [{"id": 1, "name": "John Doe"}]
