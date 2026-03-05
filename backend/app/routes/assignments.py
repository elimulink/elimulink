from __future__ import annotations

from fastapi import APIRouter, Request


router = APIRouter(prefix="/api/assignments", tags=["Assignments"])


@router.post("/create")
async def create_assignment(request: Request):
    body = await request.json()
    title = (body or {}).get("title") or "Untitled"
    return {"message": "Assignment created", "assignment": {"id": 1, "title": title}}


@router.post("/ai")
async def assignment_ai(request: Request):
    body = await request.json()
    return {"message": "AI processed assignment", "input": body}
