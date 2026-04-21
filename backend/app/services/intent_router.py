from __future__ import annotations

import re
from typing import Any, Mapping

from .chemistry_service import is_chemistry_prompt
from .math_service import is_math_prompt
from .physics_service import is_physics_prompt
from .research_service import is_research_prompt
from .workflow_service import is_workflow_prompt


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

CASUAL_CONVERSATION_PATTERNS = (
    re.compile(r"^(?:hi|hello|hey|good\s+(?:morning|afternoon|evening))\b[.!?]*$", re.IGNORECASE),
    re.compile(
        r"^(?:i(?:'m| am)\s+good(?:\s+what\s+about\s+you)?|how\s+are\s+you(?:\s+doing)?|what(?:'s| is)\s+your\s+name|"
        r"who\s+are\s+you|do\s+you\s+have\s+feelings|why\s+do(?:n't| not)\s+you\s+have\s+feelings|can\s+you\s+feel)\b[?!.\s]*$",
        re.IGNORECASE,
    ),
    re.compile(r"^(?:thanks|thank\s+you)\b[.!?]*$", re.IGNORECASE),
)

CONVERSATIONAL_LEAD_IN_PATTERN = re.compile(
    r"^(?:(?:okay|ok|alright|well|so|then|now|right|cool|nice|interesting|that's interesting|that is interesting|"
    r"fair enough|got it|i see|by the way|hmm|mm|uhm|uh)\b[,\.\s-]*)+",
    re.IGNORECASE,
)

EXPLICIT_NEW_TOPIC_PATTERNS = (
    re.compile(
        r"^(?:what is|what are|what's|who is|who are|who's|why|how|how are you|can you|do you|are you|define|"
        r"explain|describe|summari[sz]e|outline|tell me about)\s+.+$",
        re.IGNORECASE,
    ),
    re.compile(r"^(?:show|show me|find|find me|get|search|browse)\s+.+$", re.IGNORECASE),
    re.compile(r"^(?:i need|i want)\s+(?:images?|pictures?|photos?|diagrams?|sources?|references?)\s+.+$", re.IGNORECASE),
)

FOLLOW_UP_LANGUAGE_PATTERN = re.compile(
    r"\b(?:continue|explain|say|reply|answer|write|translate|summari[sz]e|simplify)\s+(?:that\s+|this\s+)?"
    r"(?:in|using)\s+(english|swahili|kiswahili)\b",
    re.IGNORECASE,
)
SOURCE_FOLLOW_UP_PATTERN = re.compile(
    r"^(?:with\s+(?:sources|citations|references)|add\s+(?:sources|citations|references)|"
    r"give\s+me\s+(?:sources|citations|references)(?:\s+for\s+(?:it|this|that|them))?|"
    r"can\s+you\s+(?:add|give)\s+(?:sources|citations|references)(?:\s+for\s+(?:it|this|that|them))?|"
    r"cite\s+(?:this|that|it|them)|references?\s+for\s+(?:this|that|it|them))$",
    re.IGNORECASE,
)
FOLLOW_UP_PRONOUN_PATTERN = re.compile(r"\b(?:it|they|them|this|that|there|he|she|those|these)\b", re.IGNORECASE)
CONTEXTUAL_FOLLOW_UP_PATTERN = re.compile(
    r"\b(?:sources?|citations?|references?|example|examples|steps?|break\s+it\s+down|simplify|summari[sz]e|"
    r"explain|expand|more\s+details|go\s+deeper|translate)\b",
    re.IGNORECASE,
)

TOOL_PATTERNS = {
    "fee_balance": (
        re.compile(r"\b(?:fee balance|fees balance|fee statement|invoice|payment status|outstanding fees?)\b", re.IGNORECASE),
        re.compile(r"\b(?:my|student)\s+fees?\b", re.IGNORECASE),
    ),
    "timetable": (
        re.compile(r"\b(?:timetable|class schedule|lesson schedule|when is my class)\b", re.IGNORECASE),
    ),
    "results": (
        re.compile(r"\b(?:my results|exam results|grades?|gpa|score report|result slip)\b", re.IGNORECASE),
    ),
    "attendance": (
        re.compile(r"\b(?:attendance|present|absent|attendance report)\b", re.IGNORECASE),
    ),
    "units": (
        re.compile(r"\b(?:my units|my courses|registered units|registered courses|subjects am taking|subjects i am taking)\b", re.IGNORECASE),
    ),
    "announcements": (
        re.compile(r"\b(?:announcements?|notices?|institution updates?|school updates?)\b", re.IGNORECASE),
    ),
    "profile": (
        re.compile(r"\b(?:my profile|show profile|open profile|my email|my department|my institution email)\b", re.IGNORECASE),
    ),
    "institution_analytics": (
        re.compile(r"\b(?:analytics dashboard|institution analytics|enrollment analytics|performance analytics|enrollment summary|performance summary|analytics report)\b", re.IGNORECASE),
    ),
}


def _clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())


def _strip_conversational_lead_in(value: str) -> str:
    clean = _clean_text(value)
    previous = None
    while clean and clean != previous:
        previous = clean
        clean = CONVERSATIONAL_LEAD_IN_PATTERN.sub("", clean)
        clean = re.sub(r"^(?:and|but|then)\b[,\.\s-]*", "", clean, flags=re.IGNORECASE).strip()
    return clean


def _is_casual_conversation(value: str) -> bool:
    clean = _strip_conversational_lead_in(value)
    return any(pattern.match(clean) for pattern in CASUAL_CONVERSATION_PATTERNS)


def _is_hard_new_topic(value: str) -> bool:
    clean = _strip_conversational_lead_in(value)
    if not clean:
        return False
    if re.match(r"^(?:yes|yeah|yep|okay|ok|sure|continue|go on|go ahead|do that)$", clean, re.IGNORECASE):
        return False
    if FOLLOW_UP_LANGUAGE_PATTERN.search(clean):
        return False
    if SOURCE_FOLLOW_UP_PATTERN.match(clean):
        return False
    if len(clean) <= 120 and FOLLOW_UP_PRONOUN_PATTERN.search(clean) and CONTEXTUAL_FOLLOW_UP_PATTERN.search(clean):
        return False
    if _is_casual_conversation(clean):
        return True
    return any(pattern.match(clean) for pattern in EXPLICIT_NEW_TOPIC_PATTERNS)


def _explicit_image_generation(value: str) -> bool:
    normalized = _clean_text(value)
    return bool(normalized and any(pattern.match(normalized) for pattern in IMAGE_GENERATION_PATTERNS))


def _tool_intent(value: str) -> str:
    for intent, patterns in TOOL_PATTERNS.items():
        if any(pattern.search(value) for pattern in patterns):
            return intent
    return ""


def detect_intent(message: str, request_metadata: Mapping[str, Any] | None = None) -> str:
    normalized = _clean_text(message)
    meta = request_metadata or {}
    route_hint = str(meta.get("routeHint") or "").strip().lower()
    follow_up = bool(meta.get("followUp"))
    follow_up_type = str(meta.get("followUpType") or "").strip().upper()
    pending_assistant_mode = str(meta.get("pendingAssistantMode") or "").strip().lower()
    new_topic = bool(meta.get("newTopic"))

    if follow_up and not new_topic:
        if pending_assistant_mode in {"math_solver", "physics_solver", "chemistry_solver", "research_with_sources"}:
            return pending_assistant_mode
        if follow_up_type == "ADD_SOURCES" or route_hint == "research_with_sources" or is_research_prompt(normalized):
            return "research_with_sources"
        return "general_chat"

    if _is_hard_new_topic(normalized):
        return "general_chat"

    if _explicit_image_generation(normalized):
        return "image_generation"

    if route_hint == "research_with_sources" or is_research_prompt(normalized):
        return "research_with_sources"

    if is_chemistry_prompt(normalized):
        return "chemistry_solver"
    if is_physics_prompt(normalized):
        return "physics_solver"
    if is_math_prompt(normalized):
        return "math_solver"

    if route_hint in {"chemistry_solver", "physics_solver", "math_solver"}:
        return route_hint

    if route_hint == "workflow_assistant" or is_workflow_prompt(normalized):
        return "workflow_assistant"

    if route_hint == "general_chat" or _is_casual_conversation(normalized):
        return "general_chat"

    tool_intent = _tool_intent(normalized)
    if tool_intent:
        return tool_intent

    return "general_chat"
