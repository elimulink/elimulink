from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import CurrentUser, get_current_user
from ..database import SessionLocal
from ..models.finance import StudentFinance


router = APIRouter(prefix="/api/finance", tags=["Finance"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _assert_finance_access(user: CurrentUser, requested_user_id: str) -> None:
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


def _serialize_finance(user_id: str, record: StudentFinance | None) -> dict:
    currency = str(getattr(record, "currency", None) or "KES")
    balance = float(getattr(record, "balance", 0) or 0)
    updated_at = getattr(record, "updated_at", None)
    if balance > 0:
        status = "Outstanding"
    elif balance < 0:
        status = "Credit"
    else:
        status = "Cleared"

    entries = [
        {
            "id": "balance",
            "title": "Current balance",
            "amount": f"{currency} {balance:,.0f}",
            "status": status,
            "context": f"Last updated {updated_at.date().isoformat()}" if updated_at else "Latest finance update",
            "type": "Balance",
        },
        {
            "id": "status",
            "title": "Account status",
            "amount": status,
            "status": "Available",
            "context": "Derived from the current finance balance record",
            "type": "Status",
        },
    ]

    return {
        "user_id": str(user_id),
        "currency": currency,
        "balance": balance,
        "status": status,
        "updated_at": updated_at.isoformat() if updated_at else None,
        "summary": {
            "balance": f"{currency} {balance:,.0f}",
            "paid": "Not available",
            "charges": "Not available",
            "status": status,
        },
        "entries": entries,
    }


@router.get("/{user_id}")
def finance(
    user_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _assert_finance_access(user, user_id)
    record = (
        db.query(StudentFinance)
        .filter(StudentFinance.user_id == str(user_id))
        .order_by(StudentFinance.updated_at.desc(), StudentFinance.id.desc())
        .first()
    )
    return _serialize_finance(user_id, record)
