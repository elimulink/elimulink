from __future__ import annotations

import ast
import math
import re
from dataclasses import dataclass
from fractions import Fraction
from statistics import median
from typing import Dict, Iterable, List, Sequence


SAFE_MATH_KEYWORD_PATTERNS = (
    re.compile(r"\b(?:solve|equation|simplify|evaluate|differentiate|derivative|integrate|integration)\b", re.IGNORECASE),
    re.compile(r"\b(?:probability|permutation|combination|ncr|npr)\b", re.IGNORECASE),
    re.compile(r"\b(?:dot product|scalar multiply|matrix multiply)\b", re.IGNORECASE),
    re.compile(r"\bf\(x\)\b", re.IGNORECASE),
)
MATH_SYMBOL_PATTERN = re.compile(
    r"(?:=|∂|\\partial|∫|\\int|√|\\sqrt|÷|×|±|π|∞|"
    r"\b\d+\s*/\s*\d+\b|"
    r"\[[^\]]+\]|"
    r"\b\d+(?:\.\d+)?\s*[\+\-\*/\^]\s*\d+(?:\.\d+)?\b)"
)
ARITHMETIC_ONLY_PATTERN = re.compile(r"^\s*[-+()0-9/*^.,\s]+\s*$")
LATEX_FRACTION_PATTERN = re.compile(r"\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}")
NATURAL_MATH_CUE_PATTERN = re.compile(
    r"\b(?:what is|find|compute|calculate|work out|evaluate|solve|differentiate|integrate)\b",
    re.IGNORECASE,
)
PROBABILITY_WORD_PROBLEM_PATTERN = re.compile(
    r"\b(?:bag|balls?|marbles?|dice|coin|coins|cards?|deck|draw(?:ing)?|pick(?:ing)?|chance|probability)\b",
    re.IGNORECASE,
)
QUANTITATIVE_STATISTICS_PATTERN = re.compile(
    r"\b(?:mean|median|mode|range|variance|standard deviation|std deviation)\b.*\d",
    re.IGNORECASE,
)
UNSUPPORTED_MATRIX_PATTERNS = (
    re.compile(r"\bdeterminant\b", re.IGNORECASE),
    re.compile(r"\binverse\b", re.IGNORECASE),
    re.compile(r"\btranspose\b", re.IGNORECASE),
    re.compile(r"\beigen(?:value|vector|values|vectors)\b", re.IGNORECASE),
)
FUNCTION_EVAL_PATTERN = re.compile(
    r"(?:if\s+)?f\(x\)\s*=\s*(.+?)\s*,?\s*(?:find|evaluate|compute)\s+f\(([-+]?\d+(?:\.\d+)?)\)\s*$",
    re.IGNORECASE,
)


@dataclass
class MathInput:
    original_text: str
    normalized_text: str
    operation: str
    expression: str
    source: str = "typed"


@dataclass
class MathSolution:
    text: str
    solved: bool
    expression: str = ""
    final_answer: str = ""
    limitation: str = ""
    operation: str = "unknown"
    source: str = "typed"


def is_math_prompt(message: str) -> bool:
    text = str(message or "").strip()
    if not text:
        return False
    lowered = text.lower()
    if any(pattern.search(text) for pattern in SAFE_MATH_KEYWORD_PATTERNS):
        return True
    if MATH_SYMBOL_PATTERN.search(text):
        return True
    if ARITHMETIC_ONLY_PATTERN.match(text):
        return True
    if QUANTITATIVE_STATISTICS_PATTERN.search(text):
        return True
    if PROBABILITY_WORD_PROBLEM_PATTERN.search(text) and re.search(r"\d", text):
        return True
    if re.search(r"\b(?:matrix|matrices|vector|vectors)\b", text, re.IGNORECASE) and (
        "[" in text or "]" in text or re.search(r"\b(?:add|subtract|multiply|dot product|scalar)\b", text, re.IGNORECASE)
    ):
        return True
    if NATURAL_MATH_CUE_PATTERN.search(text) and re.search(r"\d|[a-zA-Z]\s*=|\bf\(", text):
        return True
    if re.search(r"\b(sum|difference|product|quotient)\b", lowered) and re.search(r"\d", text):
        return True
    return False


def _normalize_math_text(text: str) -> str:
    normalized = str(text or "").strip()
    replacements = {
        "−": "-",
        "–": "-",
        "—": "-",
        "×": "*",
        "·": "*",
        "÷": "/",
        "^": "**",
        "√": "sqrt",
        "π": "pi",
        "∂": "d/dx ",
        "∫": "integrate ",
    }
    for source, target in replacements.items():
        normalized = normalized.replace(source, target)
    while LATEX_FRACTION_PATTERN.search(normalized):
        normalized = LATEX_FRACTION_PATTERN.sub(r"(\1)/(\2)", normalized)
    normalized = normalized.replace("{", "(").replace("}", ")")
    normalized = re.sub(r"\\left|\\right", "", normalized)
    normalized = re.sub(r"\\cdot|\\times", "*", normalized)
    normalized = re.sub(r"\\div", "/", normalized)
    normalized = re.sub(r"(\d)\s*\(", r"\1*(", normalized)
    normalized = re.sub(r"(\d)\s*x\b", r"\1*x", normalized)
    normalized = re.sub(r"\bx\s*(\d)", r"x*\1", normalized)
    normalized = re.sub(r"\)\s*(\d|x)", r")*\1", normalized)
    normalized = re.sub(r"(\d|x)\s+(\d|x)", r"\1*\2", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


def _extract_math_target(problem: str) -> str:
    raw = str(problem or "").strip()
    if not raw:
        return ""

    lines = [line.strip() for line in re.split(r"[\r\n]+", raw) if line.strip()]
    for line in reversed(lines):
        candidate = re.sub(
            r"^(?:problem|expression|equation|extracted math problem|math problem|"
            r"solve|simplify|evaluate|differentiate|integrate|"
            r"find the derivative of|find the integral of|find)\s*[:\-]?\s*",
            "",
            line,
            flags=re.IGNORECASE,
        ).strip()
        if candidate:
            return candidate
    return raw


def _classify_math_input(problem: str, source: str = "typed") -> MathInput:
    raw_problem = str(problem or "").strip()
    original = _extract_math_target(problem)
    normalized = _normalize_math_text(original)
    lowered = normalized.lower()
    raw_normalized = _normalize_math_text(raw_problem)
    raw_lowered = raw_normalized.lower()

    expression = normalized
    operation = "unsupported"

    if any(keyword in raw_lowered for keyword in ("differentiate", "derivative", "d/dx")):
        operation = "differentiate"
        expression = re.sub(
            r"^(differentiate|derivative of|find the derivative of|d/dx)\s*",
            "",
            raw_normalized,
            flags=re.IGNORECASE,
        ).strip()
    elif any(keyword in raw_lowered for keyword in ("integrate", "integration")):
        operation = "integrate"
        expression = re.sub(
            r"^(integrate|find the integral of|integration of)\s*",
            "",
            raw_normalized,
            flags=re.IGNORECASE,
        ).strip()
        expression = re.sub(r"\bdx\b", "", expression, flags=re.IGNORECASE).strip()
    elif any(keyword in lowered for keyword in ("probability", "chance", "ncr", "npr", "permutation", "combination", "bag")):
        operation = "probability"
    elif any(keyword in lowered for keyword in ("mean", "median", "mode", "range", "variance", "standard deviation", "std deviation")):
        operation = "statistics"
    elif any(keyword in lowered for keyword in ("matrix", "matrices", "vector", "vectors", "dot product")) or normalized.count("[") >= 2:
        operation = "matrix"
    elif "f(x)" in lowered or re.search(r"\b[a-z]\([-+]?\d", lowered):
        operation = "function"
    elif "=" in normalized and "==" not in normalized:
        operation = "equation"
    elif any(op in normalized for op in ("+", "-", "*", "/", "**", "sqrt")) and not re.search(
        r"[a-zA-Z]", normalized.replace("sqrt", "").replace("pi", "")
    ):
        operation = "arithmetic"
    elif ARITHMETIC_ONLY_PATTERN.match(normalized):
        operation = "arithmetic"
    elif _looks_like_simple_word_problem(lowered):
        operation = "word_problem"

    return MathInput(
        original_text=original,
        normalized_text=normalized,
        operation=operation,
        expression=expression.strip(),
        source=source,
    )


def extract_structured_math_input(problem: str, source: str = "typed") -> dict:
    parsed = _classify_math_input(problem, source=source)
    return {
        "source": parsed.source,
        "operation": parsed.operation,
        "originalText": parsed.original_text,
        "normalizedText": parsed.normalized_text,
        "expression": parsed.expression,
        "isMath": parsed.operation != "unsupported" or is_math_prompt(problem),
    }


def _looks_like_simple_word_problem(text: str) -> bool:
    patterns = (
        r"sum of a number and (\d+) is (\d+)",
        r"(\d+) more than a number is (\d+)",
        r"a number plus (\d+) equals (\d+)",
    )
    return any(re.search(pattern, text) for pattern in patterns)


def _to_fraction(value: float | int | Fraction) -> Fraction:
    if isinstance(value, Fraction):
        return value
    if isinstance(value, int):
        return Fraction(value, 1)
    return Fraction(str(value))


def _format_fraction(value: Fraction) -> str:
    if value.denominator == 1:
        return str(value.numerator)
    return f"\\frac{{{value.numerator}}}{{{value.denominator}}}"


def _format_plain_fraction(value: Fraction) -> str:
    if value.denominator == 1:
        return str(value.numerator)
    return f"{value.numerator}/{value.denominator}"


def _format_decimal(value: float) -> str:
    text = f"{value:.6f}".rstrip("0").rstrip(".")
    return text or "0"


def _format_fraction_or_decimal(value: Fraction) -> str:
    if value.denominator == 1:
        return str(value.numerator)
    denominator = abs(value.denominator)
    if denominator in {2, 4, 5, 8, 10, 20, 25, 40, 50, 100, 125}:
        return _format_decimal(float(value))
    return _format_fraction(value)


def _safe_eval_numeric(expression: str) -> Fraction:
    node = ast.parse(expression, mode="eval")

    def visit(current):
        if isinstance(current, ast.Expression):
            return visit(current.body)
        if isinstance(current, ast.Constant) and isinstance(current.value, (int, float)):
            return _to_fraction(current.value)
        if isinstance(current, ast.UnaryOp) and isinstance(current.op, ast.USub):
            return -visit(current.operand)
        if isinstance(current, ast.UnaryOp) and isinstance(current.op, ast.UAdd):
            return visit(current.operand)
        if isinstance(current, ast.BinOp):
            left = visit(current.left)
            right = visit(current.right)
            if isinstance(current.op, ast.Add):
                return left + right
            if isinstance(current.op, ast.Sub):
                return left - right
            if isinstance(current.op, ast.Mult):
                return left * right
            if isinstance(current.op, ast.Div):
                return left / right
            if isinstance(current.op, ast.Pow):
                if right.denominator != 1:
                    raise ValueError("Only integer powers are supported.")
                exponent = right.numerator
                if exponent < 0:
                    return Fraction(1, 1) / (left ** abs(exponent))
                return left ** exponent
        if isinstance(current, ast.Call) and isinstance(current.func, ast.Name):
            func_name = current.func.id.lower()
            args = [visit(arg) for arg in current.args]
            if func_name == "sqrt" and len(args) == 1:
                value = float(args[0])
                if value < 0:
                    raise ValueError("Square root of a negative number is not supported.")
                root = math.sqrt(value)
                rounded = round(root)
                if abs(root - rounded) < 1e-12:
                    return Fraction(rounded, 1)
                return _to_fraction(root)
        raise ValueError("Unsupported arithmetic expression.")

    return visit(node)


def _polynomial_from_ast(node, variable: str = "x", max_degree: int = 6) -> Dict[int, Fraction]:
    if isinstance(node, ast.Expression):
        return _polynomial_from_ast(node.body, variable, max_degree=max_degree)
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return {0: _to_fraction(node.value)}
    if isinstance(node, ast.Name) and node.id == variable:
        return {1: Fraction(1, 1)}
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub):
        return {degree: -coef for degree, coef in _polynomial_from_ast(node.operand, variable, max_degree=max_degree).items()}
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.UAdd):
        return _polynomial_from_ast(node.operand, variable, max_degree=max_degree)
    if isinstance(node, ast.BinOp):
        left = _polynomial_from_ast(node.left, variable, max_degree=max_degree)
        right = _polynomial_from_ast(node.right, variable, max_degree=max_degree)
        if isinstance(node.op, ast.Add):
            return _poly_add(left, right)
        if isinstance(node.op, ast.Sub):
            return _poly_add(left, {degree: -coef for degree, coef in right.items()})
        if isinstance(node.op, ast.Mult):
            return _poly_mul(left, right, max_degree=max_degree)
        if isinstance(node.op, ast.Pow):
            if len(right) != 1 or 0 not in right or right[0].denominator != 1:
                raise ValueError("Only integer powers are supported.")
            exponent = right[0].numerator
            if exponent < 0 or exponent > max_degree:
                raise ValueError("Polynomial power is too complex.")
            result = {0: Fraction(1, 1)}
            for _ in range(exponent):
                result = _poly_mul(result, left, max_degree=max_degree)
            return result
    raise ValueError("Unsupported algebraic form.")


def _poly_add(left: Dict[int, Fraction], right: Dict[int, Fraction]) -> Dict[int, Fraction]:
    result = dict(left)
    for degree, coef in right.items():
        result[degree] = result.get(degree, Fraction(0, 1)) + coef
        if result[degree] == 0:
            result.pop(degree)
    return result or {0: Fraction(0, 1)}


def _poly_mul(left: Dict[int, Fraction], right: Dict[int, Fraction], max_degree: int = 6) -> Dict[int, Fraction]:
    result: Dict[int, Fraction] = {}
    for left_degree, left_coef in left.items():
        for right_degree, right_coef in right.items():
            degree = left_degree + right_degree
            result[degree] = result.get(degree, Fraction(0, 1)) + left_coef * right_coef
    result = {degree: coef for degree, coef in result.items() if coef != 0}
    if max(result.keys(), default=0) > max_degree:
        raise ValueError("Polynomial degree is too high for the current deterministic solver.")
    return result or {0: Fraction(0, 1)}


def _parse_polynomial(expression: str, variable: str = "x", max_degree: int = 6) -> Dict[int, Fraction]:
    tree = ast.parse(expression, mode="eval")
    return _polynomial_from_ast(tree, variable, max_degree=max_degree)


def _poly_to_string(poly: Dict[int, Fraction], variable: str = "x") -> str:
    ordered = []
    for degree in sorted(poly.keys(), reverse=True):
        coef = poly[degree]
        if coef == 0:
            continue
        abs_coef = -coef if coef < 0 else coef
        if degree == 0:
            body = _format_fraction(abs_coef)
        elif degree == 1:
            body = variable if abs_coef == 1 else f"{_format_fraction(abs_coef)}{variable}"
        else:
            body = f"{variable}^{degree}" if abs_coef == 1 else f"{_format_fraction(abs_coef)}{variable}^{degree}"
        ordered.append((coef < 0, body))
    if not ordered:
        return "0"
    first_negative, first_body = ordered[0]
    parts = [f"-{first_body}" if first_negative else first_body]
    for is_negative, body in ordered[1:]:
        parts.append(f" - {body}" if is_negative else f" + {body}")
    return "".join(parts)


def _format_quadratic_root(value: float) -> str:
    rounded = round(value)
    if abs(value - rounded) < 1e-10:
        return str(rounded)
    return _format_decimal(value)


def _latex_inline(text: str) -> str:
    clean = str(text or "").strip()
    return f"\\({clean}\\)" if clean else ""


def _latex_display(text: str) -> str:
    clean = str(text or "").strip()
    return f"\\[{clean}\\]" if clean else ""


def _format_solution(problem: str, steps: List[str], final_answer: str, operation: str) -> MathSolution:
    text = (
        f"Problem:\n{_latex_display(problem.strip())}\n\n"
        "Steps:\n"
        f"{chr(10).join(steps)}\n\n"
        f"Final Answer:\n{_latex_display(f'\\boxed{{{final_answer}}}')}"
    ).strip()
    return MathSolution(
        text=text,
        solved=True,
        expression=problem,
        final_answer=final_answer,
        operation=operation,
    )


def _supported_scope_hint(parsed: MathInput) -> str:
    operation = str(parsed.operation or "").strip().lower()
    if operation == "equation":
        return "Try a linear or quadratic equation such as 2x + 5 = 15 or x^2 - 5x + 6 = 0."
    if operation == "differentiate":
        return "Try a polynomial derivative such as differentiate x^2 + 4x + 1."
    if operation == "integrate":
        return "Try a simple polynomial integral such as integrate 3x^2 + 2x."
    if operation == "statistics":
        return "Try a statistics prompt with a clear number list, such as find the mean of 4, 6, 8, 10."
    if operation == "probability":
        return "Try a simple probability form such as combinations, permutations, a single-draw bag question, or a basic binomial question."
    if operation == "matrix":
        return "Supported matrix work in v1 is addition, subtraction, scalar multiplication, matrix multiplication, and vector dot product."
    if operation == "function":
        return "Supported function work in v1 is evaluation such as f(x)=x^2+1, find f(3)."
    if operation == "arithmetic":
        return "Try a direct arithmetic expression such as 2/3 + 1/6 or (3 + 5) / 2."
    if operation == "word_problem":
        return "Try rewriting it as a direct linear equation such as x + 5 = 15."
    normalized = str(parsed.normalized_text or "").strip()
    if re.search(r"\bx\b|\b[a-z]\b", normalized):
        return "Add a clear operation such as solve, differentiate, integrate, or evaluate."
    return "Re-enter the problem as arithmetic, a linear or quadratic equation, a simple polynomial derivative/integral, a clear statistics list, or a small supported matrix expression."


def _unsupported_solution(parsed: MathInput, limitation: str) -> MathSolution:
    recognized_category = parsed.operation or "unsupported"
    source_note = (
        "I treated this as extracted image math, so I only continued where the printed math looked reliable."
        if parsed.source == "image"
        else "I treated this as a typed math request."
    )
    supported_scope_hint = _supported_scope_hint(parsed)
    return MathSolution(
        text=(
            f"Problem:\n{_latex_display(parsed.original_text or parsed.normalized_text)}\n\n"
            "Steps:\n"
            "1. I identified this as a math request and routed it into the deterministic math engine.\n"
            f"2. I recognized the category as {_latex_inline(recognized_category)}.\n"
            f"3. {source_note}\n"
            f"4. I stopped at a verified limitation: {limitation}\n"
            f"5. Safer next step: {supported_scope_hint}\n\n"
            "Final Answer:\n"
            "\\[\\boxed{Unable\\ to\\ solve\\ reliably\\ with\\ Math\\ Engine\\ v1}\\]"
        ),
        solved=False,
        expression=parsed.original_text,
        limitation=limitation,
        operation=parsed.operation,
        source=parsed.source,
    )


def _solve_equation(expression: str) -> MathSolution:
    left_raw, right_raw = [part.strip() for part in expression.split("=", 1)]
    left_poly = _parse_polynomial(left_raw, max_degree=2)
    right_poly = _parse_polynomial(right_raw, max_degree=2)
    equation_poly = _poly_add(left_poly, {degree: -coef for degree, coef in right_poly.items()})
    degree = max(equation_poly.keys(), default=0)

    steps = [
        f"1. Restate the equation: {_latex_inline(f'{left_raw} = {right_raw}')}.",
        f"2. Move all terms to one side: {_latex_inline(f'{_poly_to_string(equation_poly)} = 0')}.",
    ]

    if degree == 1:
        a = equation_poly.get(1, Fraction(0, 1))
        b = equation_poly.get(0, Fraction(0, 1))
        if a == 0:
            raise ValueError("This equation is not solvable with the current linear solver.")
        solution = -b / a
        steps.append(f"3. Isolate x: {_latex_inline(f'x = {-b} / {a}')}.")
        steps.append(f"4. Simplify the fraction: {_latex_inline(f'x = {_format_fraction(solution)}')}.")
        final = f"x = {_format_fraction(solution)}"
        return _format_solution(f"{left_raw} = {right_raw}", steps, final, operation="equation")

    if degree == 2:
        a = equation_poly.get(2, Fraction(0, 1))
        b = equation_poly.get(1, Fraction(0, 1))
        c = equation_poly.get(0, Fraction(0, 1))
        if a == 0:
            raise ValueError("This reduced to a non-quadratic equation that is not supported here.")
        discriminant = b * b - 4 * a * c
        steps.append(
            f"3. Identify the coefficients: {_latex_inline(f'a = {_format_fraction(a)},\\ b = {_format_fraction(b)},\\ c = {_format_fraction(c)}')}."
        )
        steps.append(f"4. Compute the discriminant: {_latex_inline(f'b^2 - 4ac = {_format_fraction(discriminant)}')}.")
        if discriminant < 0:
            steps.append("5. The discriminant is negative, so there are no real roots.")
            return _format_solution(f"{left_raw} = {right_raw}", steps, "No\\ real\\ roots", operation="equation")
        sqrt_disc = math.sqrt(float(discriminant))
        x1 = (-float(b) + sqrt_disc) / (2 * float(a))
        x2 = (-float(b) - sqrt_disc) / (2 * float(a))
        steps.append("5. Apply the quadratic formula.")
        steps.append(
            f"6. Substitute the values: {_latex_inline(f'x = ({_format_fraction(-b)} \\pm \\sqrt{{{_format_fraction(discriminant)}}}) / {_format_fraction(2 * a)}')}."
        )
        final = f"x = {_format_quadratic_root(x1)},\\ {_format_quadratic_root(x2)}"
        return _format_solution(f"{left_raw} = {right_raw}", steps, final, operation="equation")

    raise ValueError("Only linear and quadratic equations are supported in Math Engine v1.")


def _differentiate_polynomial(expression: str) -> MathSolution:
    poly = _parse_polynomial(expression)
    derivative: Dict[int, Fraction] = {}
    steps = [f"1. Restate the problem: {_latex_inline(f'\\frac{{d}}{{dx}}({expression})')}."]
    step_number = 2
    for degree in sorted(poly.keys(), reverse=True):
        coef = poly[degree]
        if degree == 0:
            steps.append(f"{step_number}. The derivative of the constant {_latex_inline(_format_fraction(coef))} is {_latex_inline('0')}.")
            step_number += 1
            continue
        new_coef = coef * degree
        derivative[degree - 1] = derivative.get(degree - 1, Fraction(0, 1)) + new_coef
        term = _poly_to_string({degree: coef})
        derived_term = _poly_to_string({degree - 1: new_coef})
        steps.append(f"{step_number}. Apply the power rule: {_latex_inline(f'\\frac{{d}}{{dx}}({term}) = {derived_term}')} .")
        step_number += 1
    final = _poly_to_string(derivative) or "0"
    return _format_solution(f"\\frac{{d}}{{dx}}({expression})", steps, final, operation="differentiate")


def _integrate_polynomial(expression: str) -> MathSolution:
    poly = _parse_polynomial(expression)
    integral: Dict[int, Fraction] = {}
    steps = [f"1. Restate the problem: {_latex_inline(f'\\int ({expression})\\,dx')}."]
    step_number = 2
    for degree in sorted(poly.keys(), reverse=True):
        coef = poly[degree]
        new_degree = degree + 1
        new_coef = coef / new_degree
        integral[new_degree] = integral.get(new_degree, Fraction(0, 1)) + new_coef
        term = _poly_to_string({degree: coef})
        integrated_term = _poly_to_string({new_degree: new_coef})
        steps.append(f"{step_number}. Apply the power rule: {_latex_inline(f'\\int {term}\\,dx = {integrated_term}')} .")
        step_number += 1
    final = f"{_poly_to_string(integral)} + C"
    return _format_solution(f"\\int ({expression})\\,dx", steps, final, operation="integrate")


def _solve_arithmetic(expression: str) -> MathSolution:
    normalized = _normalize_math_text(expression)
    value = _safe_eval_numeric(normalized)
    steps = [
        f"1. Restate the problem: {_latex_inline(expression)}.",
        f"2. Normalize the expression: {_latex_inline(normalized)}.",
        f"3. Compute the exact value: {_latex_inline(_format_fraction(value))}.",
    ]
    final = _format_fraction_or_decimal(value)
    return _format_solution(expression, steps, final, operation="arithmetic")


def _ncr(n: int, r: int) -> int:
    return math.comb(n, r)


def _npr(n: int, r: int) -> int:
    return math.perm(n, r)


def _extract_number_list(text: str) -> list[Fraction]:
    matches = re.findall(r"[-+]?\d+(?:\.\d+)?", str(text or ""))
    return [_to_fraction(float(value)) if "." in value else Fraction(int(value), 1) for value in matches]


def _solve_statistics(problem: str) -> MathSolution:
    text = str(problem or "").strip()
    lowered = text.lower()
    values = _extract_number_list(text)
    if not values:
        raise ValueError("I could not find a list of numbers for the statistics calculation.")

    sorted_values = sorted(values)
    plain_values = ", ".join(_format_plain_fraction(item) for item in values)
    total = sum(values, Fraction(0, 1))

    if "mean" in lowered or "average" in lowered:
        result = total / len(values)
        steps = [
            f"1. Restate the data set: {_latex_inline(plain_values)}.",
            f"2. Add the values: {_latex_inline(f'{plain_values.replace(', ', ' + ')} = {_format_fraction(total)}')}.",
            f"3. Divide by the number of values: {_latex_inline(f'{_format_fraction(total)} / {len(values)} = {_format_fraction_or_decimal(result)}')}.",
        ]
        return _format_solution(f"mean of {plain_values}", steps, _format_fraction_or_decimal(result), operation="statistics")

    if "median" in lowered:
        result = median([float(item) for item in sorted_values])
        result_fraction = _to_fraction(result)
        sorted_text = ", ".join(_format_plain_fraction(item) for item in sorted_values)
        steps = [
            f"1. Sort the values: {_latex_inline(sorted_text)}.",
            "2. Take the middle value, or the average of the two middle values.",
            f"3. The median is {_latex_inline(_format_fraction_or_decimal(result_fraction))}.",
        ]
        return _format_solution(f"median of {plain_values}", steps, _format_fraction_or_decimal(result_fraction), operation="statistics")

    if "mode" in lowered:
        counts = {}
        for value in values:
            counts[value] = counts.get(value, 0) + 1
        highest = max(counts.values())
        modes = sorted(value for value, count in counts.items() if count == highest and highest > 1)
        if not modes:
            final = "No\\ mode"
            steps = [
                f"1. Count each value in {_latex_inline(plain_values)}.",
                "2. No number appears more often than the others.",
                "3. Therefore the data set has no mode.",
            ]
        else:
            final = ",\\ ".join(_format_fraction_or_decimal(item) for item in modes)
            steps = [
                f"1. Count each value in {_latex_inline(plain_values)}.",
                f"2. The most frequent value(s) are {_latex_inline(final)}.",
                "3. Those most frequent value(s) form the mode.",
            ]
        return _format_solution(f"mode of {plain_values}", steps, final, operation="statistics")

    if "range" in lowered:
        result = sorted_values[-1] - sorted_values[0]
        steps = [
            f"1. Identify the minimum and maximum values: {_latex_inline(f'{_format_fraction(sorted_values[0])},\\ {_format_fraction(sorted_values[-1])}')}.",
            f"2. Subtract minimum from maximum: {_latex_inline(f'{_format_fraction(sorted_values[-1])} - {_format_fraction(sorted_values[0])} = {_format_fraction(result)}')}.",
            "3. That difference is the range.",
        ]
        return _format_solution(f"range of {plain_values}", steps, _format_fraction_or_decimal(result), operation="statistics")

    if "variance" in lowered or "standard deviation" in lowered or "std deviation" in lowered:
        mean_value = total / len(values)
        squared_deviations = [(value - mean_value) ** 2 for value in values]
        variance = sum(squared_deviations, Fraction(0, 1)) / len(values)
        variance_text = _format_fraction_or_decimal(variance)
        if "variance" in lowered:
            steps = [
                f"1. Compute the mean: {_latex_inline(_format_fraction_or_decimal(mean_value))}.",
                "2. Find each squared deviation from the mean and average them.",
                f"3. Using population variance, the result is {_latex_inline(variance_text)}.",
            ]
            return _format_solution(f"variance of {plain_values}", steps, variance_text, operation="statistics")
        std_dev = math.sqrt(float(variance))
        std_text = _format_decimal(std_dev)
        steps = [
            f"1. Compute the population variance: {_latex_inline(variance_text)}.",
            f"2. Take the square root: {_latex_inline(f'\\sqrt{{{variance_text}}} = {std_text}')}.",
            "3. That square root is the population standard deviation.",
        ]
        return _format_solution(f"standard deviation of {plain_values}", steps, std_text, operation="statistics")

    raise ValueError("Supported statistics forms are mean, median, mode, range, variance, and standard deviation.")


def _coerce_fraction_matrix(value) -> list:
    if isinstance(value, (int, float)):
        return _to_fraction(value)
    if isinstance(value, list):
        return [_coerce_fraction_matrix(item) for item in value]
    raise ValueError("Matrix entries must be numeric.")


def _literal_matrix(text: str):
    try:
        parsed = ast.literal_eval(text)
    except Exception as exc:
        raise ValueError("I could not parse the matrix or vector format.") from exc
    return _coerce_fraction_matrix(parsed)


def _is_vector(value) -> bool:
    return isinstance(value, list) and value and all(isinstance(item, Fraction) for item in value)


def _is_matrix(value) -> bool:
    return (
        isinstance(value, list)
        and value
        and all(isinstance(row, list) and row and all(isinstance(item, Fraction) for item in row) for row in value)
    )


def _matrix_shape(value) -> tuple[int, int]:
    if _is_vector(value):
        return (1, len(value))
    if _is_matrix(value):
        row_lengths = {len(row) for row in value}
        if len(row_lengths) != 1:
            raise ValueError("Each matrix row must have the same length.")
        return (len(value), len(value[0]))
    raise ValueError("Expected a vector or matrix.")


def _format_matrix(value) -> str:
    if _is_vector(value):
        rows = " \\\\ ".join(_format_fraction(item) for item in value)
        return f"\\begin{{bmatrix}}{rows}\\end{{bmatrix}}"
    if _is_matrix(value):
        row_text = [" & ".join(_format_fraction(item) for item in row) for row in value]
        return f"\\begin{{bmatrix}}{' \\\\ '.join(row_text)}\\end{{bmatrix}}"
    raise ValueError("Expected a vector or matrix.")


def _matrix_add(left, right, sign: int = 1):
    if _is_vector(left) and _is_vector(right):
        if len(left) != len(right):
            raise ValueError("Vectors must have the same length.")
        return [left[index] + sign * right[index] for index in range(len(left))]
    if _is_matrix(left) and _is_matrix(right):
        if _matrix_shape(left) != _matrix_shape(right):
            raise ValueError("Matrices must have the same dimensions.")
        return [
            [left[row][col] + sign * right[row][col] for col in range(len(left[row]))]
            for row in range(len(left))
        ]
    raise ValueError("Use the same shape for both matrix operands.")


def _scalar_multiply(scalar: Fraction, value):
    if _is_vector(value):
        return [scalar * item for item in value]
    if _is_matrix(value):
        return [[scalar * item for item in row] for row in value]
    raise ValueError("Scalar multiplication needs a vector or matrix.")


def _matrix_multiply(left, right):
    if _is_vector(left) and _is_vector(right):
        if len(left) != len(right):
            raise ValueError("Vectors must have the same length for a dot product.")
        return sum((left[index] * right[index] for index in range(len(left))), Fraction(0, 1))
    if _is_matrix(left) and _is_matrix(right):
        left_rows, left_cols = _matrix_shape(left)
        right_rows, right_cols = _matrix_shape(right)
        if left_cols != right_rows:
            raise ValueError("Matrix dimensions do not allow multiplication.")
        result = []
        for row in range(left_rows):
            next_row = []
            for col in range(right_cols):
                value = sum((left[row][k] * right[k][col] for k in range(left_cols)), Fraction(0, 1))
                next_row.append(value)
            result.append(next_row)
        return result
    raise ValueError("Matrix multiplication requires two matrices or two vectors for a dot product.")


def _extract_matrix_literals(text: str) -> list[str]:
    literals = []
    depth = 0
    start = None
    for index, char in enumerate(text):
        if char == "[":
            if depth == 0:
                start = index
            depth += 1
        elif char == "]":
            depth -= 1
            if depth == 0 and start is not None:
                literals.append(text[start : index + 1])
                start = None
    return literals


def _solve_matrix(problem: str) -> MathSolution:
    text = str(problem or "").strip()
    lowered = text.lower()
    for pattern in UNSUPPORTED_MATRIX_PATTERNS:
        match = pattern.search(text)
        if match:
            raise ValueError(
                f"I recognized a matrix question, but {match.group(0).lower()} is not supported in Math Engine v1."
            )
    literals = _extract_matrix_literals(text)
    if not literals:
        raise ValueError("Enter matrices or vectors using brackets such as [[1,2],[3,4]] or [1,2].")

    parsed = [_literal_matrix(item) for item in literals]
    if len(parsed) == 1:
        scalar_match = re.search(r"([-+]?\d+(?:\.\d+)?)\s*\*\s*(\[[\s\S]+\])", text)
        if scalar_match:
            scalar = _to_fraction(float(scalar_match.group(1))) if "." in scalar_match.group(1) else Fraction(int(scalar_match.group(1)), 1)
            result = _scalar_multiply(scalar, parsed[0])
            steps = [
                f"1. Identify the scalar and matrix/vector: {_latex_inline(f'{scalar} \\text{{ and }} {_format_matrix(parsed[0])}')}.",
                f"2. Multiply each entry by {_latex_inline(str(scalar))}.",
                f"3. The scaled result is {_latex_inline(_format_matrix(result))}.",
            ]
            return _format_solution(_format_matrix(parsed[0]), steps, _format_matrix(result), operation="matrix")
        raise ValueError("Provide two matrices/vectors or include a scalar multiplication expression.")

    left, right = parsed[0], parsed[1]
    if "dot product" in lowered:
        result = _matrix_multiply(left, right)
        steps = [
            f"1. Restate the vectors: {_latex_inline(f'{_format_matrix(left)} \\cdot {_format_matrix(right)}')}.",
            "2. Multiply corresponding entries and add them.",
            f"3. The dot product is {_latex_inline(_format_fraction(result))}.",
        ]
        return _format_solution(f"{_format_matrix(left)} \\cdot {_format_matrix(right)}", steps, _format_fraction(result), operation="matrix")

    operator_match = re.search(r"\]\s*([+\-*])\s*\[", text)
    operator = operator_match.group(1) if operator_match else ""
    if operator == "+":
        result = _matrix_add(left, right, sign=1)
        steps = [
            f"1. Align matching positions in {_latex_inline(_format_matrix(left))} and {_latex_inline(_format_matrix(right))}.",
            "2. Add the corresponding entries.",
            f"3. The result is {_latex_inline(_format_matrix(result))}.",
        ]
        return _format_solution(f"{_format_matrix(left)} + {_format_matrix(right)}", steps, _format_matrix(result), operation="matrix")
    if operator == "-":
        result = _matrix_add(left, right, sign=-1)
        steps = [
            f"1. Align matching positions in {_latex_inline(_format_matrix(left))} and {_latex_inline(_format_matrix(right))}.",
            "2. Subtract each entry in the second matrix/vector from the matching entry in the first.",
            f"3. The result is {_latex_inline(_format_matrix(result))}.",
        ]
        return _format_solution(f"{_format_matrix(left)} - {_format_matrix(right)}", steps, _format_matrix(result), operation="matrix")

    if operator == "*" or "multiply" in lowered:
        result = _matrix_multiply(left, right)
        final = _format_fraction(result) if isinstance(result, Fraction) else _format_matrix(result)
        steps = [
            f"1. Restate the operation: {_latex_inline(f'{_format_matrix(left)} \\times {_format_matrix(right)}')}.",
            "2. Multiply rows by columns, or corresponding entries for a dot product.",
            f"3. The result is {_latex_inline(final)}.",
        ]
        return _format_solution(f"{_format_matrix(left)} \\times {_format_matrix(right)}", steps, final, operation="matrix")

    raise ValueError("Supported matrix/vector operations are addition, subtraction, scalar multiply, matrix multiply, and vector dot product.")


def _solve_function(problem: str) -> MathSolution:
    text = str(problem or "").strip()
    match = FUNCTION_EVAL_PATTERN.search(text)
    if not match:
        raise ValueError("Supported function handling in v1 is evaluating expressions like f(x)=x^2+1, find f(3).")
    expression = _normalize_math_text(match.group(1))
    x_value_raw = match.group(2)
    x_value = _to_fraction(float(x_value_raw)) if "." in x_value_raw else Fraction(int(x_value_raw), 1)
    poly = _parse_polynomial(expression, max_degree=4)
    result = sum(coef * (x_value ** degree) for degree, coef in poly.items())
    steps = [
        f"1. Restate the function: {_latex_inline(f'f(x) = {expression}')}.",
        f"2. Substitute {_latex_inline(f'x = {x_value_raw}')} into the function.",
        f"3. Simplify to get {_latex_inline(f'f({x_value_raw}) = {_format_fraction_or_decimal(result)}')}.",
    ]
    return _format_solution(f"f({x_value_raw})", steps, _format_fraction_or_decimal(result), operation="function")


def _solve_probability(problem: str) -> MathSolution:
    text = str(problem or "").strip().lower()
    combination_match = re.search(r"\b(?:ncr|combination(?:s)?)\s*\(?\s*(\d+)\s*,\s*(\d+)\s*\)?", text)
    if combination_match:
        n = int(combination_match.group(1))
        r = int(combination_match.group(2))
        value = _ncr(n, r)
        steps = [
            f"1. Restate the problem: {_latex_inline(f'C({n}, {r})')}.",
            "2. Use the combinations formula.",
            f"3. Substitute and simplify to get {_latex_inline(str(value))}.",
        ]
        return _format_solution(f"C({n}, {r})", steps, str(value), operation="probability")

    permutation_match = re.search(r"\b(?:npr|permutation(?:s)?)\s*\(?\s*(\d+)\s*,\s*(\d+)\s*\)?", text)
    if permutation_match:
        n = int(permutation_match.group(1))
        r = int(permutation_match.group(2))
        value = _npr(n, r)
        steps = [
            f"1. Restate the problem: {_latex_inline(f'P({n}, {r})')}.",
            "2. Use the permutations formula.",
            f"3. Substitute and simplify to get {_latex_inline(str(value))}.",
        ]
        return _format_solution(f"P({n}, {r})", steps, str(value), operation="probability")

    bag_match = re.search(
        r"(?:a\s+)?bag\s+(?:contains|has)\s+(\d+)\s+([a-z]+)(?:\s+(?:balls?|marbles?))?\s+and\s+(\d+)\s+([a-z]+)\s+(?:balls?|marbles?).*?(?:probability|chance).*?(?:draw(?:ing)?|pick(?:ing)?)(?:\s+one)?(?:\s+of)?\s+(?:a|an)?\s*([a-z]+)",
        text,
    )
    if bag_match:
        first_count = int(bag_match.group(1))
        first_color = bag_match.group(2)
        second_count = int(bag_match.group(3))
        second_color = bag_match.group(4)
        target_color = bag_match.group(5)
        counts = {first_color: first_count, second_color: second_count}
        if target_color not in counts:
            raise ValueError("The requested bag color does not match the colors described in the problem.")
        total = sum(counts.values())
        probability = Fraction(counts[target_color], total)
        steps = [
            f"1. Count the favorable outcomes: {_latex_inline(str(counts[target_color]))}.",
            f"2. Count the total outcomes: {_latex_inline(str(total))}.",
            f"3. Compute probability as {_latex_inline(f'{counts[target_color]}/{total} = {_format_fraction(probability)}')}.",
        ]
        return _format_solution(
            f"P({target_color})",
            steps,
            _format_fraction(probability),
            operation="probability",
        )

    binomial_match = re.search(
        r"(?:exactly|at least|at most)\s+(\d+)\s+(?:successes?|heads?)\s+in\s+(\d+)\s+(?:trials?|tosses?)"
        r"(?:.*?\bp\s*=\s*([0-9.]+))?",
        text,
    )
    if binomial_match:
        k = int(binomial_match.group(1))
        n = int(binomial_match.group(2))
        p = float(binomial_match.group(3)) if binomial_match.group(3) else 0.5
        mode = "exactly" if "exactly" in text else "at least" if "at least" in text else "at most"

        def binom_term(successes: int) -> float:
            return _ncr(n, successes) * (p ** successes) * ((1 - p) ** (n - successes))

        if mode == "exactly":
            probability = binom_term(k)
            expression = f"P(X = {k}) = C({n},{k}) \\cdot {p}^{k} \\cdot {1-p}^{n-k}"
        elif mode == "at least":
            probability = sum(binom_term(i) for i in range(k, n + 1))
            expression = f"P(X \\ge {k}) = \\sum C({n},i) {p}^i {1-p}^{n-i}"
        else:
            probability = sum(binom_term(i) for i in range(0, k + 1))
            expression = f"P(X \\le {k}) = \\sum C({n},i) {p}^i {1-p}^{n-i}"

        steps = [
            f"1. Restate the binomial setting with {_latex_inline(f'n = {n},\\ k = {k},\\ p = {p}')}.",
            "2. Use the binomial model.",
            f"3. Write the expression: {_latex_inline(expression)}.",
            f"4. Evaluate to get {_latex_inline(_format_decimal(probability))}.",
        ]
        return _format_solution(problem, steps, _format_decimal(probability), operation="probability")

    fraction_match = re.search(
        r"(?:probability|chance).*(?:favorable|successful)\s*(?:outcomes?)?\s*(\d+).*(?:total|possible)\s*(?:outcomes?)?\s*(\d+)",
        text,
    )
    if fraction_match:
        favorable = int(fraction_match.group(1))
        total = int(fraction_match.group(2))
        probability = Fraction(favorable, total)
        steps = [
            "1. Use probability = favorable outcomes / total outcomes.",
            f"2. Substitute the values: {_latex_inline(f'{favorable}/{total}')}.",
            f"3. Simplify the fraction: {_latex_inline(_format_fraction(probability))}.",
        ]
        return _format_solution(problem, steps, _format_fraction(probability), operation="probability")

    raise ValueError("Supported probability forms are combinations, permutations, simple bag questions, simple fractions, and basic binomial questions.")


def _solve_simple_word_problem(problem: str) -> MathSolution:
    text = str(problem or "").strip().lower()
    match = re.search(r"sum of a number and (\d+) is (\d+)", text)
    if match:
        addend = int(match.group(1))
        total = int(match.group(2))
        equation = f"x + {addend} = {total}"
        return _solve_equation(equation)
    match = re.search(r"(\d+) more than a number is (\d+)", text)
    if match:
        addend = int(match.group(1))
        total = int(match.group(2))
        equation = f"x + {addend} = {total}"
        return _solve_equation(equation)
    match = re.search(r"a number plus (\d+) equals (\d+)", text)
    if match:
        addend = int(match.group(1))
        total = int(match.group(2))
        equation = f"x + {addend} = {total}"
        return _solve_equation(equation)
    raise ValueError("This word problem does not map cleanly to a supported equation form yet.")


def solve_math_problem(problem: str, source: str = "typed") -> MathSolution:
    parsed = _classify_math_input(problem, source=source)

    try:
        if parsed.operation == "differentiate":
            result = _differentiate_polynomial(parsed.expression)
        elif parsed.operation == "integrate":
            result = _integrate_polynomial(parsed.expression)
        elif parsed.operation == "probability":
            result = _solve_probability(parsed.original_text)
        elif parsed.operation == "statistics":
            result = _solve_statistics(parsed.original_text)
        elif parsed.operation == "matrix":
            result = _solve_matrix(parsed.original_text)
        elif parsed.operation == "function":
            result = _solve_function(parsed.original_text)
        elif parsed.operation == "equation":
            result = _solve_equation(parsed.normalized_text)
        elif parsed.operation == "word_problem":
            result = _solve_simple_word_problem(parsed.original_text)
        elif parsed.operation == "arithmetic":
            result = _solve_arithmetic(parsed.expression or parsed.normalized_text)
        else:
            return _unsupported_solution(parsed, "Unsupported math form.")
    except Exception as exc:
        limitation = str(exc).strip() or "This math problem is more complex than the current deterministic solver supports."
        return _unsupported_solution(parsed, limitation)

    result.source = source
    return result
