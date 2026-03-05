from __future__ import annotations

from fastapi import APIRouter


router = APIRouter(prefix="/api/results", tags=["Results"])


@router.get("/{user_id}")
def get_results(user_id: str):
    return {
        "gpa": 3.5,
        "cgpa": 3.3,
        "semester": [
            {"course": "Data Structures", "grade": "B+"},
            {"course": "Calculus", "grade": "A-"},
        ],
        "user_id": user_id,
    }
