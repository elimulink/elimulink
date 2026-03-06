from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String

from ..database import Base


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    tenant_id = Column(String, index=True)
    full_name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    department = Column(String, nullable=True)
    program = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class StudentUnit(Base):
    __tablename__ = "student_units"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    code = Column(String, nullable=False)
    name = Column(String, nullable=True)
    term = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class StudentResult(Base):
    __tablename__ = "student_results"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    unit_code = Column(String, nullable=True)
    grade = Column(String, nullable=True)
    score = Column(Float, nullable=True)
    term = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class StudentTimetable(Base):
    __tablename__ = "student_timetables"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    day = Column(String, nullable=True)
    start_time = Column(String, nullable=True)
    end_time = Column(String, nullable=True)
    unit_code = Column(String, nullable=True)
    location = Column(String, nullable=True)
