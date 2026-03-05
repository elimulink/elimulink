from __future__ import annotations

from fastapi import APIRouter


router = APIRouter(prefix="/api/announcements", tags=["Announcements"])


@router.get("")
def list_announcements():
    return [{"title": "Exam Week", "content": "Exams start Monday"}]
