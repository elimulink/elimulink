from __future__ import annotations

import re
from typing import Any, Dict


COMPARISON_TABLE_PATTERN = re.compile(
    r"\b(?:"
    r"compare(?:\s+.+?\s+and\s+.+)?|"
    r"difference between|"
    r"\bvs\b|"
    r"versus|"
    r"put this in a table|"
    r"tabulate|"
    r"compare in rows and columns|"
    r"pros and cons(?:\s+of)?|"
    r"similarities and differences between"
    r")\b",
    re.IGNORECASE,
)


def detect_structured_output_intent(message: str) -> Dict[str, Any]:
    text = str(message or "").strip()
    if not text:
        return {"comparison_or_table": False}

    matched = bool(COMPARISON_TABLE_PATTERN.search(text))
    if not matched:
        return {"comparison_or_table": False}

    lower = text.lower()
    explicit_table = any(
        phrase in lower
        for phrase in (
            "put this in a table",
            "tabulate",
            "rows and columns",
            "in a table",
            "table format",
        )
    )
    pros_and_cons = "pros and cons" in lower or (
        "advantages" in lower and "disadvantages" in lower
    )
    return {
        "comparison_or_table": True,
        "prefer_table": explicit_table or "compare" in lower or "difference between" in lower or " vs " in lower or "versus" in lower,
        "pros_and_cons": pros_and_cons,
    }


def build_structured_output_guidance(message: str) -> str:
    intent = detect_structured_output_intent(message)
    if not intent.get("comparison_or_table"):
        return ""

    if intent.get("prefer_table"):
        return (
            "STRUCTURED_OUTPUT_RULE: The user is asking for a comparison or table-style answer. "
            "If the answer fits cleanly in 2 to 3 columns, return a compact markdown table with short headers and readable rows. "
            "Prefer headers such as Feature, Option A, Option B or Topic, X, Y. "
            "Keep cells concise and mobile-friendly. "
            "Return the table as a standalone markdown table with a blank line before and after it. "
            "Do not mix table pipes into normal prose lines. "
            "If the content would become too wide or crowded, do not force a table. "
            "Instead use a compact comparison block format like:\n"
            "Feature\n"
            "- X: ...\n"
            "- Y: ...\n"
            "Repeat for each feature.\n"
            "Do not add unnecessary extra columns."
        )

    return (
        "STRUCTURED_OUTPUT_RULE: The user is asking for structured comparison output. "
        "Use a concise comparison list or pros/cons block. "
        "Use short feature labels and keep the answer easy to scan on mobile."
    )
