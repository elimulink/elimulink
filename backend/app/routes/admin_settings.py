from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from ..auth import CurrentUser, get_current_user
from ..services.settings_store import get_settings, update_section, update_settings
from ..utils import err_response, ok_response


router = APIRouter()


def _check_admin(user: CurrentUser) -> bool:
    return user.role in {"super_admin", "institution_admin", "department_head", "lecturer"}


class SettingsUpdateRequest(BaseModel):
    payload: dict[str, Any] = Field(default_factory=dict)


class ProfileUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    photoUrl: str | None = None


class AIUpdate(BaseModel):
    aiEnabled: bool | None = None
    allowFees: bool | None = None
    allowResults: bool | None = None
    allowAttendance: bool | None = None
    guardrails: str | None = None
    auditAI: bool | None = None


@router.get("/api/admin/settings")
def read_settings(user: CurrentUser = Depends(get_current_user)):
    if not _check_admin(user):
        return err_response("FORBIDDEN", 403)
    return ok_response(text=None, data={"settings": get_settings()})


@router.put("/api/admin/settings")
def write_settings(req: SettingsUpdateRequest, user: CurrentUser = Depends(get_current_user)):
    if not _check_admin(user):
        return err_response("FORBIDDEN", 403)
    updated = update_settings(req.payload)
    return ok_response(text=None, data={"settings": updated})


@router.put("/api/admin/settings/profile")
def write_profile(req: ProfileUpdate, user: CurrentUser = Depends(get_current_user)):
    if not _check_admin(user):
        return err_response("FORBIDDEN", 403)
    updated = update_section("profile", req.model_dump(exclude_none=True))
    return ok_response(text=None, data={"settings": updated})


@router.put("/api/admin/settings/ai")
def write_ai(req: AIUpdate, user: CurrentUser = Depends(get_current_user)):
    if not _check_admin(user):
        return err_response("FORBIDDEN", 403)
    updated = update_section("ai", req.model_dump(exclude_none=True))
    return ok_response(text=None, data={"settings": updated})

