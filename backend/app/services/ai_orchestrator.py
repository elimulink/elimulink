from __future__ import annotations
import re
from typing import Any, Dict, Optional, Tuple

from ..repositories.chat_repository import create_session, get_session, save_message
from ..services.chemistry_service import solve_chemistry_problem
from ..services.auth_service import resolve_app_type, resolve_role
from ..services.gemini_client import generate_answer
from ..services.intent_router import detect_intent
from ..services.memory_service import get_recent_history
from ..services.math_service import solve_math_problem
from ..services.permission_service import can_access_tool
from ..services.physics_service import solve_physics_problem
from ..services.prompt_builder import build_context_prompt
from ..services.research_service import generate_research_answer, is_research_prompt
from ..services.workflow_service import assist_with_workflow
from ..tools.student_tools import (
    get_attendance,
    get_fee_balance,
    get_profile,
    get_results,
    get_timetable,
    get_units,
)
from ..utils.ids import new_session_id

_ADMIN_LIKE_ROLES = {"admin", "institution_admin", "department_head", "staff", "lecturer", "super_admin"}
_PERSONAL_SCOPE_PATTERN = re.compile(r"\b(?:my|me|mine|for me|my own)\b", re.IGNORECASE)
_STUDENT_ACTIVITY_PATTERN = re.compile(
    r"\b(?:what are students doing|how are students doing|student update|student activity|students activity|recent student activity)\b",
    re.IGNORECASE,
)
_INSTITUTION_DATA_SCOPE_PATTERN = re.compile(
    r"\b(?:fees?|attendance|results?|gpa|analytics)\b|\b(?:attendance|results?|fees?)\s+(?:trend|status|summary)\b|\b(?:student|students)\s+(?:update|activity|status|summary)\b",
    re.IGNORECASE,
)


def _is_admin_like_role(role: str) -> bool:
    return str(role or "").strip().lower() in _ADMIN_LIKE_ROLES


def _is_personal_scope_request(message: str) -> bool:
    return bool(_PERSONAL_SCOPE_PATTERN.search(str(message or "").strip()))


def _looks_like_institution_scope_data_request(
    *,
    message: str,
    intent: str,
    resolved_app: str,
    role: str,
    workspace_context: Optional[Dict[str, Any]],
) -> bool:
    if resolved_app != "institution":
        return False
    if not _is_admin_like_role(role):
        return False
    if _is_personal_scope_request(message):
        return False

    normalized_intent = str(intent or "").strip().lower()
    normalized_message = str(message or "").strip().lower()
    if normalized_intent in {"fee_balance", "attendance", "results", "units", "institution_analytics"}:
        return True
    if _STUDENT_ACTIVITY_PATTERN.search(normalized_message):
        return True
    if _INSTITUTION_DATA_SCOPE_PATTERN.search(normalized_message):
        return True
    return False


def _institution_data_unavailable_response(message: str, intent: str) -> tuple[str, list[dict[str, Any]]]:
    normalized_intent = str(intent or "").strip().lower()
    normalized_message = str(message or "").strip().lower()

    if normalized_intent == "fee_balance" or "fee" in normalized_message:
        text = (
            "I do not have a live institution-wide fees feed in this chat path right now. "
            "I can still help you define the exact fees summary to pull, structure a dean-ready update, or summarize a real export if you paste it here."
        )
    elif normalized_intent == "attendance" or "attendance" in normalized_message:
        text = (
            "I do not have a live institution-wide attendance trend feed in this chat path right now. "
            "I can still help you define the trend view, turn exported attendance data into a summary, or draft the update you need."
        )
    elif normalized_intent == "results" or "result" in normalized_message or "gpa" in normalized_message:
        text = (
            "I do not have a live institution-wide results status feed in this chat path right now. "
            "I can still help you outline the results snapshot, list the exact status fields to check, or summarize real result data you provide."
        )
    elif normalized_intent == "institution_analytics":
        text = (
            "I do not have a live scoped institution analytics feed connected to this chat path right now. "
            "I can still help you define the metrics to review, interpret a real dashboard export, or draft a concise management summary."
        )
    elif _STUDENT_ACTIVITY_PATTERN.search(normalized_message):
        text = (
            "I do not have live scoped student activity data in this chat path right now. "
            "I can still help you narrow this into attendance, fees, results, or workflow activity, then structure the update around real data."
        )
    else:
        text = (
            "I do not have live scoped institution data for that request in this chat path right now. "
            "I can still help you frame the summary, specify the exact fields to pull, or turn real exported data into a clear report."
        )

    metadata = [
        {
            "kind": "institution_data_capability",
            "sourceType": "institution_data",
            "grounded": False,
            "liveDataAvailable": False,
            "requestedIntent": normalized_intent or "general_chat",
        }
    ]
    return text, metadata


async def run_orchestrator(
    db,
    user,
    message: str,
    session_id: Optional[str],
    app_type: Optional[str],
    mode: Optional[str] = None,
    workspace_context: Optional[Dict[str, Any]] = None,
    assistant_style: Optional[str] = None,
    request_metadata: Optional[Dict[str, Any]] = None,
) -> Tuple[str, str, str, Optional[str], list[dict[str, Any]]]:
    resolved_app = resolve_app_type(app_type)
    role = resolve_role(user)
    user_id = getattr(user, "uid", None) or "public"
    tenant_id = getattr(user, "institution_id", None)

    current_session_id = session_id or new_session_id()
    if not get_session(db, current_session_id):
        create_session(db, current_session_id, user_id, resolved_app, tenant_id, title="New Chat")

    intent = detect_intent(message, request_metadata=request_metadata)
    tool_used = None
    tool_data: Dict[str, Any] | None = None
    sources: list[dict[str, Any]] = []
    institution_data_gap = _looks_like_institution_scope_data_request(
        message=message,
        intent=intent,
        resolved_app=resolved_app,
        role=role,
        workspace_context=workspace_context,
    )

    if institution_data_gap:
        tool_used = "institution_data_unavailable"
    elif intent == "profile" and can_access_tool(role, "profile"):
        tool_used = "get_student_profile"
        tool_data = get_profile(db, user_id)
    elif intent == "timetable" and can_access_tool(role, "timetable"):
        tool_used = "get_student_timetable"
        tool_data = get_timetable(db, user_id)
    elif intent == "fee_balance" and can_access_tool(role, "fee_balance"):
        tool_used = "get_student_fee_balance"
        tool_data = get_fee_balance(db, user_id)
    elif intent == "results" and can_access_tool(role, "results"):
        tool_used = "get_student_results"
        tool_data = get_results(db, user_id)
    elif intent == "attendance" and can_access_tool(role, "attendance"):
        tool_used = "get_student_attendance"
        tool_data = get_attendance(db, user_id)
    elif intent == "units" and can_access_tool(role, "units"):
        tool_used = "get_student_units"
        tool_data = get_units(db, user_id)

    save_message(db, current_session_id, "user", message, intent=intent, tool_used=None)
    history = get_recent_history(db, current_session_id, limit=6, request_metadata=request_metadata)
    context_payload = {
        "app_type": resolved_app,
        "role": role,
        "tool_data": tool_data or {},
        "history": history,
        "assistantStyle": assistant_style,
    }

    if institution_data_gap:
        answer, sources = _institution_data_unavailable_response(message, intent)
        error_code = None
    elif resolved_app == "institution" and intent == "research_with_sources" and is_research_prompt(message):
        tool_used = "research_sources_lookup"
        answer, sources = await generate_research_answer(
            message,
            context_payload,
            mode=mode,
            workspace_context=workspace_context,
            assistant_style=assistant_style,
        )
        error_code = None
    elif intent == "math_solver":
        tool_used = "deterministic_math_solver"
        answer = solve_math_problem(message).text
        error_code = None
    elif intent == "physics_solver":
        tool_used = "deterministic_physics_solver"
        answer = solve_physics_problem(message).text
        error_code = None
    elif intent == "chemistry_solver":
        tool_used = "deterministic_chemistry_solver"
        answer = solve_chemistry_problem(message).text
        error_code = None
    elif intent == "workflow_assistant":
        tool_used = "workflow_assistant"
        workflow_result = assist_with_workflow(
            message,
            actor_id=user_id,
            actor_role=role,
            confirm_real_action=False,
        )
        answer = workflow_result.text
        sources = [
            {
                "kind": "workflow",
                "scenario": workflow_result.scenario,
                "workflow_kind": workflow_result.workflow_kind,
                "safe_real_available": workflow_result.safe_real_available,
                "integration_points": workflow_result.integration_points,
            }
        ]
        error_code = None
    else:
        prompt = build_context_prompt(message, intent, tool_data, history, request_metadata=request_metadata)
        answer, error_code = await generate_answer(
            prompt,
            context_payload,
            mode=mode,
            workspace_context=workspace_context,
            assistant_style=assistant_style,
        )
    save_message(
        db,
        current_session_id,
        "assistant",
        answer,
        intent=intent,
        tool_used=tool_used,
    )
    if error_code:
        intent = f"{intent}:{error_code}"
    return answer, current_session_id, intent, tool_used, sources
