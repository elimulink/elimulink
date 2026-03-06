from __future__ import annotations

from typing import Any, Dict, List, Optional

from ..repositories.student_repository import (
    get_student_attendance,
    get_student_fee_balance,
    get_student_profile,
    get_student_results,
    get_student_timetable,
    get_student_units,
)


def get_profile(db, user_id: str) -> Optional[Dict[str, Any]]:
    return get_student_profile(db, user_id)


def get_timetable(db, user_id: str) -> List[Dict[str, Any]]:
    return get_student_timetable(db, user_id)


def get_fee_balance(db, user_id: str) -> Optional[Dict[str, Any]]:
    return get_student_fee_balance(db, user_id)


def get_results(db, user_id: str) -> List[Dict[str, Any]]:
    return get_student_results(db, user_id)


def get_attendance(db, user_id: str) -> List[Dict[str, Any]]:
    return get_student_attendance(db, user_id)


def get_units(db, user_id: str) -> List[Dict[str, Any]]:
    return get_student_units(db, user_id)
