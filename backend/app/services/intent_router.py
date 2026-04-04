from __future__ import annotations

import re


IMAGE_GENERATION_PATTERNS = (
    re.compile(
        r"^(?:generate|create|make|draw|design|illustrate|render)\s+(?:me\s+)?(?:an?\s+)?"
        r"(?:the\s+)?(?:image|picture|photo|illustration|graphic|visual)\s+(?:of|for)?\s*.+$",
        re.IGNORECASE,
    ),
    re.compile(
        r"^(?:generate|create|make|draw|design|illustrate|render|show me)\s+(?:me\s+)?(?:an?\s+)?"
        r"(?:map|diagram|chart|poster|banner|flyer|infographic|logo)\s*(?:of|for)?\b.*$",
        re.IGNORECASE,
    ),
    re.compile(
        r"^(?:draw|sketch|paint)\s+(?:me\s+)?(?:an?\s+)?(?!conclusions?\b|a\s+conclusion\b).{2,}$",
        re.IGNORECASE,
    ),
    re.compile(
        r"^(?:make|create)\s+(?:me\s+)?(?:an?\s+)?picture\s+of\s+.+$",
        re.IGNORECASE,
    ),
)


INTENT_KEYWORDS = {
    "image_edit": [
        "make it simpler",
        "add labels",
        "make it realistic",
        "make it exam-style",
        "use white background",
        "remove the background",
        "make it cleaner",
        "add arrows",
        "simplify the diagram",
    ],
    "image_generation": [
        "generate an image",
        "generate me an image",
        "create an image",
        "create a picture",
        "make a picture",
        "make an image",
        "draw a",
        "draw me",
        "show me a",
        "show me an",
        "make a poster",
        "create a map",
        "diagram",
    ],
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
    normalized = (message or "").strip()
    if normalized and any(pattern.match(normalized) for pattern in IMAGE_GENERATION_PATTERNS):
        return "image_generation"
    for intent, keywords in INTENT_KEYWORDS.items():
        if any(k in text for k in keywords):
            return intent
    return "general_chat"
