from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..auth import CurrentUser, get_current_user
from ..database import SessionLocal
from ..models import Group, GroupMember, User
from ..schemas import GroupCreate, GroupJoin, GroupMemberOut


router = APIRouter(prefix="/api/groups", tags=["Groups"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_user(db: Session, user_id: str, name: str | None) -> User:
    existing = db.query(User).filter(User.id == user_id).first()
    if existing:
        return existing
    user = User(id=user_id, name=name or "User")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("")
def list_groups(
    q: str = Query(default="", max_length=120),
    limit: int = Query(default=20, ge=1, le=100),
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    search = str(q or "").strip()
    query = (
        db.query(Group)
        .outerjoin(GroupMember, GroupMember.group_id == Group.id)
        .filter(
            or_(
                Group.admin_id == user.uid,
                GroupMember.user_id == user.uid,
            )
        )
        .distinct()
    )
    if search:
        query = query.filter(Group.name.ilike(f"%{search}%"))

    groups = query.order_by(Group.name.asc()).limit(limit).all()
    return {
        "groups": [
            {
                "id": group.id,
                "name": group.name,
                "is_admin": group.admin_id == user.uid,
            }
            for group in groups
        ]
    }


@router.post("/create")
def create_group(
    data: GroupCreate,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role not in {"super_admin", "institution_admin", "department_head", "lecturer"}:
        raise HTTPException(status_code=403, detail="FORBIDDEN")

    admin_id = str(data.admin_id or user.uid)
    if admin_id != user.uid and user.role != "super_admin":
        raise HTTPException(status_code=403, detail="FORBIDDEN")

    ensure_user(db, admin_id, user.name or user.email or "Admin")

    group = Group(name=data.name, admin_id=admin_id)
    db.add(group)
    db.commit()
    db.refresh(group)

    member = GroupMember(group_id=group.id, user_id=admin_id, role="admin")
    db.add(member)
    db.commit()

    return {"message": "Group created", "group_id": group.id}


@router.post("/join")
def join_group(
    data: GroupJoin,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = str(data.user_id or user.uid)
    if user_id != user.uid and user.role != "super_admin":
        raise HTTPException(status_code=403, detail="FORBIDDEN")

    ensure_user(db, user_id, user.name or user.email or "Member")

    existing = (
        db.query(GroupMember)
        .filter(GroupMember.group_id == data.group_id, GroupMember.user_id == user_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already a member")

    member = GroupMember(group_id=data.group_id, user_id=user_id, role="member")
    db.add(member)
    db.commit()

    return {"message": "Joined group"}


@router.get("/{group_id}/members", response_model=list[GroupMemberOut])
def get_members(
    group_id: int,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    return members
