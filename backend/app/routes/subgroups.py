from __future__ import annotations

from fastapi import APIRouter, Request


router = APIRouter(prefix="/api/subgroups", tags=["Subgroups"])


@router.post("/create")
async def create_group(request: Request):
    body = await request.json()
    name = (body or {}).get("name") or "Untitled subgroup"
    return {"message": "Group created", "group": {"id": 1, "name": name}}


@router.get("/{group_id}")
def get_group(group_id: str):
    return {"group_id": group_id, "members": []}
