from __future__ import annotations


def get_summary() -> dict:
    return {
        "enrollment": {"value": 12542, "delta": 515, "deltaLabel": "this semester"},
        "courses": {"value": 327, "deltaPct": 14, "deltaLabel": "from last semester"},
        "revenue": {"value": 45800000, "currency": "KES", "deltaPct": 5.2, "deltaLabel": "this semester"},
        "avgGpa": {"value": 3.52, "delta": 0.08, "deltaLabel": "this semester"},
    }


def get_enrollment_trends() -> dict:
    return {"points": [14, 18, 19, 28, 30, 31, 39, 44, 46, 45, 55, 62]}


def get_students_at_risk() -> dict:
    return {
        "count": 52,
        "students": [
            {"id": "245678", "name": "Alice Njuguna", "year": 2, "gpa": 2.1, "attendance": "42%", "risk": "High Risk"},
            {"id": "234759", "name": "Tony Kamau", "year": 3, "gpa": 1.9, "attendance": "55%", "risk": "High Risk"},
            {"id": "229878", "name": "Sarah Mwangi", "year": 1, "gpa": 1.6, "attendance": "46%", "risk": "High Risk"},
            {"id": "217654", "name": "Matthew Kiprono", "year": 2, "gpa": 2.3, "attendance": "61%", "risk": "Medium Risk"},
            {"id": "258901", "name": "Joy Wanjiku", "year": 2, "gpa": 2.0, "attendance": "58%", "risk": "Medium Risk"},
        ],
    }


def get_dropout_risk() -> dict:
    return {"low": 62, "medium": 25, "high": 15}

