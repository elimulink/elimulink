from __future__ import annotations

import re


_MATH_GRAPH_TRIGGER = re.compile(
    r"\b("
    r"graph|plot|curve|coordinate|axes|axis|triangle|vector|geometry|"
    r"shape|quadratic|straight[- ]line|line graph|coordinate diagram"
    r")\b",
    re.IGNORECASE,
)

_LINEAR_GRAPH = re.compile(r"\by\s*=\s*[-+]?\d*\.?\d*x(?:\s*[-+]\s*\d+\.?\d*)?\b", re.IGNORECASE)
_QUADRATIC_GRAPH = re.compile(r"\by\s*=\s*[-+]?\d*\.?\d*x\^?2(?:\s*[-+]\s*\d*\.?\d*x)?(?:\s*[-+]\s*\d+\.?\d*)?\b", re.IGNORECASE)
_POINTS_PATTERN = re.compile(r"\b[A-Z]\s*\(\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*\)")

_BASE_GRAPH_STYLE = (
    "Render this as a clean educational coordinate or geometry sketch for study support. "
    "Do not present it as a mathematically exact plotted graph. "
    "Use thin dark lines, a white or very light background, readable labels, balanced spacing, "
    "and an exam-friendly notebook/textbook look. "
    "Avoid photorealism, artistic shading, decorative color, clutter, heavy textures, or dramatic effects."
)


def is_math_graph_prompt(prompt: str) -> bool:
    value = str(prompt or "").strip()
    if not value:
        return False
    if _MATH_GRAPH_TRIGGER.search(value):
        return True
    return bool(re.search(r"\b(?:draw|plot|sketch|show|illustrate)\b[\s\S]*\by\s*=", value, re.IGNORECASE))


def build_math_graph_style_prompt(prompt: str) -> str:
    raw_prompt = str(prompt or "").strip()
    if not raw_prompt:
        return raw_prompt

    extra_rules: list[str] = [
        "Keep labels neat, lines thin, and the layout easy to read on mobile or in study notes.",
        "If the request mentions a graph or plot, treat the result as an instructional sketch rather than a guaranteed exact graph.",
    ]

    if _LINEAR_GRAPH.search(raw_prompt) or _QUADRATIC_GRAPH.search(raw_prompt):
        extra_rules.append(
            "Use neat coordinate axes with readable axis labels, a sensible viewing window, and a clearly sketched curve or straight line."
        )
    if _POINTS_PATTERN.search(raw_prompt) or re.search(r"\bcoordinate\b", raw_prompt, re.IGNORECASE):
        extra_rules.append(
            "Sketch named points clearly on the coordinate plane and place point labels so they do not overlap."
        )
    if re.search(r"\btriangle\b", raw_prompt, re.IGNORECASE):
        extra_rules.append(
            "Draw a simple geometry sketch with clean segments and clearly labeled vertices."
        )
    if re.search(r"\bvector\b", raw_prompt, re.IGNORECASE):
        extra_rules.append(
            "Use a crisp arrow with clear start/end labeling and a simple coordinate reference if helpful."
        )
    if re.search(r"\bshape\b", raw_prompt, re.IGNORECASE):
        extra_rules.append(
            "Keep the shape simple, symmetric where appropriate, and clearly outlined without decorative embellishment."
        )

    return (
        f"{raw_prompt}\n\n"
        "Math Sketch Guidance:\n"
        f"{_BASE_GRAPH_STYLE}\n"
        f"{' '.join(extra_rules)}\n"
        "If axes are present, keep tick marks and labels neat and uncluttered, and avoid implying exact plotting accuracy unless exact coordinates were supplied."
    ).strip()
