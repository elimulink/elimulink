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
from .assignment import AssignmentRecord
from .ai_log import AiRequestLog
from .feedback import BugReport
from .notification_preferences import UserNotificationPreference
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
    "AssignmentRecord",
    "AiRequestLog",
    "BugReport",
    "UserNotificationPreference",
    "Conversation",
    "Message",
    "Source",
    "MessageSource",
    "ShareLink",
    "ShareLinkMessage",
]
