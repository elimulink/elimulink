from __future__ import annotations

from fastapi import APIRouter


router = APIRouter(prefix="/api/attendance", tags=["Attendance"])


@router.get("/{user_id}")
def attendance(user_id: str):
    return {"user_id": user_id, "attendance_rate": 85}
