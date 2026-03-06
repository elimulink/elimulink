from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String

from ..database import Base


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    unit_code = Column(String, nullable=True)
    status = Column(String, nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow)
