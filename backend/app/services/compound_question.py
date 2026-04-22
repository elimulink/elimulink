from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List


_NUMBERED_LINE_RE = re.compile(r"^\s*(?:\d+[.)]|[-*•])\s+(.*\S)\s*$")
_INLINE_NUMBERED_ITEM_RE = re.compile(r"(?<!^)(?<!\n)\s+(?=(?:\d+[.)])\s+\S)")
_SHORTNESS_RE = re.compile(r"\b(brief|short|concise|keep it short|keep it brief|in short|just the)\b", re.IGNORECASE)
_LIVE_LIMITATION_RE = re.compile(
    r"\b(current|today|latest|live|news|update|updates|recent|real[- ]time|right now)\b",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class CompoundQuestionAnalysis:
    is_compound: bool
    parts: List[str]
    brief: bool
    needs_live_limitations: bool


def _clean_text(value: str) -> str:
    return str(value or "").replace("\r\n", "\n").strip()


def _normalize_inline_numbering(value: str) -> str:
    return _INLINE_NUMBERED_ITEM_RE.sub("\n", str(value or ""))


def _split_clause_parts(message: str) -> List[str]:
    text = _clean_text(_normalize_inline_numbering(message))
    if not text:
        return []

    lines = [line.strip() for line in text.split("\n") if line.strip()]
    numbered = []
    for line in lines:
        match = _NUMBERED_LINE_RE.match(line)
        if match:
            numbered.append(match.group(1).strip())

    if numbered:
        return numbered

    normalized = re.sub(r"\s+", " ", text)
    normalized = normalized.replace(" Tell me:", " ").strip()
    candidate_segments = re.split(r"\s*(?:;|(?<=\?)\s+then\s+|\s+then\s+|\s+and then\s+|\s+also\s+)\s*", normalized, flags=re.IGNORECASE)
    candidate_segments = [segment.strip(" ,.") for segment in candidate_segments if segment.strip(" ,.")]

    if len(candidate_segments) >= 2:
        return candidate_segments

    if re.search(r"\band\b", normalized, re.IGNORECASE) and re.search(r"\b(compare|give|list|tell|explain|when would i use each|for each)\b", normalized, re.IGNORECASE):
        pieces = [piece.strip(" ,.") for piece in re.split(r"\s*,\s*and\s+|\s+and\s+(?=give|tell|compare|list|when|then)\s+", normalized, flags=re.IGNORECASE) if piece.strip(" ,.")]
        if len(pieces) >= 2:
            return pieces

    return []


def analyze_compound_question(message: str) -> CompoundQuestionAnalysis:
    text = _clean_text(message)
    parts = _split_clause_parts(text)
    brief = bool(_SHORTNESS_RE.search(text))
    needs_live_limitations = bool(_LIVE_LIMITATION_RE.search(text))
    return CompoundQuestionAnalysis(
        is_compound=len(parts) >= 2,
        parts=parts,
        brief=brief,
        needs_live_limitations=needs_live_limitations,
    )


def build_compound_request_context(message: str) -> str:
    analysis = analyze_compound_question(message)
    if not analysis.is_compound and not analysis.needs_live_limitations and not analysis.brief:
        return ""

    sections: list[str] = []
    if analysis.is_compound:
        parts_text = "\n".join(f"{index + 1}. {part}" for index, part in enumerate(analysis.parts))
        sections.append("COMPOUND_REQUEST:\n" + parts_text)
        sections.append(
            "COMPOUND_RULES:\n"
            "- Answer every requested part in order.\n"
            "- Do not stop after the first easy part.\n"
            "- Keep the same numbering.\n"
            "- Render each answer in a separate downward numbered block.\n"
            "- If a part cannot be verified here, say so briefly on that exact item."
        )

    if analysis.brief:
        sections.append("BREVITY:\n- Keep the answer short and clear.")

    if analysis.needs_live_limitations:
        sections.append(
            "LIMITATION_STYLE:\n"
            "- If the request asks for current/live news, do not give a long disclaimer.\n"
            "- Answer the parts you can, then add one short line for each live item you cannot verify."
        )

    return "\n\n".join(sections)
