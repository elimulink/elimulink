from __future__ import annotations

from pydantic import BaseModel


class AIRequest(BaseModel):
    message: str


class GroupCreate(BaseModel):
    name: str
    admin_id: str | None = None


class GroupJoin(BaseModel):
    group_id: int
    user_id: str | None = None


class GroupMemberOut(BaseModel):
    id: int
    group_id: int
    user_id: str
    role: str

    class Config:
        from_attributes = True
