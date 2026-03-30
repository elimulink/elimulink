from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..auth import CurrentUser, get_current_user
from ..database import SessionLocal
from ..models.feedback import BugReport


router = APIRouter(prefix="/api/v1/feedback", tags=["feedback"])


class BugReportCreateRequest(BaseModel):
    message: str = Field(..., min_length=12, max_length=4000)
    source_surface: str = Field(default="settings/report-bug", max_length=120)
    app: str = Field(default="institution", max_length=40)
    metadata: dict[str, Any] = Field(default_factory=dict)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/bug-reports")
def create_bug_report(
    body: BugReportCreateRequest,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    report = BugReport(
        uid=user.uid,
        email=user.email,
        name=user.name,
        role=user.role,
        app=str(body.app or "institution").strip().lower() or "institution",
        source_surface=str(body.source_surface or "settings/report-bug").strip() or "settings/report-bug",
        message=str(body.message or "").strip(),
        metadata_json=dict(body.metadata or {}),
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return {
        "ok": True,
        "bug_report": {
            "id": report.id,
            "created_at": report.created_at.isoformat() if report.created_at else None,
            "source_surface": report.source_surface,
            "app": report.app,
        },
        "message": "Bug report submitted.",
    }
