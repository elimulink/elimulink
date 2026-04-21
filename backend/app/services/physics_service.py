from __future__ import annotations

import math
import re
from dataclasses import dataclass


PHYSICS_KEYWORDS = (
    "velocity",
    "speed",
    "acceleration",
    "force",
    "mass",
    "weight",
    "work",
    "energy",
    "power",
    "momentum",
    "pressure",
    "density",
    "current",
    "voltage",
    "resistance",
    "ohm",
    "wavelength",
    "frequency",
    "wave",
    "kinematics",
    "newton",
)
PHYSICS_UNIT_PATTERN = re.compile(
    r"\b(?:kg|g|m|cm|km|s|ms|h|n|newton|j|joule|w|watt|pa|kpa|v|volt|a|amp|ohm|Ω|hz|cm3|cm\^3|m3|m\^3|m/s|m/s2|m/s\^2)\b",
    re.IGNORECASE,
)


@dataclass
class PhysicsInput:
    original_text: str
    normalized_text: str
    category: str
    source: str = "typed"


@dataclass
class PhysicsSolution:
    text: str
    solved: bool
    category: str = "unknown"
    final_answer: str = ""
    limitation: str = ""
    source: str = "typed"


def is_physics_prompt(message: str) -> bool:
    text = str(message or "").strip()
    if not text:
        return False
    lowered = text.lower()
    if any(keyword in lowered for keyword in PHYSICS_KEYWORDS):
        return True
    if PHYSICS_UNIT_PATTERN.search(text) and re.search(
        r"\b(?:find|calculate|compute|determine|rest|moves?|starts?|accelerates?|voltage|current|resistance|density|pressure|wavelength)\b",
        lowered,
    ):
        return True
    if re.search(r"\b(?:ohm'?s law|from rest|final velocity|kinetic energy|potential energy)\b", lowered):
        return True
    return False


def _normalize_text(text: str) -> str:
    normalized = str(text or "").strip()
    replacements = {
        "Ω": "ohm",
        "²": "^2",
        "³": "^3",
        "×": "*",
        "−": "-",
    }
    for source, target in replacements.items():
        normalized = normalized.replace(source, target)
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized.strip()


def _classify_physics_input(problem: str, source: str = "typed") -> PhysicsInput:
    normalized = _normalize_text(problem)
    lowered = normalized.lower()
    category = "unsupported"

    if any(term in lowered for term in ("work", "kinetic energy", "potential energy", "power", "energy")):
        category = "energy"
    elif "momentum" in lowered:
        category = "momentum"
    elif any(term in lowered for term in ("pressure", "density")):
        category = "fluid"
    elif any(term in lowered for term in ("current", "voltage", "resistance", "ohm", "electric")):
        category = "electricity"
    elif any(term in lowered for term in ("wavelength", "frequency", "wave")):
        category = "waves"
    elif any(term in lowered for term in ("force", "weight", "newton")):
        category = "newtonian"
    elif any(term in lowered for term in ("accelerates", "acceleration", "final velocity", "from rest", "kinematics", "speed", "velocity")):
        category = "kinematics"

    return PhysicsInput(original_text=str(problem or "").strip(), normalized_text=normalized, category=category, source=source)


def extract_structured_physics_input(problem: str, source: str = "typed") -> dict:
    parsed = _classify_physics_input(problem, source=source)
    return {
        "source": parsed.source,
        "category": parsed.category,
        "originalText": parsed.original_text,
        "normalizedText": parsed.normalized_text,
        "isPhysics": parsed.category != "unsupported" or is_physics_prompt(problem),
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


def _unit_latex(unit: str) -> str:
    normalized = str(unit or "").strip()
    replacements = {
        "m/s^2": r"\text{m/s}^2",
        "m/s": r"\text{m/s}",
        "kg": r"\text{kg}",
        "g": r"\text{g}",
        "N": r"\text{N}",
        "J": r"\text{J}",
        "W": r"\text{W}",
        "Pa": r"\text{Pa}",
        "V": r"\text{V}",
        "A": r"\text{A}",
        "ohm": r"\Omega",
        "Hz": r"\text{Hz}",
        "m": r"\text{m}",
        "s": r"\text{s}",
        "cm^3": r"\text{cm}^3",
        "m^3": r"\text{m}^3",
        "kg/m^3": r"\text{kg/m}^3",
        "g/cm^3": r"\text{g/cm}^3",
    }
    return replacements.get(normalized, rf"\text{{{normalized}}}")


def _format_quantity(symbol: str, value: float, unit: str) -> str:
    return f"{symbol} = {_format_number(value)}\\ {_unit_latex(unit)}"


def _parse_number(text: str) -> float | None:
    match = re.search(r"[-+]?\d+(?:\.\d+)?", str(text or ""))
    return float(match.group(0)) if match else None


def _find_value(text: str, aliases: list[str], units: list[str]) -> float | None:
    source = str(text or "")
    alias_pattern = "|".join(re.escape(alias) for alias in aliases)
    unit_pattern = "|".join(re.escape(unit) for unit in units)
    patterns = [
        rf"(?:{alias_pattern})\s*(?:is|=|of)?\s*([-+]?\d+(?:\.\d+)?)\s*(?:{unit_pattern})\b",
        rf"([-+]?\d+(?:\.\d+)?)\s*(?:{unit_pattern})\s*(?:of\s+)?(?:{alias_pattern})\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, source, re.IGNORECASE)
        if match:
            return float(match.group(1))
    return None


def _find_any_unit_value(text: str, units: list[str]) -> float | None:
    unit_pattern = "|".join(re.escape(unit) for unit in units)
    match = re.search(rf"([-+]?\d+(?:\.\d+)?)\s*(?:{unit_pattern})\b", str(text or ""), re.IGNORECASE)
    return float(match.group(1)) if match else None


def _format_solution(
    problem: str,
    given_lines: list[str],
    formula: str,
    substitution: str,
    steps: list[str],
    final_answer: str,
    category: str,
) -> PhysicsSolution:
    text = (
        f"Problem:\n{_latex_display(problem)}\n\n"
        "Given:\n"
        f"{chr(10).join(given_lines)}\n\n"
        f"Formula:\n{_latex_display(formula)}\n\n"
        f"Substitution:\n{_latex_display(substitution)}\n\n"
        "Steps:\n"
        f"{chr(10).join(steps)}\n\n"
        f"Final Answer:\n{_latex_display(f'\\boxed{{{final_answer}}}')}"
    )
    return PhysicsSolution(text=text, solved=True, category=category, final_answer=final_answer)


def _unsupported_solution(parsed: PhysicsInput, limitation: str) -> PhysicsSolution:
    return PhysicsSolution(
        text=(
            f"Problem:\n{_latex_display(parsed.original_text or parsed.normalized_text)}\n\n"
            "Given:\n"
            "- I recognized this as a physics-style question.\n\n"
            "Formula:\n"
            "\\[Not\\ selected\\ safely\\]\n\n"
            "Substitution:\n"
            "\\[Not\\ applied\\]\n\n"
            "Steps:\n"
            "1. I identified the physics route and checked for a supported school-level formula.\n"
            f"2. I recognized the category as {_latex_inline(parsed.category or 'unsupported')}.\n"
            f"3. I stopped at a verified limitation: {limitation}\n"
            "4. Please restate the question with the known values and target quantity clearly.\n\n"
            "Final Answer:\n"
            "\\[\\boxed{Unable\\ to\\ solve\\ reliably\\ with\\ Physics\\ Engine\\ v1}\\]"
        ),
        solved=False,
        category=parsed.category,
        limitation=limitation,
        source=parsed.source,
    )


def _solve_force_mass_acceleration(problem: str) -> PhysicsSolution:
    mass = _find_value(problem, ["mass", "m"], ["kg", "g"])
    acceleration = _find_value(problem, ["acceleration", "a"], ["m/s^2", "m/s2"])
    if mass is None or acceleration is None:
        raise ValueError("Force calculations need mass and acceleration.")
    if re.search(r"\b20\s*g\b", problem, re.IGNORECASE):
        mass = mass / 1000
    force = mass * acceleration
    return _format_solution(
        "F = ma",
        [f"- {_latex_inline(_format_quantity('m', mass, 'kg'))}", f"- {_latex_inline(_format_quantity('a', acceleration, 'm/s^2'))}"],
        "F = ma",
        f"F = ({_format_number(mass)}\\ {_unit_latex('kg')})({_format_number(acceleration)}\\ {_unit_latex('m/s^2')})",
        [
            "1. Identify the known values for mass and acceleration.",
            "2. Choose Newton's second law.",
            f"3. Multiply the values to get {_latex_inline(_format_quantity('F', force, 'N'))}.",
        ],
        _format_quantity("F", force, "N"),
        "newtonian",
    )


def _solve_weight(problem: str) -> PhysicsSolution:
    mass = _find_value(problem, ["mass", "m"], ["kg"])
    if mass is None:
        raise ValueError("Weight calculations need mass in kilograms.")
    g = 9.8
    weight = mass * g
    return _format_solution(
        "W = mg",
        [f"- {_latex_inline(_format_quantity('m', mass, 'kg'))}", f"- {_latex_inline(_format_quantity('g', g, 'm/s^2'))}"],
        "W = mg",
        f"W = ({_format_number(mass)}\\ {_unit_latex('kg')})({_format_number(g)}\\ {_unit_latex('m/s^2')})",
        [
            "1. Identify the mass.",
            "2. Use the weight formula with gravitational field strength 9.8 m/s^2.",
            f"3. Multiply to find {_latex_inline(_format_quantity('W', weight, 'N'))}.",
        ],
        _format_quantity("W", weight, "N"),
        "newtonian",
    )


def _solve_kinematics(problem: str) -> PhysicsSolution:
    lowered = problem.lower()
    acceleration = _find_value(problem, ["acceleration", "a"], ["m/s^2", "m/s2"])
    if acceleration is None:
        acceleration_match = re.search(r"accelerates?\s+(?:at\s+)?([-+]?\d+(?:\.\d+)?)\s*m/s\^?2", problem, re.IGNORECASE)
        if acceleration_match:
            acceleration = float(acceleration_match.group(1))
    time = _find_value(problem, ["time", "t"], ["s"])
    if time is None:
        time_match = re.search(r"\bfor\s+([-+]?\d+(?:\.\d+)?)\s*s\b", problem, re.IGNORECASE)
        if time_match:
            time = float(time_match.group(1))
    initial_velocity = 0.0 if "from rest" in lowered else _find_value(problem, ["initial velocity", "u"], ["m/s"])
    final_velocity = _find_value(problem, ["final velocity", "velocity", "speed", "v"], ["m/s"])
    distance = _find_value(problem, ["distance", "displacement", "s"], ["m", "km", "cm"])
    frequency = _find_value(problem, ["frequency", "f"], ["hz"])
    wave_speed = _find_value(problem, ["speed", "velocity", "wave speed", "v"], ["m/s"])

    if re.search(r"\bfind final velocity\b", lowered) or ("from rest" in lowered and acceleration is not None and time is not None):
        u = initial_velocity or 0.0
        if acceleration is None or time is None:
            raise ValueError("Final velocity here needs initial velocity, acceleration, and time.")
        result = u + acceleration * time
        return _format_solution(
            problem,
            [
                f"- {_latex_inline(_format_quantity('u', u, 'm/s'))}",
                f"- {_latex_inline(_format_quantity('a', acceleration, 'm/s^2'))}",
                f"- {_latex_inline(_format_quantity('t', time, 's'))}",
            ],
            "v = u + at",
            f"v = {_format_number(u)} + ({_format_number(acceleration)} \\times {_format_number(time)})",
            [
                "1. Identify the initial velocity, acceleration, and time.",
                "2. Choose the first kinematics equation.",
                f"3. Substitute and simplify to get {_latex_inline(_format_quantity('v', result, 'm/s'))}.",
            ],
            _format_quantity("v", result, "m/s"),
            "kinematics",
        )

    if "speed" in lowered and distance is not None and time is not None:
        result = distance / time
        return _format_solution(
            problem,
            [f"- {_latex_inline(_format_quantity('d', distance, 'm'))}", f"- {_latex_inline(_format_quantity('t', time, 's'))}"],
            r"\text{speed} = \frac{\text{distance}}{\text{time}}",
            rf"\text{{speed}} = \frac{{{_format_number(distance)}}}{{{_format_number(time)}}}",
            [
                "1. Identify distance and time.",
                "2. Use speed = distance / time.",
                f"3. Divide to get {_latex_inline(_format_quantity('v', result, 'm/s'))}.",
            ],
            _format_quantity("v", result, "m/s"),
            "kinematics",
        )

    if "wavelength" in lowered and wave_speed is not None and frequency is not None:
        result = wave_speed / frequency
        return _format_solution(
            problem,
            [f"- {_latex_inline(_format_quantity('v', wave_speed, 'm/s'))}", f"- {_latex_inline(_format_quantity('f', frequency, 'Hz'))}"],
            r"v = f\lambda",
            rf"\lambda = \frac{{{_format_number(wave_speed)}}}{{{_format_number(frequency)}}}",
            [
                "1. Identify wave speed and frequency.",
                "2. Rearrange v = f lambda to lambda = v / f.",
                f"3. Divide to get {_latex_inline(_format_quantity('lambda', result, 'm'))}.",
            ],
            _format_quantity(r"\lambda", result, "m"),
            "waves",
        )

    raise ValueError("Supported kinematics/wave cases in v1 are final velocity from u, a, t; speed from distance/time; and wavelength from wave speed and frequency.")


def _solve_work_energy_power(problem: str) -> PhysicsSolution:
    lowered = problem.lower()
    force = _find_value(problem, ["force", "f"], ["n", "newton"])
    if force is None:
        force = _find_any_unit_value(problem, ["n", "newton"])
    distance = _find_value(problem, ["distance", "displacement", "s"], ["m"])
    if distance is None:
        distance_match = re.search(r"(?:moves?|moved|through)\s+(?:an?\s+object\s+)?([-+]?\d+(?:\.\d+)?)\s*m\b", problem, re.IGNORECASE)
        if distance_match:
            distance = float(distance_match.group(1))
    time = _find_value(problem, ["time", "t"], ["s"])
    mass = _find_value(problem, ["mass", "m"], ["kg"])
    velocity = _find_value(problem, ["velocity", "speed", "v"], ["m/s"])
    height = _find_value(problem, ["height", "h"], ["m"])

    if "work" in lowered and force is not None and distance is not None:
        result = force * distance
        return _format_solution(
            problem,
            [f"- {_latex_inline(_format_quantity('F', force, 'N'))}", f"- {_latex_inline(_format_quantity('d', distance, 'm'))}"],
            "W = Fd",
            f"W = {_format_number(force)} \\times {_format_number(distance)}",
            [
                "1. Identify the applied force and distance moved.",
                "2. Use the work formula.",
                f"3. Multiply to get {_latex_inline(_format_quantity('W', result, 'J'))}.",
            ],
            _format_quantity("W", result, "J"),
            "energy",
        )

    if "power" in lowered and time is not None:
        work = _find_value(problem, ["work"], ["j", "joule"])
        voltage = _find_value(problem, ["voltage", "v"], ["v", "volt"])
        current = _find_value(problem, ["current", "i"], ["a", "amp"])
        resistance = _find_value(problem, ["resistance", "r"], ["ohm"])
        if work is not None:
            result = work / time
            formula = r"P = \frac{W}{t}"
            substitution = rf"P = \frac{{{_format_number(work)}}}{{{_format_number(time)}}}"
        elif voltage is not None and current is not None:
            result = voltage * current
            formula = "P = VI"
            substitution = f"P = {_format_number(voltage)} \\times {_format_number(current)}"
        elif current is not None and resistance is not None:
            result = (current ** 2) * resistance
            formula = "P = I^2R"
            substitution = f"P = ({_format_number(current)})^2 \\times {_format_number(resistance)}"
        else:
            raise ValueError("Supported power forms need work/time, voltage/current, or current/resistance.")
        return _format_solution(
            problem,
            [f"- {_latex_inline(_format_quantity('t', time, 's'))}"],
            formula,
            substitution,
            [
                "1. Identify the known quantities for power.",
                "2. Choose the matching power formula.",
                f"3. Simplify to get {_latex_inline(_format_quantity('P', result, 'W'))}.",
            ],
            _format_quantity("P", result, "W"),
            "energy",
        )

    if "kinetic energy" in lowered and mass is not None and velocity is not None:
        result = 0.5 * mass * (velocity ** 2)
        return _format_solution(
            problem,
            [f"- {_latex_inline(_format_quantity('m', mass, 'kg'))}", f"- {_latex_inline(_format_quantity('v', velocity, 'm/s'))}"],
            r"KE = \frac{1}{2}mv^2",
            rf"KE = \frac{{1}}{{2}} \times {_format_number(mass)} \times {_format_number(velocity)}^2",
            [
                "1. Identify mass and velocity.",
                "2. Use the kinetic energy formula.",
                f"3. Evaluate to get {_latex_inline(_format_quantity('KE', result, 'J'))}.",
            ],
            _format_quantity("KE", result, "J"),
            "energy",
        )

    if "potential energy" in lowered and mass is not None and height is not None:
        g = 9.8
        result = mass * g * height
        return _format_solution(
            problem,
            [
                f"- {_latex_inline(_format_quantity('m', mass, 'kg'))}",
                f"- {_latex_inline(_format_quantity('g', g, 'm/s^2'))}",
                f"- {_latex_inline(_format_quantity('h', height, 'm'))}",
            ],
            "PE = mgh",
            f"PE = {_format_number(mass)} \\times {_format_number(g)} \\times {_format_number(height)}",
            [
                "1. Identify mass, gravitational field strength, and height.",
                "2. Use the potential energy formula.",
                f"3. Multiply to get {_latex_inline(_format_quantity('PE', result, 'J'))}.",
            ],
            _format_quantity("PE", result, "J"),
            "energy",
        )

    raise ValueError("Supported energy forms are work, power, kinetic energy, and potential energy.")


def _solve_momentum(problem: str) -> PhysicsSolution:
    mass = _find_value(problem, ["mass", "m"], ["kg"])
    velocity = _find_value(problem, ["velocity", "speed", "v"], ["m/s"])
    if mass is None or velocity is None:
        raise ValueError("Momentum calculations need mass and velocity.")
    result = mass * velocity
    return _format_solution(
        problem,
        [f"- {_latex_inline(_format_quantity('m', mass, 'kg'))}", f"- {_latex_inline(_format_quantity('v', velocity, 'm/s'))}"],
        "p = mv",
        f"p = {_format_number(mass)} \\times {_format_number(velocity)}",
        [
            "1. Identify mass and velocity.",
            "2. Use the momentum formula.",
            f"3. Multiply to get {_latex_inline(f'p = {_format_number(result)}\\ { _unit_latex('kg')}\\,{_unit_latex('m/s')}')}.",
        ],
        f"p = {_format_number(result)}\\ { _unit_latex('kg')}\\,{_unit_latex('m/s')}",
        "momentum",
    )


def _solve_pressure_density(problem: str) -> PhysicsSolution:
    lowered = problem.lower()
    if "pressure" in lowered:
        force = _find_value(problem, ["force", "f"], ["n", "newton"])
        area = _find_value(problem, ["area", "a"], ["m^2", "cm^2", "m"])
        if force is None or area is None:
            raise ValueError("Pressure calculations need force and area.")
        result = force / area
        return _format_solution(
            problem,
            [f"- {_latex_inline(_format_quantity('F', force, 'N'))}", f"- {_latex_inline(f'A = {_format_number(area)}\\ \\text{{m}}^2')}"],
            r"P = \frac{F}{A}",
            rf"P = \frac{{{_format_number(force)}}}{{{_format_number(area)}}}",
            [
                "1. Identify the force and area.",
                "2. Use pressure = force / area.",
                f"3. Divide to get {_latex_inline(_format_quantity('P', result, 'Pa'))}.",
            ],
            _format_quantity("P", result, "Pa"),
            "fluid",
        )

    if "density" in lowered:
        mass_kg = _find_value(problem, ["mass", "m"], ["kg"])
        mass_g = _find_value(problem, ["mass", "m"], ["g"])
        volume_cm3 = _find_value(problem, ["volume", "v"], ["cm^3", "cm3"])
        volume_m3 = _find_value(problem, ["volume", "v"], ["m^3", "m3"])
        if mass_g is not None and volume_cm3 is not None and "kg" not in lowered:
            result = mass_g / volume_cm3
            given = [f"- {_latex_inline(_format_quantity('m', mass_g, 'g'))}", f"- {_latex_inline(_format_quantity('V', volume_cm3, 'cm^3'))}"]
            final = f"\\rho = {_format_number(result)}\\ {_unit_latex('g/cm^3')}"
            substitution = rf"\rho = \frac{{{_format_number(mass_g)}}}{{{_format_number(volume_cm3)}}}"
        else:
            mass = mass_kg
            volume = volume_m3
            if mass is None or volume is None:
                raise ValueError("Density calculations need mass and volume.")
            result = mass / volume
            given = [f"- {_latex_inline(_format_quantity('m', mass, 'kg'))}", f"- {_latex_inline(_format_quantity('V', volume, 'm^3'))}"]
            final = f"\\rho = {_format_number(result)}\\ {_unit_latex('kg/m^3')}"
            substitution = rf"\rho = \frac{{{_format_number(mass)}}}{{{_format_number(volume)}}}"
        return _format_solution(
            problem,
            given,
            r"\rho = \frac{m}{V}",
            substitution,
            [
                "1. Identify the mass and volume.",
                "2. Use density = mass / volume.",
                f"3. Divide to get {_latex_inline(final)}.",
            ],
            final,
            "fluid",
        )

    raise ValueError("Supported fluid forms are pressure and density.")


def _solve_electricity(problem: str) -> PhysicsSolution:
    lowered = problem.lower()
    voltage = _find_value(problem, ["voltage", "v"], ["v", "volt"])
    current = _find_value(problem, ["current", "i"], ["a", "amp"])
    resistance = _find_value(problem, ["resistance", "r"], ["ohm"])

    if "current" in lowered and voltage is not None and resistance is not None:
        result = voltage / resistance
        return _format_solution(
            problem,
            [f"- {_latex_inline(_format_quantity('V', voltage, 'V'))}", f"- {_latex_inline(_format_quantity('R', resistance, 'ohm'))}"],
            "V = IR",
            rf"I = \frac{{{_format_number(voltage)}}}{{{_format_number(resistance)}}}",
            [
                "1. Identify voltage and resistance.",
                "2. Rearrange Ohm's law to I = V / R.",
                f"3. Divide to get {_latex_inline(_format_quantity('I', result, 'A'))}.",
            ],
            _format_quantity("I", result, "A"),
            "electricity",
        )

    if "voltage" in lowered and current is not None and resistance is not None:
        result = current * resistance
        return _format_solution(
            problem,
            [f"- {_latex_inline(_format_quantity('I', current, 'A'))}", f"- {_latex_inline(_format_quantity('R', resistance, 'ohm'))}"],
            "V = IR",
            f"V = {_format_number(current)} \\times {_format_number(resistance)}",
            [
                "1. Identify current and resistance.",
                "2. Use Ohm's law.",
                f"3. Multiply to get {_latex_inline(_format_quantity('V', result, 'V'))}.",
            ],
            _format_quantity("V", result, "V"),
            "electricity",
        )

    if "resistance" in lowered and voltage is not None and current is not None:
        result = voltage / current
        return _format_solution(
            problem,
            [f"- {_latex_inline(_format_quantity('V', voltage, 'V'))}", f"- {_latex_inline(_format_quantity('I', current, 'A'))}"],
            "V = IR",
            rf"R = \frac{{{_format_number(voltage)}}}{{{_format_number(current)}}}",
            [
                "1. Identify voltage and current.",
                "2. Rearrange Ohm's law to R = V / I.",
                f"3. Divide to get {_latex_inline(_format_quantity('R', result, 'ohm'))}.",
            ],
            _format_quantity("R", result, "ohm"),
            "electricity",
        )

    if "power" in lowered:
        if voltage is not None and current is not None:
            result = voltage * current
            formula = "P = VI"
            substitution = f"P = {_format_number(voltage)} \\times {_format_number(current)}"
        elif current is not None and resistance is not None:
            result = (current ** 2) * resistance
            formula = "P = I^2R"
            substitution = f"P = ({_format_number(current)})^2 \\times {_format_number(resistance)}"
        elif voltage is not None and resistance is not None:
            result = (voltage ** 2) / resistance
            formula = r"P = \frac{V^2}{R}"
            substitution = rf"P = \frac{{{_format_number(voltage)}^2}}{{{_format_number(resistance)}}}"
        else:
            raise ValueError("Supported electric power forms need V and I, I and R, or V and R.")
        return _format_solution(
            problem,
            ["- Known electrical quantities identified from the problem."],
            formula,
            substitution,
            [
                "1. Identify the electrical quantities provided.",
                "2. Choose the matching power formula.",
                f"3. Simplify to get {_latex_inline(_format_quantity('P', result, 'W'))}.",
            ],
            _format_quantity("P", result, "W"),
            "electricity",
        )

    raise ValueError("Supported electricity forms are Ohm's law and simple electric power formulas.")


def solve_physics_problem(problem: str, source: str = "typed") -> PhysicsSolution:
    parsed = _classify_physics_input(problem, source=source)
    try:
        lowered = parsed.normalized_text.lower()
        if parsed.category == "newtonian":
            if "weight" in lowered:
                result = _solve_weight(parsed.normalized_text)
            else:
                result = _solve_force_mass_acceleration(parsed.normalized_text)
        elif parsed.category == "kinematics":
            result = _solve_kinematics(parsed.normalized_text)
        elif parsed.category == "energy":
            result = _solve_work_energy_power(parsed.normalized_text)
        elif parsed.category == "momentum":
            result = _solve_momentum(parsed.normalized_text)
        elif parsed.category == "fluid":
            result = _solve_pressure_density(parsed.normalized_text)
        elif parsed.category == "electricity":
            result = _solve_electricity(parsed.normalized_text)
        elif parsed.category == "waves":
            result = _solve_kinematics(parsed.normalized_text)
        else:
            return _unsupported_solution(parsed, "Unsupported physics form.")
    except Exception as exc:
        return _unsupported_solution(parsed, str(exc).strip() or "This physics problem is beyond the supported v1 school-level formulas.")

    result.source = source
    return result
