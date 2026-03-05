from __future__ import annotations

from fastapi import APIRouter


router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.get("/weekly")
def weekly_report():
    return {
        "report": {
            "new_students": 12,
            "active_users": 230,
            "average_gpa": 3.12,
            "attendance_rate": 82,
        }
    }


@router.post("/weekly/generate")
def generate_weekly():
    return {
        "report": {
            "new_students": 12,
            "active_users": 230,
            "average_gpa": 3.12,
            "attendance_rate": 82,
        }
    }
