from __future__ import annotations


INTENT_KEYWORDS = {
    "fee_balance": ["fee", "balance", "invoice", "payment"],
    "timetable": ["timetable", "schedule", "class time"],
    "results": ["results", "grades", "gpa", "score"],
    "attendance": ["attendance", "present", "absent"],
    "units": ["units", "courses", "subjects"],
    "announcements": ["announcement", "notice", "update"],
    "profile": ["profile", "name", "email", "department"],
    "institution_analytics": ["analytics", "enrollment", "summary", "performance"],
}


def detect_intent(message: str) -> str:
    text = (message or "").lower()
    for intent, keywords in INTENT_KEYWORDS.items():
        if any(k in text for k in keywords):
            return intent
    return "general_chat"
