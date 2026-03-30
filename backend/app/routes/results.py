from __future__ import annotations

from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import CurrentUser, get_current_user
from ..database import SessionLocal
from ..models.student import StudentResult, StudentUnit


router = APIRouter(prefix="/api/results", tags=["Results"])


GRADE_POINTS = {
    "A": 4.0,
    "A-": 3.7,
    "B+": 3.3,
    "B": 3.0,
    "B-": 2.7,
    "C+": 2.3,
    "C": 2.0,
    "C-": 1.7,
    "D+": 1.3,
    "D": 1.0,
    "D-": 0.7,
    "E": 0.0,
    "F": 0.0,
}


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _assert_results_access(user: CurrentUser, requested_user_id: str) -> None:
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


def _grade_point(grade: str | None) -> float:
    value = str(grade or "").strip().upper()
    return GRADE_POINTS.get(value, 0.0)


def _term_sort_key(term: str) -> tuple[int, str]:
    text = str(term or "").strip()
    numbers = [int(part) for part in text.replace("/", " ").replace("-", " ").split() if part.isdigit()]
    return (numbers[-1] if numbers else -1, text)


def _load_results_rows(db: Session, user_id: str) -> list[StudentResult]:
    return (
        db.query(StudentResult)
        .filter(StudentResult.user_id == str(user_id))
        .order_by(StudentResult.created_at.desc(), StudentResult.id.desc())
        .all()
    )


def _load_unit_lookup(db: Session, user_id: str) -> dict[str, StudentUnit]:
    rows = (
        db.query(StudentUnit)
        .filter(StudentUnit.user_id == str(user_id))
        .order_by(StudentUnit.created_at.desc(), StudentUnit.id.desc())
        .all()
    )
    lookup: dict[str, StudentUnit] = {}
    for row in rows:
      if row.code and row.code not in lookup:
        lookup[row.code] = row
    return lookup


def _serialize_result_row(row: StudentResult, unit_lookup: dict[str, StudentUnit]) -> dict:
    code = str(row.unit_code or f"UNIT-{row.id}")
    unit = unit_lookup.get(code)
    score = float(row.score) if row.score is not None else None
    term = str(row.term or "Published")
    credits = 3
    return {
        "id": f"{code}:{term}",
        "code": code,
        "name": str(unit.name or code) if unit else code,
        "grade": str(row.grade or "N/A"),
        "score": score,
        "total": score,
        "cat": None,
        "exam": None,
        "credits": credits,
        "remark": "Pass" if _grade_point(row.grade) > 0 else "Review",
        "term": term,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def _build_results_payload(rows: list[StudentResult], unit_lookup: dict[str, StudentUnit], user_id: str) -> dict:
    if not rows:
        return {
            "user_id": str(user_id),
            "gpa": 0,
            "cgpa": 0,
            "credits": 0,
            "standing": "No published results",
            "current_term": "",
            "semester": [],
            "terms": [],
            "transcript": [],
            "trends": {"gpa": [], "credits": []},
            "grade_distribution": {"A": 0, "B": 0, "C": 0, "D": 0, "E": 0},
        }

    serialized = [_serialize_result_row(row, unit_lookup) for row in rows]
    grouped: dict[str, list[dict]] = defaultdict(list)
    for row in serialized:
        grouped[row["term"]].append(row)

    term_names = sorted(grouped.keys(), key=_term_sort_key)
    current_term = term_names[-1] if term_names else ""
    semester_rows = grouped.get(current_term, [])

    term_summaries = []
    gpa_trend = []
    credits_trend = []
    all_points = []
    total_credits = 0
    distribution = {"A": 0, "B": 0, "C": 0, "D": 0, "E": 0}

    for term in term_names:
        term_rows = grouped[term]
        credits = sum(int(row.get("credits") or 0) for row in term_rows)
        points = [_grade_point(row.get("grade")) for row in term_rows]
        scores = [float(row["score"]) for row in term_rows if row.get("score") is not None]
        term_gpa = round(sum(points) / len(points), 2) if points else 0
        avg_score = round(sum(scores) / len(scores), 2) if scores else None
        term_summaries.append(
            {
                "term": term,
                "gpa": term_gpa,
                "credits": credits,
                "average_score": avg_score,
                "courses": len(term_rows),
                "rows": term_rows,
            }
        )
        gpa_trend.append(term_gpa)
        credits_trend.append(credits)
        all_points.extend(points)
        total_credits += credits
        for row in term_rows:
            grade = str(row.get("grade") or "").upper()
            bucket = grade[0] if grade else ""
            if bucket in distribution:
                distribution[bucket] += 1

    cgpa = round(sum(all_points) / len(all_points), 2) if all_points else 0
    latest_gpa = term_summaries[-1]["gpa"] if term_summaries else 0
    if cgpa >= 3.0:
        standing = "Good Standing"
    elif cgpa >= 2.0:
        standing = "Academic Watch"
    else:
        standing = "Support Required"

    return {
        "user_id": str(user_id),
        "gpa": latest_gpa,
        "cgpa": cgpa,
        "credits": total_credits,
        "standing": standing,
        "current_term": current_term,
        "semester": semester_rows,
        "terms": [{"term": item["term"], "gpa": item["gpa"], "credits": item["credits"], "courses": item["courses"], "average_score": item["average_score"]} for item in term_summaries],
        "transcript": term_summaries,
        "trends": {"gpa": gpa_trend, "credits": credits_trend},
        "grade_distribution": distribution,
    }


@router.get("/{user_id}")
def get_results(
    user_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _assert_results_access(user, user_id)
    rows = _load_results_rows(db, user_id)
    lookup = _load_unit_lookup(db, user_id)
    return _build_results_payload(rows, lookup, user_id)


@router.get("/{user_id}/units/{unit_code}")
def get_result_detail(
    user_id: str,
    unit_code: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _assert_results_access(user, user_id)
    rows = _load_results_rows(db, user_id)
    lookup = _load_unit_lookup(db, user_id)
    matching = [row for row in rows if str(row.unit_code or "") == str(unit_code)]
    if not matching:
        raise HTTPException(status_code=404, detail="Result not found")

    latest = _serialize_result_row(matching[0], lookup)
    history = [_serialize_result_row(row, lookup) for row in reversed(matching)]
    return {
        "ok": True,
        "result": latest,
        "history": history,
    }
