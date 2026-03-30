from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import CurrentUser, get_current_user
from ..database import SessionLocal
from ..models.academics import AcademicRecord
from ..models.student import StudentUnit


router = APIRouter(prefix="/api/courses", tags=["Courses"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _assert_courses_access(user: CurrentUser, requested_user_id: str) -> None:
    normalized = str(requested_user_id or "").strip()
    if not normalized:
        raise HTTPException(status_code=400, detail="User id is required")
    if user.claims and user.claims.get("dev"):
        return
    if normalized == str(user.uid):
        return
    if user.role in {"institution_admin", "department_head", "lecturer", "student"}:
        return
    raise HTTPException(status_code=403, detail="Forbidden")


def _serialize_course_row(row: StudentUnit) -> dict:
    return {
        "code": str(row.code or ""),
        "name": str(row.name or row.code or "Untitled unit"),
        "term": str(row.term or ""),
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


@router.get("")
def list_courses(
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(StudentUnit)
        .filter(StudentUnit.user_id == user.uid)
        .order_by(StudentUnit.created_at.desc(), StudentUnit.id.desc())
        .all()
    )
    seen: set[str] = set()
    courses = []
    for row in rows:
        code = str(row.code or "").strip()
        if not code or code in seen:
            continue
        seen.add(code)
        courses.append(_serialize_course_row(row))
    return {"ok": True, "courses": courses}


@router.get("/{user_id}")
def get_courses_summary(
    user_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _assert_courses_access(user, user_id)
    unit_rows = (
        db.query(StudentUnit)
        .filter(StudentUnit.user_id == str(user_id))
        .order_by(StudentUnit.created_at.desc(), StudentUnit.id.desc())
        .all()
    )
    academic_rows = (
        db.query(AcademicRecord)
        .filter(AcademicRecord.user_id == str(user_id))
        .order_by(AcademicRecord.created_at.desc(), AcademicRecord.id.desc())
        .all()
    )

    seen: set[str] = set()
    courses = []
    term_counts: dict[str, int] = {}
    for row in unit_rows:
        code = str(row.code or "").strip()
        term = str(row.term or "").strip()
        if term:
            term_counts[term] = term_counts.get(term, 0) + 1
        if not code or code in seen:
            continue
        seen.add(code)
        courses.append(_serialize_course_row(row))

    latest_term = ""
    if unit_rows:
        latest_term = str(unit_rows[0].term or "")
    elif academic_rows:
        latest_term = str(academic_rows[0].term or "")

    latest_status = str(academic_rows[0].status or "Active") if academic_rows else "Active"

    overview = {
        "registered_units": len(courses),
        "terms_tracked": len(term_counts),
        "active_term": latest_term or "Current term",
        "status": latest_status,
        "materials_count": len(courses),
    }

    return {
        "ok": True,
        "courses": courses,
        "overview": overview,
        "registered_units": courses,
        "materials": courses,
    }
