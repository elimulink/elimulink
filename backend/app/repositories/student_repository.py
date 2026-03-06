from __future__ import annotations

from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from ..models.attendance import AttendanceRecord
from ..models.finance import StudentFinance
from ..models.student import StudentProfile, StudentResult, StudentTimetable, StudentUnit


def get_student_profile(db: Session, user_id: str) -> Optional[Dict[str, Any]]:
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
    if not profile:
        return None
    return {
        "user_id": profile.user_id,
        "full_name": profile.full_name,
        "email": profile.email,
        "department": profile.department,
        "program": profile.program,
    }


def get_student_timetable(db: Session, user_id: str) -> List[Dict[str, Any]]:
    rows = db.query(StudentTimetable).filter(StudentTimetable.user_id == user_id).all()
    return [
        {
            "day": r.day,
            "start_time": r.start_time,
            "end_time": r.end_time,
            "unit_code": r.unit_code,
            "location": r.location,
        }
        for r in rows
    ]


def get_student_fee_balance(db: Session, user_id: str) -> Optional[Dict[str, Any]]:
    row = db.query(StudentFinance).filter(StudentFinance.user_id == user_id).first()
    if not row:
        return None
    return {"balance": row.balance, "currency": row.currency}


def get_student_results(db: Session, user_id: str) -> List[Dict[str, Any]]:
    rows = db.query(StudentResult).filter(StudentResult.user_id == user_id).all()
    return [
        {"unit_code": r.unit_code, "grade": r.grade, "score": r.score, "term": r.term}
        for r in rows
    ]


def get_student_attendance(db: Session, user_id: str) -> List[Dict[str, Any]]:
    rows = db.query(AttendanceRecord).filter(AttendanceRecord.user_id == user_id).all()
    return [{"unit_code": r.unit_code, "status": r.status, "recorded_at": r.recorded_at} for r in rows]


def get_student_units(db: Session, user_id: str) -> List[Dict[str, Any]]:
    rows = db.query(StudentUnit).filter(StudentUnit.user_id == user_id).all()
    return [{"code": r.code, "name": r.name, "term": r.term} for r in rows]
