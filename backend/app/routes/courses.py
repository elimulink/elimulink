from __future__ import annotations

from fastapi import APIRouter


router = APIRouter(prefix="/api/courses", tags=["Courses"])


@router.get("")
def list_courses():
    return [{"code": "CSC101", "name": "Intro to CS"}]
