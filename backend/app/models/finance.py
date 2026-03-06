from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String

from ..database import Base


class StudentFinance(Base):
    __tablename__ = "student_finance"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    balance = Column(Float, nullable=True)
    currency = Column(String, nullable=True, default="KES")
    updated_at = Column(DateTime, default=datetime.utcnow)
