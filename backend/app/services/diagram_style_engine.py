from __future__ import annotations

import re

from .subject_diagram_pack import build_subject_diagram_pack, detect_diagram_subject, detect_diagram_type


_DIAGRAM_STYLE_TRIGGER = re.compile(
    r"\b("
    r"diagram|sketch|labeled|labelled|illustrate|process|flow(?:chart)?|"
    r"force diagram|ray diagram|circuit diagram|vector|triangle|geometry|"
    r"coordinate|graph|plot|plant cell|heart|nephron|life cycle|"
    r"water purification|apparatus|atom structure|bonding"
    r")\b",
    re.IGNORECASE,
)

_BIOLOGY_TERMS = re.compile(r"\b(plant cell|heart|nephron|life cycle|anatomy|organelle|biology)\b", re.IGNORECASE)
_CHEMISTRY_TERMS = re.compile(r"\b(water purification|apparatus|atom|bonding|reaction setup|chemistry|molecule)\b", re.IGNORECASE)
_PHYSICS_TERMS = re.compile(r"\b(force|ray|circuit|vector|motion|physics)\b", re.IGNORECASE)
_MATH_TERMS = re.compile(r"\b(triangle|geometry|coordinate|graph|plot|curve|math|angle)\b", re.IGNORECASE)

_BASE_DIAGRAM_STYLE = (
    "Render this as a clean academic diagram, not a decorative artwork. "
    "Use thin outlines, neat readable labels, a white or very light background, balanced spacing, "
    "simple arrows or connector lines only where needed, and a clear textbook/notebook presentation. "
    "Keep the composition minimal, exam-friendly, note-friendly, and instructional. "
    "Avoid photorealism, painterly effects, dramatic colors, heavy shading, clutter, textures, and artistic styling. "
    "This output should remain an AI-generated instructional sketch unless exact validated templates are explicitly provided."
)

_BIOLOGY_STYLE = (
    "Use clean biological boundaries, tidy callout labels, simple internal structures, uncluttered annotation placement, and standard biological terms only."
)
_CHEMISTRY_STYLE = (
    "Use clean apparatus or structure outlines, simple process arrows, clear labels, and a sparse laboratory/textbook sketch style with logically ordered stages."
)
_PHYSICS_STYLE = (
    "Use precise arrows, direction markers, simple components, crisp linework, and easy-to-read force or circuit labels with no decorative background."
)
_MATH_STYLE = (
    "Use crisp geometric lines, simple points and labels, accurate shape proportions, and a plain classroom-board or notebook diagram style."
)


def is_diagram_style_prompt(prompt: str) -> bool:
    value = str(prompt or "").strip()
    if not value:
        return False
    return bool(_DIAGRAM_STYLE_TRIGGER.search(value))


def build_diagram_style_prompt(prompt: str) -> str:
    raw_prompt = str(prompt or "").strip()
    if not raw_prompt:
        return raw_prompt

    subject_pack = build_subject_diagram_pack(raw_prompt)
    subject_styles: list[str] = []
    if _BIOLOGY_TERMS.search(raw_prompt):
        subject_styles.append(_BIOLOGY_STYLE)
    if _CHEMISTRY_TERMS.search(raw_prompt):
        subject_styles.append(_CHEMISTRY_STYLE)
    if _PHYSICS_TERMS.search(raw_prompt):
        subject_styles.append(_PHYSICS_STYLE)
    if _MATH_TERMS.search(raw_prompt):
        subject_styles.append(_MATH_STYLE)

    if not subject_styles:
        subject_styles.append(
            "Keep labels clean, linework thin, spacing balanced, and the overall diagram suitable for study notes."
        )
    if subject_pack["rules"]:
        subject_styles.append(subject_pack["rules"])

    return (
        f"{raw_prompt}\n\n"
        "Diagram Style Engine:\n"
        f"{_BASE_DIAGRAM_STYLE}\n"
        f"{' '.join(subject_styles)}\n"
        "If labels are needed, make them short, neat, clearly placed, and limited to the main requested structures or stages."
    ).strip()


__all__ = [
    "build_diagram_style_prompt",
    "build_subject_diagram_pack",
    "detect_diagram_subject",
    "detect_diagram_type",
    "is_diagram_style_prompt",
]
