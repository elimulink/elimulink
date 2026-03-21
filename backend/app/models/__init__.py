from __future__ import annotations

from ..database import Base
from .tenant import Tenant
from .user import User, Group, GroupMember
from .chat import ChatSession, ChatMessage, ChatMemory
from .student import StudentProfile, StudentUnit, StudentResult, StudentTimetable
from .academics import AcademicRecord
from .finance import StudentFinance
from .attendance import AttendanceRecord
from .announcement import Announcement
from .ai_log import AiRequestLog
from .research import Conversation, Message, Source, MessageSource, ShareLink, ShareLinkMessage

__all__ = [
    "Base",
    "Tenant",
    "User",
    "Group",
    "GroupMember",
    "ChatSession",
    "ChatMessage",
    "ChatMemory",
    "StudentProfile",
    "StudentUnit",
    "StudentResult",
    "StudentTimetable",
    "AcademicRecord",
    "StudentFinance",
    "AttendanceRecord",
    "Announcement",
    "AiRequestLog",
    "Conversation",
    "Message",
    "Source",
    "MessageSource",
    "ShareLink",
    "ShareLinkMessage",
]
