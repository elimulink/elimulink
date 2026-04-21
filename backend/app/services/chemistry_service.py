from __future__ import annotations

import math
import re
from dataclasses import dataclass
from itertools import product


CHEMISTRY_KEYWORDS = (
    "mole",
    "moles",
    "molar mass",
    "molecular mass",
    "empirical formula",
    "molecular formula",
    "percent composition",
    "amount of substance",
    "stoichiometry",
    "reacting mass",
    "reacting masses",
    "balance this equation",
    "balanced equation",
    "ph",
    "hydrogen ion concentration",
    "avogadro",
    "particles",
    "formula unit",
    "stp",
)
CHEMISTRY_CONTEXT_PATTERN = re.compile(
    r"\b(?:moles?|molar mass|molecular mass|empirical formula|molecular formula|percent composition|"
    r"amount of substance|stoichiometry|reacting masses?|balance this equation|balanced equation|"
    r"concentration|molarity|molar concentration|pH|hydrogen ion concentration|avogadro|particles?|"
    r"formula unit|stp|gas volume)\b",
    re.IGNORECASE,
)
BALANCING_TRIGGER_PATTERN = re.compile(
    r"\b(?:balance|balanced)\b.*(?:equation|reaction|\-\>|→|⇌)|(?:\-\>|→|⇌).*\b(?:balance|balanced)\b",
    re.IGNORECASE,
)
STOICHIOMETRY_TRIGGER_PATTERN = re.compile(
    r"\b(?:stoichiometry|produced from|reacts with|formed from|forms|yields|produces|reacting mass|"
    r"reacting masses|mass of|volume of)\b",
    re.IGNORECASE,
)
CHEMICAL_FORMULA_PATTERN = re.compile(r"\b(?:[A-Z][a-z]?\d*|\([A-Za-z0-9]+\)\d*)+\b")
CHEMISTRY_UNIT_PATTERN = re.compile(
    r"\b(?:mol|mole|moles|g|kg|mg|dm3|dm\^3|cm3|cm\^3|mol/dm3|mol/dm\^3|mol\s*dm-3|moldm-3|"
    r"atm|kpa|pa|l|ph)\b",
    re.IGNORECASE,
)
SCIENTIFIC_NUMBER_PATTERN = re.compile(
    r"[-+]?\d+(?:\.\d+)?(?:\s*(?:x|×)\s*10\s*(?:\^)?\s*[-+]?\d+)?",
    re.IGNORECASE,
)

ATOMIC_MASSES = {
    "H": 1.0,
    "He": 4.0,
    "Li": 6.9,
    "Be": 9.0,
    "B": 10.8,
    "C": 12.0,
    "N": 14.0,
    "O": 16.0,
    "F": 19.0,
    "Na": 23.0,
    "Mg": 24.3,
    "Al": 27.0,
    "Si": 28.1,
    "P": 31.0,
    "S": 32.1,
    "Cl": 35.5,
    "K": 39.1,
    "Ca": 40.1,
    "Cr": 52.0,
    "Mn": 54.9,
    "Fe": 55.8,
    "Co": 58.9,
    "Ni": 58.7,
    "Cu": 63.5,
    "Zn": 65.4,
    "Br": 79.9,
    "Ag": 107.9,
    "I": 126.9,
    "Ba": 137.3,
}
COMMON_COMPOUND_NAMES = {
    "water": "H2O",
    "carbon dioxide": "CO2",
    "carbon monoxide": "CO",
    "oxygen": "O2",
    "hydrogen": "H2",
    "nitrogen": "N2",
    "chlorine": "Cl2",
    "ammonia": "NH3",
    "methane": "CH4",
    "sodium chloride": "NaCl",
    "sulfuric acid": "H2SO4",
    "hydrochloric acid": "HCl",
    "nitric acid": "HNO3",
    "calcium carbonate": "CaCO3",
}


@dataclass
class ChemistryInput:
    original_text: str
    normalized_text: str
    category: str
    source: str = "typed"


@dataclass
class ChemistrySolution:
    text: str
    solved: bool
    category: str = "unknown"
    final_answer: str = ""
    limitation: str = ""
    source: str = "typed"


def _normalize_text(text: str) -> str:
    normalized = str(text or "").strip()
    replacements = {
        "→": "->",
        "⇌": "->",
        "−": "-",
        "–": "-",
        "—": "-",
        "×": "x",
        "₀": "0",
        "₁": "1",
        "₂": "2",
        "₃": "3",
        "₄": "4",
        "₅": "5",
        "₆": "6",
        "₇": "7",
        "₈": "8",
        "₉": "9",
        "³": "^3",
        "²": "^2",
        "dm³": "dm^3",
        "cm³": "cm^3",
        "mol dm-3": "mol/dm^3",
        "mol dm^-3": "mol/dm^3",
        "mol dm−3": "mol/dm^3",
        "mol dm−³": "mol/dm^3",
        "mol dm³": "mol/dm^3",
        "mol/dm³": "mol/dm^3",
    }
    for source, target in replacements.items():
        normalized = normalized.replace(source, target)
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized.strip()


def _has_formula_or_named_compound(text: str) -> bool:
    if CHEMICAL_FORMULA_PATTERN.search(text):
        return True
    lowered = str(text or "").lower()
    return any(name in lowered for name in COMMON_COMPOUND_NAMES)


def is_chemistry_prompt(message: str) -> bool:
    text = _normalize_text(message)
    if not text:
        return False
    lowered = text.lower()

    if any(keyword in lowered for keyword in CHEMISTRY_KEYWORDS):
        return True
    if any(term in lowered for term in ("concentration", "molarity")) and (
        "solution" in lowered or "mol/dm" in lowered or "dm^3" in lowered or "cm^3" in lowered or _has_formula_or_named_compound(text)
    ):
        return True
    if re.search(r"\bpH\b|\[h\+\]|hydrogen ion concentration", text, re.IGNORECASE):
        return True
    if BALANCING_TRIGGER_PATTERN.search(text) and _has_formula_or_named_compound(text):
        return True
    if _has_formula_or_named_compound(text) and CHEMISTRY_CONTEXT_PATTERN.search(text):
        return True
    if _has_formula_or_named_compound(text) and CHEMISTRY_UNIT_PATTERN.search(text):
        return True
    if re.search(r"\b(?:determine|find|calculate)\b", lowered) and (
        "percent composition" in lowered or "empirical formula" in lowered or "molecular formula" in lowered
    ):
        return True
    return False


def _classify_chemistry_input(problem: str, source: str = "typed") -> ChemistryInput:
    normalized = _normalize_text(problem)
    lowered = normalized.lower()
    category = "unsupported"

    if "empirical formula" in lowered or "percent composition" in lowered:
        category = "empirical_formula"
    elif "molecular formula" in lowered:
        category = "molecular_formula"
    elif "molar mass" in lowered or "molecular mass" in lowered:
        category = "molar_mass"
    elif BALANCING_TRIGGER_PATTERN.search(normalized) and _extract_equation(normalized):
        category = "balancing"
    elif _extract_equation(normalized) and STOICHIOMETRY_TRIGGER_PATTERN.search(normalized):
        category = "stoichiometry"
    elif re.search(r"\bpH\b|\[h\+\]|hydrogen ion concentration", normalized, re.IGNORECASE):
        category = "ph"
    elif (
        any(term in lowered for term in ("concentration", "molarity", "mol/dm", "solution contains"))
        and ("solution" in lowered or "mol/dm" in lowered or "dm^3" in lowered or "cm^3" in lowered or _has_formula_or_named_compound(normalized))
    ):
        category = "concentration"
    elif "stp" in lowered or ("gas" in lowered and "22.4" in lowered):
        category = "gas_law"
    elif any(term in lowered for term in ("moles", "mole", "amount of substance", "avogadro", "particles")):
        category = "mole_concept"
    elif _has_formula_or_named_compound(normalized) and CHEMISTRY_UNIT_PATTERN.search(normalized):
        category = "mole_concept"
    elif _has_formula_or_named_compound(normalized) and re.search(r"\bfind|calculate|determine\b", lowered):
        category = "molar_mass"

    return ChemistryInput(
        original_text=str(problem or "").strip(),
        normalized_text=normalized,
        category=category,
        source=source,
    )


def extract_structured_chemistry_input(problem: str, source: str = "typed") -> dict:
    parsed = _classify_chemistry_input(problem, source=source)
    return {
        "source": parsed.source,
        "category": parsed.category,
        "originalText": parsed.original_text,
        "normalizedText": parsed.normalized_text,
        "isChemistry": parsed.category != "unsupported" or is_chemistry_prompt(problem),
    }


def _format_number(value: float) -> str:
    rounded = round(float(value), 6)
    text = f"{rounded:.6f}".rstrip("0").rstrip(".")
    return text or "0"


def _latex_inline(text: str) -> str:
    clean = str(text or "").strip()
    return f"\\({clean}\\)" if clean else ""


def _latex_display(text: str) -> str:
    clean = str(text or "").strip()
    return f"\\[{clean}\\]" if clean else ""


def _chem_formula_latex(formula: str) -> str:
    text = str(formula or "").strip()
    if not text:
        return ""
    converted = []
    index = 0
    while index < len(text):
        char = text[index]
        if char.isdigit():
            digits = [char]
            index += 1
            while index < len(text) and text[index].isdigit():
                digits.append(text[index])
                index += 1
            converted.append(f"_{{{''.join(digits)}}}")
            continue
        if char == "^" and index + 1 < len(text):
            exponent = []
            index += 1
            while index < len(text) and (text[index].isdigit() or text[index] in "+-"):
                exponent.append(text[index])
                index += 1
            if exponent:
                converted.append(f"^{{{''.join(exponent)}}}")
                continue
            converted.append("^")
            continue
        if text.startswith("->", index):
            converted.append(r"\rightarrow ")
            index += 2
            continue
        converted.append(char)
        index += 1
    return f"\\mathrm{{{''.join(converted)}}}"


def _unit_latex(unit: str) -> str:
    normalized = str(unit or "").strip()
    replacements = {
        "mol": r"\text{mol}",
        "g": r"\text{g}",
        "kg": r"\text{kg}",
        "mg": r"\text{mg}",
        "dm^3": r"\text{dm}^3",
        "cm^3": r"\text{cm}^3",
        "mol/dm^3": r"\text{mol/dm}^3",
        "particles": r"\text{particles}",
        "atm": r"\text{atm}",
        "kPa": r"\text{kPa}",
        "L": r"\text{L}",
        "M": r"\text{mol/dm}^3",
    }
    return replacements.get(normalized, rf"\text{{{normalized}}}")


def _format_solution(
    problem: str,
    given_lines: list[str],
    formula_label: str,
    *args,
) -> ChemistrySolution:
    if len(args) == 3:
        substitution = ""
        steps, final_answer, category = args
    elif len(args) == 4:
        substitution, steps, final_answer, category = args
    else:
        raise ValueError("Unexpected chemistry solution format arguments.")

    given_text = "\n".join(given_lines) if given_lines else "- No safe known quantities were extracted."
    text = (
        f"Problem:\n{_latex_display(problem)}\n\n"
        "Given:\n"
        f"{given_text}\n\n"
        f"Formula / Principle:\n{_latex_display(formula_label)}\n\n"
        f"{'Substitution:\n' + _latex_display(substitution) + chr(10) + chr(10) if substitution else ''}"
        "Steps:\n"
        f"{chr(10).join(steps)}\n\n"
        f"Final Answer:\n{_latex_display(f'\\boxed{{{final_answer}}}')}"
    )
    return ChemistrySolution(text=text, solved=True, category=category, final_answer=final_answer)


def _unsupported_solution(parsed: ChemistryInput, limitation: str) -> ChemistrySolution:
    recognized = parsed.category or "unsupported"
    return ChemistrySolution(
        text=(
            f"Problem:\n{_latex_display(parsed.original_text or parsed.normalized_text)}\n\n"
            "Given:\n"
            "- I recognized this as a chemistry-style question.\n\n"
            "Formula / Principle:\n"
            "\\[Not\\ selected\\ safely\\]\n\n"
            "Steps:\n"
            "1. I identified the chemistry route and checked for a supported school-level chemistry pattern.\n"
            f"2. I recognized the category as {_latex_inline(recognized)}.\n"
            f"3. I stopped at a verified limitation: {limitation}\n"
            "4. Please restate the formula, known values, units, and target quantity clearly.\n\n"
            "Final Answer:\n"
            "\\[\\boxed{Unable\\ to\\ solve\\ reliably\\ with\\ Chemistry\\ Engine\\ v1}\\]"
        ),
        solved=False,
        category=parsed.category,
        limitation=limitation,
        source=parsed.source,
    )


def _parse_formula_counts(formula: str) -> dict[str, int]:
    tokens = re.findall(r"[A-Z][a-z]?|\(|\)|\d+", str(formula or ""))
    if not tokens:
        raise ValueError("I could not parse the chemical formula safely.")

    stack: list[dict[str, int]] = [{}]
    index = 0
    while index < len(tokens):
        token = tokens[index]
        if token == "(":
            stack.append({})
            index += 1
            continue
        if token == ")":
            if len(stack) == 1:
                raise ValueError("Unmatched bracket in chemical formula.")
            group = stack.pop()
            index += 1
            multiplier = 1
            if index < len(tokens) and tokens[index].isdigit():
                multiplier = int(tokens[index])
                index += 1
            for element, count in group.items():
                stack[-1][element] = stack[-1].get(element, 0) + count * multiplier
            continue
        if re.fullmatch(r"[A-Z][a-z]?", token):
            if token not in ATOMIC_MASSES:
                raise ValueError(f"Atomic mass for element {token} is not available in Chemistry Engine v1.")
            count = 1
            index += 1
            if index < len(tokens) and tokens[index].isdigit():
                count = int(tokens[index])
                index += 1
            stack[-1][token] = stack[-1].get(token, 0) + count
            continue
        raise ValueError("Unsupported token in chemical formula.")
    if len(stack) != 1:
        raise ValueError("Unmatched bracket in chemical formula.")
    return stack[0]


def _molar_mass(formula: str) -> float:
    counts = _parse_formula_counts(formula)
    return sum(ATOMIC_MASSES[element] * count for element, count in counts.items())


def _extract_formulas(text: str) -> list[str]:
    candidates = []
    for match in CHEMICAL_FORMULA_PATTERN.findall(str(text or "")):
        if match.lower() in {"ph", "stp"}:
            continue
        if any(char.isupper() for char in match):
            candidates.append(match)
    seen = set()
    ordered = []
    for item in candidates:
        if item not in seen:
            seen.add(item)
            ordered.append(item)
    lowered = str(text or "").lower()
    for name, formula in COMMON_COMPOUND_NAMES.items():
        if name in lowered and formula not in seen:
            seen.add(formula)
            ordered.append(formula)
    return ordered


def _parse_number(value: str) -> float:
    cleaned = str(value or "").strip().replace(" ", "")
    sci_match = re.fullmatch(r"([-+]?\d+(?:\.\d+)?)(?:[x×]10\^?([-+]?\d+))", cleaned, re.IGNORECASE)
    if sci_match:
        return float(sci_match.group(1)) * (10 ** int(sci_match.group(2)))
    return float(cleaned)


def _find_number_before_unit(text: str, unit_pattern: str) -> float | None:
    match = re.search(
        rf"({SCIENTIFIC_NUMBER_PATTERN.pattern})\s*{unit_pattern}\b",
        str(text or ""),
        re.IGNORECASE,
    )
    return _parse_number(match.group(1)) if match else None


def _solve_molar_mass(problem: str) -> ChemistrySolution:
    formulas = _extract_formulas(problem)
    if not formulas:
        raise ValueError("A chemical formula is needed for molar mass calculation.")
    formula = formulas[0]
    counts = _parse_formula_counts(formula)
    mass = _molar_mass(formula)
    parts = [f"{element}: {count} \\times {ATOMIC_MASSES[element]}" for element, count in counts.items()]
    return _format_solution(
        _chem_formula_latex(formula),
        [f"- Formula: {_latex_inline(_chem_formula_latex(formula))}"],
        r"\text{Molar mass} = \sum (\text{relative atomic mass} \times \text{number of atoms})",
        [
            "1. Identify each element and count how many atoms of each are present.",
            f"2. Compute the contribution from each element: {_latex_inline(';\\ '.join(parts))}.",
            f"3. Add the contributions to obtain {_latex_inline(f'M = {_format_number(mass)}\\ \\text{{g mol}}^{{-1}}')}.",
        ],
        f"M = {_format_number(mass)}\\ \\text{{g mol}}^{{-1}}",
        "molar_mass",
    )


def _solve_mole_concept(problem: str) -> ChemistrySolution:
    lowered = problem.lower()
    formulas = _extract_formulas(problem)
    formula = formulas[0] if formulas else ""
    molar_mass = _molar_mass(formula) if formula else None
    mass_g = _find_number_before_unit(problem, r"g")
    moles = _find_number_before_unit(problem, r"mol")

    if any(term in lowered for term in ("particles", "molecules", "atoms", "formula units")):
        if moles is None:
            raise ValueError("Particle calculations need the amount in moles.")
        particles = moles * 6.02e23
        return _format_solution(
            problem,
            [f"- {_latex_inline(f'n = {_format_number(moles)}\\ {_unit_latex('mol')}')}"],
            r"N = nN_A",
            f"N = {_format_number(moles)} \\times 6.02 \\times 10^{{23}}",
            [
                "1. Identify the amount of substance in moles.",
                "2. Use Avogadro's constant.",
                f"3. Multiply to get {_latex_inline(f'N = {_format_number(particles)}\\ {_unit_latex('particles')}')}.",
            ],
            f"N = {_format_number(particles)}\\ \\text{{particles}}",
            "mole_concept",
        )

    if ("calculate moles" in lowered or "find moles" in lowered or "moles in" in lowered) and mass_g is not None:
        if molar_mass is None:
            raise ValueError("Mole calculations from mass need a chemical formula.")
        moles = mass_g / molar_mass
        return _format_solution(
            problem,
            [
                f"- {_latex_inline(f'm = {_format_number(mass_g)}\\ {_unit_latex('g')}')}",
                f"- {_latex_inline(f'M = {_format_number(molar_mass)}\\ \\text{{g mol}}^{{-1}}')}",
            ],
            r"n = \frac{m}{M}",
            rf"n = \frac{{{_format_number(mass_g)}}}{{{_format_number(molar_mass)}}}",
            [
                "1. Identify the mass and the molar mass.",
                "2. Use n = m / M.",
                f"3. Divide to obtain {_latex_inline(f'n = {_format_number(moles)}\\ {_unit_latex('mol')}')}.",
            ],
            f"n = {_format_number(moles)}\\ {_unit_latex('mol')}",
            "mole_concept",
        )

    if ("calculate mass" in lowered or "find mass" in lowered) and moles is not None and molar_mass is not None:
        mass = moles * molar_mass
        return _format_solution(
            problem,
            [
                f"- {_latex_inline(f'n = {_format_number(moles)}\\ {_unit_latex('mol')}')}",
                f"- {_latex_inline(f'M = {_format_number(molar_mass)}\\ \\text{{g mol}}^{{-1}}')}",
            ],
            r"m = nM",
            f"m = {_format_number(moles)} \\times {_format_number(molar_mass)}",
            [
                "1. Identify the amount in moles and the molar mass.",
                "2. Use m = nM.",
                f"3. Multiply to obtain {_latex_inline(f'm = {_format_number(mass)}\\ {_unit_latex('g')}')}.",
            ],
            f"m = {_format_number(mass)}\\ {_unit_latex('g')}",
            "mole_concept",
        )

    raise ValueError("Supported mole-concept forms are mass-to-moles, moles-to-mass, and simple particle-count calculations.")


def _convert_volume_to_dm3(problem: str) -> tuple[float | None, str]:
    volume_dm3 = _find_number_before_unit(problem, r"dm\^?3")
    if volume_dm3 is not None:
        return volume_dm3, "dm^3"
    volume_l = _find_number_before_unit(problem, r"l")
    if volume_l is not None:
        return volume_l, "dm^3"
    volume_cm3 = _find_number_before_unit(problem, r"cm\^?3")
    if volume_cm3 is not None:
        return volume_cm3 / 1000.0, "cm^3"
    return None, ""


def _solve_concentration(problem: str) -> ChemistrySolution:
    lowered = problem.lower()
    moles = _find_number_before_unit(problem, r"mol")
    concentration = _find_number_before_unit(problem, r"mol/dm\^?3")
    volume_dm3, _volume_source = _convert_volume_to_dm3(problem)

    if "find concentration" in lowered or (
        "contains" in lowered and moles is not None and volume_dm3 is not None and concentration is None
    ):
        if moles is None or volume_dm3 is None:
            raise ValueError("Concentration calculation needs moles and volume.")
        result = moles / volume_dm3
        return _format_solution(
            problem,
            [
                f"- {_latex_inline(f'n = {_format_number(moles)}\\ {_unit_latex('mol')}')}",
                f"- {_latex_inline(f'V = {_format_number(volume_dm3)}\\ {_unit_latex('dm^3')}')}",
            ],
            r"c = \frac{n}{V}",
            rf"c = \frac{{{_format_number(moles)}}}{{{_format_number(volume_dm3)}}}",
            [
                "1. Identify the amount of substance and the solution volume.",
                "2. Use c = n / V.",
                f"3. Divide to obtain {_latex_inline(f'c = {_format_number(result)}\\ {_unit_latex('mol/dm^3')}')}.",
            ],
            f"c = {_format_number(result)}\\ {_unit_latex('mol/dm^3')}",
            "concentration",
        )

    if ("find moles" in lowered or "amount of substance" in lowered) and concentration is not None and volume_dm3 is not None:
        result = concentration * volume_dm3
        return _format_solution(
            problem,
            [
                f"- {_latex_inline(f'c = {_format_number(concentration)}\\ {_unit_latex('mol/dm^3')}')}",
                f"- {_latex_inline(f'V = {_format_number(volume_dm3)}\\ {_unit_latex('dm^3')}')}",
            ],
            r"n = cV",
            f"n = {_format_number(concentration)} \\times {_format_number(volume_dm3)}",
            [
                "1. Identify the concentration and volume.",
                "2. Rearrange to n = cV.",
                f"3. Multiply to obtain {_latex_inline(f'n = {_format_number(result)}\\ {_unit_latex('mol')}')}.",
            ],
            f"n = {_format_number(result)}\\ {_unit_latex('mol')}",
            "concentration",
        )

    if "find volume" in lowered and concentration is not None and moles is not None:
        result = moles / concentration
        return _format_solution(
            problem,
            [
                f"- {_latex_inline(f'n = {_format_number(moles)}\\ {_unit_latex('mol')}')}",
                f"- {_latex_inline(f'c = {_format_number(concentration)}\\ {_unit_latex('mol/dm^3')}')}",
            ],
            r"V = \frac{n}{c}",
            rf"V = \frac{{{_format_number(moles)}}}{{{_format_number(concentration)}}}",
            [
                "1. Identify the amount of substance and concentration.",
                "2. Rearrange to V = n / c.",
                f"3. Divide to obtain {_latex_inline(f'V = {_format_number(result)}\\ {_unit_latex('dm^3')}')}.",
            ],
            f"V = {_format_number(result)}\\ {_unit_latex('dm^3')}",
            "concentration",
        )

    raise ValueError("Supported concentration forms are c = n/V and its straightforward rearrangements.")


def _split_equation(equation: str) -> tuple[list[str], list[str]]:
    if "->" not in equation:
        raise ValueError("A reaction arrow is needed for the chemical equation.")
    left, right = equation.split("->", 1)
    reactants = [item.strip() for item in left.split("+") if item.strip()]
    products = [item.strip() for item in right.split("+") if item.strip()]
    if not reactants or not products:
        raise ValueError("The chemical equation is incomplete.")
    return reactants, products


def _extract_equation(problem: str) -> str:
    match = re.search(
        r"((?:[A-Z][A-Za-z0-9()]*\s*\+\s*)*[A-Z][A-Za-z0-9()]*\s*->\s*(?:[A-Z][A-Za-z0-9()]*\s*\+\s*)*[A-Z][A-Za-z0-9()]*)",
        str(problem or ""),
    )
    return match.group(1).strip() if match else ""


def _balance_equation(equation: str) -> tuple[list[int], list[str], list[str]]:
    reactants, products = _split_equation(equation)
    compounds = reactants + products
    if len(compounds) > 5:
        raise ValueError("Chemistry Engine v1 only balances small school-level equations.")
    for coefficients in product(range(1, 7), repeat=len(compounds)):
        left_counts: dict[str, int] = {}
        right_counts: dict[str, int] = {}
        for coefficient, formula in zip(coefficients[: len(reactants)], reactants):
            for element, count in _parse_formula_counts(formula).items():
                left_counts[element] = left_counts.get(element, 0) + coefficient * count
        for coefficient, formula in zip(coefficients[len(reactants) :], products):
            for element, count in _parse_formula_counts(formula).items():
                right_counts[element] = right_counts.get(element, 0) + coefficient * count
        if left_counts == right_counts:
            common = math.gcd(*coefficients)
            reduced = [value // common for value in coefficients]
            return reduced, reactants, products
    raise ValueError("I could not safely balance this equation within the supported v1 scope.")


def _coeff_formula(coefficient: int, formula: str) -> str:
    chem = _chem_formula_latex(formula)
    return chem if coefficient == 1 else f"{coefficient}{chem}"


def _solve_balancing(problem: str) -> ChemistrySolution:
    equation = _extract_equation(problem)
    if not equation:
        raise ValueError("Please include a simple chemical equation with an arrow.")
    coefficients, reactants, products = _balance_equation(equation)
    left = [_coeff_formula(coeff, formula) for coeff, formula in zip(coefficients[: len(reactants)], reactants)]
    right = [_coeff_formula(coeff, formula) for coeff, formula in zip(coefficients[len(reactants) :], products)]
    balanced = " + ".join(left) + r" \rightarrow " + " + ".join(right)
    return _format_solution(
        equation,
        [f"- Unbalanced equation: {_latex_inline(' + '.join(_chem_formula_latex(x) for x in reactants) + r' \rightarrow ' + ' + '.join(_chem_formula_latex(x) for x in products))}"],
        r"\text{Balance by matching the number of atoms on both sides.}",
        [
            "1. Count the atoms of each element on both sides.",
            "2. Adjust the smallest whole-number coefficients until each element matches.",
            f"3. Write the balanced equation as {_latex_inline(balanced)}.",
        ],
        balanced,
        "balancing",
    )


def _solve_stoichiometry(problem: str) -> ChemistrySolution:
    equation = _extract_equation(problem)
    if not equation:
        raise ValueError("A reaction equation is needed for stoichiometry.")
    coefficients, reactants, products = _balance_equation(equation)
    all_formulas = reactants + products
    coefficient_map = {formula: coefficients[index] for index, formula in enumerate(all_formulas)}

    target_mass_match = re.search(r"mass of\s+([A-Z][A-Za-z0-9()]*)", problem, re.IGNORECASE)
    target_moles_match = re.search(r"moles of\s+([A-Z][A-Za-z0-9()]*)", problem, re.IGNORECASE)
    target_formula = target_mass_match.group(1) if target_mass_match else target_moles_match.group(1) if target_moles_match else ""
    known_match = re.search(r"([-+]?\d+(?:\.\d+)?)\s*(g|mol)\s+of\s+([A-Z][A-Za-z0-9()]*)", problem, re.IGNORECASE)
    if not target_formula or not known_match:
        raise ValueError("Simple stoichiometry in v1 needs a known mass or moles of one substance and a clear target substance.")
    known_value = float(known_match.group(1))
    known_unit = known_match.group(2).lower()
    known_formula = known_match.group(3)
    if known_formula not in coefficient_map or target_formula not in coefficient_map:
        raise ValueError("The known or target substance does not match the reaction equation.")

    known_moles = known_value if known_unit == "mol" else known_value / _molar_mass(known_formula)
    ratio = coefficient_map[target_formula] / coefficient_map[known_formula]
    target_moles = known_moles * ratio
    balanced = " + ".join(
        _coeff_formula(coefficients[index], formula) for index, formula in enumerate(reactants)
    ) + r" \rightarrow " + " + ".join(
        _coeff_formula(coefficients[len(reactants) + index], formula) for index, formula in enumerate(products)
    )
    mole_ratio = f"{coefficient_map[known_formula]}:{coefficient_map[target_formula]}"

    if target_mass_match:
        target_mass = target_moles * _molar_mass(target_formula)
        final = f"m = {_format_number(target_mass)}\\ {_unit_latex('g')}"
        conversion_step = (
            f"4. Convert the target moles to mass using "
            f"{_latex_inline(f'm = nM = {_format_number(target_moles)} \\times {_format_number(_molar_mass(target_formula))}') }."
        )
    else:
        final = f"n = {_format_number(target_moles)}\\ {_unit_latex('mol')}"
        conversion_step = "4. The target quantity is already in moles."

    return _format_solution(
        problem,
        [
            f"- Balanced equation: {_latex_inline(balanced)}",
            f"- Known substance: {_latex_inline(_chem_formula_latex(known_formula))}",
            f"- Target substance: {_latex_inline(_chem_formula_latex(target_formula))}",
            f"- Mole ratio ({_chem_formula_latex(known_formula)}:{_chem_formula_latex(target_formula)}): {_latex_inline(mole_ratio)}",
        ],
        r"\text{Use the balanced equation and the mole ratio.}",
        [
            "1. Balance the equation first.",
            f"2. Convert the known amount to moles: {_latex_inline(f'n = {_format_number(known_moles)}\\ {_unit_latex('mol')}')}.",
            f"3. Apply the mole ratio to get {_latex_inline(f'n_{{target}} = {_format_number(target_moles)}\\ {_unit_latex('mol')}')}.",
            conversion_step,
            f"5. Final result: {_latex_inline(final)}.",
        ],
        final,
        "stoichiometry",
    )


def _round_ratio_list(values: list[float]) -> list[int]:
    for factor in range(1, 7):
        scaled = [value * factor for value in values]
        rounded = [round(item) for item in scaled]
        if all(abs(item - round(item)) < 0.12 for item in scaled):
            gcd_value = math.gcd(*[abs(int(item)) for item in rounded if int(item) != 0]) or 1
            return [int(item // gcd_value) for item in rounded]
    raise ValueError("The empirical-formula ratio is not within the straightforward v1 scope.")


def _solve_empirical_formula(problem: str) -> ChemistrySolution:
    matches = re.findall(r"([A-Z][a-z]?)\s*[:=]?\s*([0-9]+(?:\.\d+)?)\s*%", problem)
    if not matches:
        matches = [(element, value) for value, element in re.findall(r"([0-9]+(?:\.\d+)?)\s*%\s*([A-Z][a-z]?)", problem)]
    if len(matches) < 2:
        raise ValueError("Please provide simple percentage composition data such as C 40%, H 6.7%, O 53.3%.")

    mole_values = []
    given_lines = []
    for element, percent in matches:
        if element not in ATOMIC_MASSES:
            raise ValueError(f"Atomic mass for element {element} is not available in Chemistry Engine v1.")
        percent_value = float(percent)
        moles = percent_value / ATOMIC_MASSES[element]
        mole_values.append((element, moles))
        given_lines.append(f"- {_latex_inline(f'{element}: {percent_value}\\%')}")
    smallest = min(value for _, value in mole_values if value > 0)
    ratios = [value / smallest for _, value in mole_values]
    integers = _round_ratio_list(ratios)
    formula = "".join(element if count == 1 else f"{element}{count}" for (element, _), count in zip(mole_values, integers))
    return _format_solution(
        problem,
        given_lines,
        r"\text{Assume }100\text{ g, convert to moles, then divide by the smallest mole value.}",
        [
            "1. Treat the percentages as masses in a 100 g sample.",
            "2. Convert each mass to moles by dividing by the atomic mass.",
            f"3. Divide all mole values by the smallest one to get the ratio {_latex_inline(':'.join(str(value) for value in integers))}.",
            f"4. Write the empirical formula as {_latex_inline(_chem_formula_latex(formula))}.",
        ],
        _chem_formula_latex(formula),
        "empirical_formula",
    )


def _solve_molecular_formula(problem: str) -> ChemistrySolution:
    empirical_match = re.search(r"empirical formula\s+([A-Z][A-Za-z0-9()]*)", problem, re.IGNORECASE)
    molar_mass_value = _find_number_before_unit(problem, r"g")
    if not empirical_match or molar_mass_value is None:
        raise ValueError("Molecular-formula questions in v1 need the empirical formula and the molar mass.")
    empirical = empirical_match.group(1)
    empirical_mass = _molar_mass(empirical)
    multiplier = round(molar_mass_value / empirical_mass)
    if multiplier < 1:
        raise ValueError("The given molar mass is not compatible with a straightforward molecular-formula calculation.")
    counts = _parse_formula_counts(empirical)
    molecular = "".join(
        element if count * multiplier == 1 else f"{element}{count * multiplier}"
        for element, count in counts.items()
    )
    return _format_solution(
        problem,
        [
            f"- Empirical formula: {_latex_inline(_chem_formula_latex(empirical))}",
            f"- Empirical formula mass: {_latex_inline(f'{_format_number(empirical_mass)}\\ \\text{{g mol}}^{{-1}}')}",
            f"- Molar mass: {_latex_inline(f'{_format_number(molar_mass_value)}\\ \\text{{g mol}}^{{-1}}')}",
        ],
        r"\text{Multiplier} = \frac{\text{molecular molar mass}}{\text{empirical formula mass}}",
        [
            "1. Find the empirical formula mass.",
            f"2. Divide the molecular molar mass by the empirical formula mass to get {_latex_inline(str(multiplier))}.",
            f"3. Multiply each empirical-formula subscript by {_latex_inline(str(multiplier))}.",
            f"4. The molecular formula is {_latex_inline(_chem_formula_latex(molecular))}.",
        ],
        _chem_formula_latex(molecular),
        "molecular_formula",
    )


def _solve_ph(problem: str) -> ChemistrySolution:
    lowered = problem.lower()
    hydrogen = _find_number_before_unit(problem, r"mol/dm\^?3")
    ph_match = re.search(r"\bpH\s*(?:is|=)?\s*([-+]?\d+(?:\.\d+)?)", problem, re.IGNORECASE)
    ph_value = float(ph_match.group(1)) if ph_match else None

    if ("find ph" in lowered or "find the ph" in lowered or "what is the ph" in lowered) and hydrogen is not None:
        result = -math.log10(hydrogen)
        return _format_solution(
            problem,
            [f"- {_latex_inline(f'[H^+] = {_format_number(hydrogen)}\\ {_unit_latex('mol/dm^3')}')}"],
            r"\text{pH} = -\log_{10}[H^+]",
            rf"\text{{pH}} = -\log_{{10}}({_format_number(hydrogen)})",
            [
                "1. Identify the hydrogen ion concentration.",
                "2. Use pH = -log10[H+].",
                f"3. Evaluate to obtain {_latex_inline(f'pH = {_format_number(result)}')}.",
            ],
            f"pH = {_format_number(result)}",
            "ph",
        )

    if ph_value is not None and ("find concentration" in lowered or "[h+]" in lowered or "hydrogen ion concentration" in lowered):
        result = 10 ** (-ph_value)
        return _format_solution(
            problem,
            [f"- {_latex_inline(f'pH = {_format_number(ph_value)}')}"],
            r"[H^+] = 10^{-\text{pH}}",
            rf"[H^+] = 10^{{-{_format_number(ph_value)}}}",
            [
                "1. Identify the pH.",
                "2. Use [H+] = 10^(-pH).",
                f"3. Evaluate to obtain {_latex_inline(f'[H^+] = {_format_number(result)}\\ {_unit_latex('mol/dm^3')}')}.",
            ],
            f"[H^+] = {_format_number(result)}\\ {_unit_latex('mol/dm^3')}",
            "ph",
        )

    raise ValueError("Supported pH forms in v1 are pH from [H+] and [H+] from pH.")


def _solve_gas_law(problem: str) -> ChemistrySolution:
    lowered = problem.lower()
    moles = _find_number_before_unit(problem, r"mol")
    volume_dm3, _ = _convert_volume_to_dm3(problem)
    if "stp" not in lowered:
        raise ValueError("Chemistry Engine v1 only supports simple gas-volume questions at STP.")
    if "find volume" in lowered and moles is not None:
        result = moles * 22.4
        return _format_solution(
            problem,
            [f"- {_latex_inline(f'n = {_format_number(moles)}\\ {_unit_latex('mol')}')}"],
            r"\text{At STP, }1\text{ mol gas} = 22.4\text{ dm}^3",
            f"V = {_format_number(moles)} \\times 22.4",
            [
                "1. Use the molar gas volume at STP.",
                "2. Multiply the moles by 22.4 dm^3 mol^-1.",
                f"3. The gas volume is {_latex_inline(f'V = {_format_number(result)}\\ {_unit_latex('dm^3')}')}.",
            ],
            f"V = {_format_number(result)}\\ {_unit_latex('dm^3')}",
            "gas_law",
        )
    if "find moles" in lowered and volume_dm3 is not None:
        result = volume_dm3 / 22.4
        return _format_solution(
            problem,
            [f"- {_latex_inline(f'V = {_format_number(volume_dm3)}\\ {_unit_latex('dm^3')}')}"],
            r"\text{At STP, }n = \frac{V}{22.4}",
            rf"n = \frac{{{_format_number(volume_dm3)}}}{{22.4}}",
            [
                "1. Use the molar gas volume at STP.",
                "2. Divide the gas volume by 22.4 dm^3 mol^-1.",
                f"3. The amount of gas is {_latex_inline(f'n = {_format_number(result)}\\ {_unit_latex('mol')}')}.",
            ],
            f"n = {_format_number(result)}\\ {_unit_latex('mol')}",
            "gas_law",
        )
    raise ValueError("Supported gas-law forms in v1 are simple STP mole-volume conversions.")


def solve_chemistry_problem(problem: str, source: str = "typed") -> ChemistrySolution:
    parsed = _classify_chemistry_input(problem, source=source)
    try:
        if parsed.category == "molar_mass":
            result = _solve_molar_mass(parsed.normalized_text)
        elif parsed.category == "mole_concept":
            result = _solve_mole_concept(parsed.normalized_text)
        elif parsed.category == "concentration":
            result = _solve_concentration(parsed.normalized_text)
        elif parsed.category == "balancing":
            result = _solve_balancing(parsed.normalized_text)
        elif parsed.category == "stoichiometry":
            result = _solve_stoichiometry(parsed.normalized_text)
        elif parsed.category == "empirical_formula":
            result = _solve_empirical_formula(parsed.normalized_text)
        elif parsed.category == "molecular_formula":
            result = _solve_molecular_formula(parsed.normalized_text)
        elif parsed.category == "ph":
            result = _solve_ph(parsed.normalized_text)
        elif parsed.category == "gas_law":
            result = _solve_gas_law(parsed.normalized_text)
        else:
            return _unsupported_solution(parsed, "Unsupported chemistry form.")
    except Exception as exc:
        return _unsupported_solution(
            parsed,
            str(exc).strip() or "This chemistry problem is beyond the supported v1 school-level scope.",
        )

    result.source = source
    return result
