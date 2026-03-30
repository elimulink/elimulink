from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import CurrentUser, get_current_user
from ..database import SessionLocal
from ..models.assignment import AssignmentRecord


router = APIRouter(prefix="/api/assignments", tags=["Assignments"])


class AssignmentCreateRequest(BaseModel):
    title: str
    description: str | None = None
    course: str | None = None
    due: str | None = None
    status: str | None = None


class AssignmentUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    course: str | None = None
    due: str | None = None
    status: str | None = None
    is_archived: bool | None = None


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def serialize_assignment(record: AssignmentRecord) -> dict:
    return {
        "id": record.id,
        "owner_uid": record.owner_uid,
        "title": record.title,
        "description": record.description or "",
        "course": record.course or "",
        "due": record.due or "",
        "status": record.status or "Not Started",
        "is_archived": bool(record.is_archived),
        "created_at": record.created_at.isoformat() if record.created_at else None,
        "updated_at": record.updated_at.isoformat() if record.updated_at else None,
        "archived_at": record.archived_at.isoformat() if record.archived_at else None,
    }


def get_owned_assignment_or_404(db: Session, assignment_id: str, owner_uid: str) -> AssignmentRecord:
    record = (
        db.query(AssignmentRecord)
        .filter(
            AssignmentRecord.id == assignment_id,
            AssignmentRecord.owner_uid == owner_uid,
        )
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return record


@router.get("")
def list_assignments(
    include_archived: bool = Query(default=False),
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(AssignmentRecord)
        .filter(AssignmentRecord.owner_uid == user.uid)
        .order_by(AssignmentRecord.updated_at.desc(), AssignmentRecord.created_at.desc())
    )
    if not include_archived:
        query = query.filter(AssignmentRecord.is_archived.is_(False))
    rows = query.all()
    return {"ok": True, "assignments": [serialize_assignment(row) for row in rows]}


@router.post("/create")
def create_assignment(
    body: AssignmentCreateRequest,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    title = str(body.title or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Assignment title is required")

    record = AssignmentRecord(
        id=f"ASSG-{uuid4().hex[:8].upper()}",
        owner_uid=user.uid,
        title=title,
        description=str(body.description or "").strip() or None,
        course=str(body.course or "").strip() or None,
        due=str(body.due or "").strip() or None,
        status=str(body.status or "Not Started").strip() or "Not Started",
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return {
        "ok": True,
        "message": "Assignment created",
        "id": record.id,
        "assignment": serialize_assignment(record),
    }


@router.get("/{assignment_id}")
def get_assignment(
    assignment_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = get_owned_assignment_or_404(db, assignment_id, user.uid)
    return {"ok": True, "assignment": serialize_assignment(record)}


@router.patch("/{assignment_id}")
def update_assignment(
    assignment_id: str,
    body: AssignmentUpdateRequest,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = get_owned_assignment_or_404(db, assignment_id, user.uid)

    if body.title is not None:
        title = str(body.title).strip()
        if not title:
            raise HTTPException(status_code=400, detail="Assignment title is required")
        record.title = title
    if body.description is not None:
        record.description = str(body.description).strip() or None
    if body.course is not None:
        record.course = str(body.course).strip() or None
    if body.due is not None:
        record.due = str(body.due).strip() or None
    if body.status is not None:
        record.status = str(body.status).strip() or "Not Started"
    if body.is_archived is not None:
        record.is_archived = bool(body.is_archived)
        record.archived_at = datetime.utcnow() if record.is_archived else None

    db.commit()
    db.refresh(record)
    return {"ok": True, "assignment": serialize_assignment(record)}


@router.delete("/{assignment_id}")
def delete_assignment(
    assignment_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = get_owned_assignment_or_404(db, assignment_id, user.uid)
    db.delete(record)
    db.commit()
    return {"ok": True, "deleted_id": assignment_id}


@router.post("/ai")
async def assignment_ai(request: Request):
    body = await request.json()
    return {"message": "AI processed assignment", "input": body}
