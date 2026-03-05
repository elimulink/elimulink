from __future__ import annotations

from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)


class Group(Base):
    __tablename__ = "groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    admin_id = Column(String, ForeignKey("users.id"))

    admin = relationship("User")
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")


class GroupMember(Base):
    __tablename__ = "group_members"
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"))
    user_id = Column(String, ForeignKey("users.id"))
    role = Column(String)

    group = relationship("Group", back_populates="members")
    user = relationship("User")
