from __future__ import annotations

from fastapi import APIRouter, Depends

from ..auth import CurrentUser, get_current_user
from ..services.analytics_service import (
    get_dropout_risk,
    get_enrollment_trends,
    get_students_at_risk,
    get_summary,
)
from ..utils import err_response, ok_response


router = APIRouter()


def _check_admin(user: CurrentUser) -> bool:
    return user.role in {"super_admin", "institution_admin", "department_head", "lecturer"}


@router.get("/api/admin/analytics/summary")
def summary(user: CurrentUser = Depends(get_current_user)):
    if not _check_admin(user):
        return err_response("FORBIDDEN", 403)
    return ok_response(text=None, data=get_summary())


@router.get("/api/admin/analytics/enrollment-trends")
def enrollment_trends(user: CurrentUser = Depends(get_current_user)):
    if not _check_admin(user):
        return err_response("FORBIDDEN", 403)
    return ok_response(text=None, data=get_enrollment_trends())


@router.get("/api/admin/analytics/students-at-risk")
def students_at_risk(user: CurrentUser = Depends(get_current_user)):
    if not _check_admin(user):
        return err_response("FORBIDDEN", 403)
    return ok_response(text=None, data=get_students_at_risk())


@router.get("/api/admin/analytics/dropout-risk")
def dropout_risk(user: CurrentUser = Depends(get_current_user)):
    if not _check_admin(user):
        return err_response("FORBIDDEN", 403)
    return ok_response(text=None, data=get_dropout_risk())

