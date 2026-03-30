from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, String, Text

from ..database import Base


class AssignmentRecord(Base):
    __tablename__ = "assignment_records"

    id = Column(String, primary_key=True, index=True)
    owner_uid = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    course = Column(String, nullable=True, index=True)
    due = Column(String, nullable=True)
    status = Column(String, nullable=False, default="Not Started")
    is_archived = Column(Boolean, nullable=False, default=False)
    archived_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
