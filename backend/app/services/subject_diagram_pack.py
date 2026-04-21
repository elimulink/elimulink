from __future__ import annotations

import re


_BIOLOGY_SUBJECT_PATTERN = re.compile(
    r"\b("
    r"biology|cell|plant cell|animal cell|heart|nephron|digestive system|life cycle|"
    r"anatomy|organelle|chloroplast|nucleus|xylem|phloem|atrium|ventricle"
    r")\b",
    re.IGNORECASE,
)

_PHYSICS_SUBJECT_PATTERN = re.compile(
    r"\b("
    r"physics|force|motion|ray|mirror|lens|circuit|battery|resistor|current|voltage|"
    r"vector|velocity|acceleration|reflection|refraction"
    r")\b",
    re.IGNORECASE,
)

_CHEMISTRY_SUBJECT_PATTERN = re.compile(
    r"\b("
    r"chemistry|atom|bonding|apparatus|distillation|filtration|water purification|"
    r"reaction|molecule|nucleus|electron shell|beaker|flask|condenser"
    r")\b",
    re.IGNORECASE,
)

_BIOLOGY_TYPE_PATTERNS = [
    ("plant_cell", re.compile(r"\bplant cell\b", re.IGNORECASE)),
    ("animal_cell", re.compile(r"\banimal cell\b", re.IGNORECASE)),
    ("heart_diagram", re.compile(r"\bheart\b", re.IGNORECASE)),
    ("nephron", re.compile(r"\bnephron\b", re.IGNORECASE)),
    ("digestive_system", re.compile(r"\bdigestive system\b", re.IGNORECASE)),
    ("life_cycle", re.compile(r"\blife cycle\b", re.IGNORECASE)),
]

_PHYSICS_TYPE_PATTERNS = [
    ("force_diagram", re.compile(r"\bforce diagram\b|\bforce\b", re.IGNORECASE)),
    ("motion_diagram", re.compile(r"\bmotion diagram\b|\bmotion sketch\b", re.IGNORECASE)),
    ("ray_diagram", re.compile(r"\bray diagram\b|\breflection\b|\brefraction\b", re.IGNORECASE)),
    ("circuit_diagram", re.compile(r"\bcircuit diagram\b|\bcircuit\b", re.IGNORECASE)),
    ("vector_diagram", re.compile(r"\bvector diagram\b|\bvector\b", re.IGNORECASE)),
]

_CHEMISTRY_TYPE_PATTERNS = [
    ("water_purification", re.compile(r"\bwater purification\b", re.IGNORECASE)),
    ("distillation_setup", re.compile(r"\bdistillation\b", re.IGNORECASE)),
    ("apparatus_setup", re.compile(r"\bapparatus\b|\bsetup\b", re.IGNORECASE)),
    ("atom_structure", re.compile(r"\batom\b|\batomic\b", re.IGNORECASE)),
    ("bonding_diagram", re.compile(r"\bbonding\b", re.IGNORECASE)),
    ("reaction_process", re.compile(r"\breaction\b|\bprocess\b", re.IGNORECASE)),
]

_GENERIC_TYPE_PATTERNS = [
    ("process_diagram", re.compile(r"\bprocess\b|\bflow\b|\bcycle\b", re.IGNORECASE)),
    ("labeled_diagram", re.compile(r"\blabeled\b|\blabelled\b", re.IGNORECASE)),
]

_BIOLOGY_RULES = {
    "default": (
        "Biology Diagram Guidance: produce an AI-generated instructional sketch with textbook-style biological labeling, "
        "clear part separation, simple proportional layout where possible, and correct standard terminology only. "
        "Prefer a sparse revision-note layout over realism. Avoid cartoon features, extra organs or structures not asked for, "
        "heavy shading, decorative textures, speculative labels, or overcrowded annotation."
    ),
    "plant_cell": (
        "Show a recognizably textbook-style plant cell with a clear outer boundary, cell wall, cell membrane, cytoplasm, nucleus, large central vacuole, and chloroplasts. "
        "If labeling is requested, keep labels to the main organelles only and place them neatly outside the cell where possible. "
        "Do not mix in animal-cell-only features or decorative textures."
    ),
    "animal_cell": (
        "Show a simple labeled animal cell with major organelles clearly separated and labeled using standard biological terminology. "
        "Do not add a cell wall or chloroplasts."
    ),
    "heart_diagram": (
        "Show the four main heart chambers and the major connected vessels in a simplified textbook layout with clean labels and directional clarity. "
        "Keep left/right anatomy consistent, avoid extra artistic cutaway detail, and do not overcrowd the vessels."
    ),
    "nephron": (
        "Show the nephron in correct flow order with Bowman's capsule, glomerulus, proximal convoluted tubule, loop of Henle, distal convoluted tubule, and collecting duct clearly distinguished. "
        "Keep labels neat and avoid adding unrelated kidney anatomy."
    ),
    "digestive_system": (
        "Show the main digestive organs in a simple educational layout with clear labels and uncluttered pointers."
    ),
    "life_cycle": (
        "Show the life cycle as a clear sequence with directional arrows, distinct stages, and concise labels."
    ),
}

_PHYSICS_RULES = {
    "default": (
        "Physics Diagram Guidance: produce an AI-generated instructional sketch with thin lines, clean arrows, minimal shapes, and clear separation of objects. "
        "Direction arrows must be precise, labels must be readable, and the result should resemble a neat classroom physics sketch. "
        "Avoid decorative scenery, photorealistic objects, and unnecessary background detail."
    ),
    "force_diagram": (
        "Represent forces with crisp arrows from the object, label forces clearly using standard notation such as N, W, friction, or applied force where relevant, and keep the object simple. "
        "For a box on a table, show the box, the surface, and only the relevant forces rather than a decorative scene."
    ),
    "motion_diagram": (
        "Show object positions or motion direction simply, with clear arrows and spacing that makes the movement easy to follow."
    ),
    "ray_diagram": (
        "Use precise rays, clean normals or principal axes where relevant, and clear incident, reflected, or refracted paths. "
        "Keep the reflective or refractive surface obvious and avoid decorative lighting effects."
    ),
    "circuit_diagram": (
        "Use basic circuit-symbol conventions for components such as a cell, battery, bulb, resistor, and switch where relevant. "
        "Keep connections clean, components clearly separated, and avoid realistic hardware drawings."
    ),
    "vector_diagram": (
        "Use crisp vector arrows, clear tail and head positions, and readable labels for direction or magnitude where needed. "
        "Do not confuse vectors with decorative motion trails."
    ),
}

_CHEMISTRY_RULES = {
    "default": (
        "Chemistry Diagram Guidance: produce an AI-generated instructional sketch with thin outlines, simple apparatus or structure shapes, clean labels, and textbook-style clarity. "
        "Use arrows only where process or flow is needed. Avoid decorative shapes, photorealism, speculative components, or artistic interpretation."
    ),
    "water_purification": (
        "Show the water purification process as a clear step or flow diagram with sensible process arrows and labeled stages such as screening, sedimentation, filtration, and disinfection where appropriate. "
        "Keep the order logical and avoid random industrial detail."
    ),
    "distillation_setup": (
        "Show a simplified distillation setup with the main apparatus components such as flask, condenser, thermometer where appropriate, receiver, and heat source. "
        "Keep tubing or vapor flow direction clean and labels neat."
    ),
    "apparatus_setup": (
        "Show a clean educational lab setup with recognizable apparatus shapes, stable spacing, and correctly placed component labels. "
        "Avoid decorative bench clutter."
    ),
    "atom_structure": (
        "Show a simplified atom model with a clear nucleus and electron shells or paths where appropriate, using a clean educational structure. "
        "Keep protons, neutrons, and electrons conceptually clear and avoid mixing multiple competing atom models in one sketch."
    ),
    "bonding_diagram": (
        "Show bonding structure clearly using simple educational notation, with atoms and bonds arranged neatly and labels kept minimal."
    ),
    "reaction_process": (
        "Show the reaction or process flow with clear arrows, labeled stages, and uncluttered arrangement."
    ),
}


def detect_diagram_subject(prompt: str) -> str:
    raw_prompt = str(prompt or "").strip()
    if not raw_prompt:
        return ""
    if _BIOLOGY_SUBJECT_PATTERN.search(raw_prompt):
        return "biology"
    if _PHYSICS_SUBJECT_PATTERN.search(raw_prompt):
        return "physics"
    if _CHEMISTRY_SUBJECT_PATTERN.search(raw_prompt):
        return "chemistry"
    return ""


def detect_diagram_type(prompt: str, subject: str = "") -> str:
    raw_prompt = str(prompt or "").strip()
    if not raw_prompt:
        return ""

    subject_value = str(subject or "").strip().lower()
    subject_patterns = {
        "biology": _BIOLOGY_TYPE_PATTERNS,
        "physics": _PHYSICS_TYPE_PATTERNS,
        "chemistry": _CHEMISTRY_TYPE_PATTERNS,
    }.get(subject_value, [])

    for diagram_type, pattern in subject_patterns:
        if pattern.search(raw_prompt):
            return diagram_type

    for diagram_type, pattern in _GENERIC_TYPE_PATTERNS:
        if pattern.search(raw_prompt):
            return diagram_type

    return ""


def build_subject_diagram_pack(prompt: str) -> dict[str, str]:
    raw_prompt = str(prompt or "").strip()
    subject = detect_diagram_subject(raw_prompt)
    diagram_type = detect_diagram_type(raw_prompt, subject)

    if subject == "biology":
        rules = [_BIOLOGY_RULES["default"]]
        if diagram_type and _BIOLOGY_RULES.get(diagram_type):
            rules.append(_BIOLOGY_RULES[diagram_type])
    elif subject == "physics":
        rules = [_PHYSICS_RULES["default"]]
        if diagram_type and _PHYSICS_RULES.get(diagram_type):
            rules.append(_PHYSICS_RULES[diagram_type])
    elif subject == "chemistry":
        rules = [_CHEMISTRY_RULES["default"]]
        if diagram_type and _CHEMISTRY_RULES.get(diagram_type):
            rules.append(_CHEMISTRY_RULES[diagram_type])
    else:
        rules = []

    return {
        "subject": subject,
        "diagram_type": diagram_type,
        "rules": " ".join(rule for rule in rules if rule).strip(),
    }
