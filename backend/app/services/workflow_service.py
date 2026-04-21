from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from ..workflow_engine import WorkflowItem, WorkflowType, workflow_engine


WORKFLOW_TRIGGER_PATTERN = re.compile(
    r"\b(?:apply|application|register|registration|create club|club registration|submit|submission)\b",
    re.IGNORECASE,
)
SAFE_REAL_CONFIRM_PATTERN = re.compile(
    r"\b(?:confirm|go ahead|proceed|create it now|open the workflow|submit the request now)\b",
    re.IGNORECASE,
)
MOCK_PATTERN = re.compile(r"\b(?:mock|demo|simulate|example workflow|sample workflow|pretend)\b", re.IGNORECASE)


@dataclass
class WorkflowAssistResult:
    text: str
    detected: bool
    workflow_kind: str = "guidance"
    scenario: str = "generic_workflow"
    safe_real_available: bool = False
    confirmation_required: bool = True
    preview_payload: Dict[str, Any] = field(default_factory=dict)
    created_workflow: Optional[Dict[str, Any]] = None
    integration_points: List[str] = field(default_factory=list)


def is_workflow_prompt(message: str) -> bool:
    text = str(message or "").strip()
    if not text:
        return False
    lowered = text.lower()
    if not WORKFLOW_TRIGGER_PATTERN.search(text):
        return False
    if "apply" in lowered and "theme" in lowered:
        return False
    if "submit" in lowered and "feedback" in lowered:
        return False
    return True


def _detect_scenario(message: str) -> str:
    text = str(message or "").lower()
    if "kuccps" in text or ("apply" in text and "course" in text):
        return "kuccps_application"
    if "club" in text and ("create" in text or "register" in text):
        return "club_creation"
    if "document" in text or "documents" in text or "transcript" in text or "certificate" in text:
        return "document_submission"
    if "missing marks" in text or ("marks" in text and "missing" in text):
        return "missing_marks"
    if "fee" in text and ("issue" in text or "balance" in text or "payment" in text):
        return "fee_issue"
    if "assignment" in text and "submit" in text:
        return "assignment_submission"
    if "exam" in text and "submit" in text:
        return "exam_submission"
    if "gpa" in text and ("review" in text or "appeal" in text):
        return "gpa_review"
    return "generic_workflow"


def _guidance_steps_for_scenario(scenario: str) -> tuple[str, list[str], list[str]]:
    if scenario == "kuccps_application":
        return (
            "KUCCPS application guidance",
            [
                "Check the active KUCCPS intake window and confirm the course code you want.",
                "Prepare KCSE index details, contact information, and any institution-specific requirements.",
                "Log in to the KUCCPS portal, review eligibility, and rank your course choices carefully.",
                "Review the summary page before submission and keep the confirmation message or reference.",
            ],
            ["KCSE index number", "target course codes", "phone/email access", "deadline date"],
        )
    if scenario == "club_creation":
        return (
            "Club creation workflow",
            [
                "Draft the club purpose, leadership roles, and basic activity plan.",
                "Prepare the member starter list and any required constitution or proposal document.",
                "Submit the proposal to student affairs or the responsible department office.",
                "Wait for review, respond to requested edits, and only publish after written approval.",
            ],
            ["club name", "purpose statement", "starter member list", "proposal or constitution"],
        )
    if scenario == "document_submission":
        return (
            "Document submission flow",
            [
                "Confirm exactly which document is required and which office receives it.",
                "Prepare the file in the accepted format and verify names, signatures, and dates.",
                "Submit through the correct portal, email, or office counter and capture proof of submission.",
                "Track the reference number or acknowledgement so you can follow up safely.",
            ],
            ["document type", "receiving office", "deadline", "file format or signature requirements"],
        )
    if scenario == "missing_marks":
        return (
            "Missing marks workflow",
            [
                "Collect the course code, student identifier, and the exact assessment that is missing.",
                "Open an academic results workflow or departmental review request.",
                "Attach supporting evidence such as submission receipts or lecturer confirmation if available.",
                "Escalate to approval only after the academic records team verifies the missing mark case.",
            ],
            ["course code", "student ID", "assessment name", "supporting evidence"],
        )
    if scenario == "fee_issue":
        return (
            "Fee issue workflow",
            [
                "Identify whether the issue is a balance mismatch, missing payment, or clearance hold.",
                "Collect payment references, dates, and screenshots or receipts.",
                "Open a fees workflow for review by the responsible office.",
                "Wait for verification before treating the balance as corrected.",
            ],
            ["student ID", "payment reference", "payment date", "receipt or statement"],
        )
    if scenario == "assignment_submission":
        return (
            "Assignment submission workflow",
            [
                "Confirm the assignment title, target lecturer or department, and the submission deadline.",
                "Verify the final file, naming format, and any rubric or template requirements.",
                "Submit through the approved channel and capture the acknowledgement or timestamp.",
                "If approval or moderation is needed, route the record for review instead of assuming completion.",
            ],
            ["assignment title", "target recipient", "deadline", "final file"],
        )
    if scenario == "exam_submission":
        return (
            "Exam submission workflow",
            [
                "Confirm the exam record, authorized recipient, and required approval path.",
                "Validate the document pack before any handoff.",
                "Route the submission for review instead of treating it as auto-approved.",
                "Keep a clear audit trail of who prepared, reviewed, and received the material.",
            ],
            ["exam identifier", "recipient office", "approval path", "submission pack"],
        )
    if scenario == "gpa_review":
        return (
            "GPA review workflow",
            [
                "List the term, units, and marks that affect the GPA concern.",
                "Open a review request with the academic results office.",
                "Attach the result sheet or evidence that explains the discrepancy.",
                "Escalate for approval only after the academic records team confirms the review basis.",
            ],
            ["student ID", "semester", "affected units", "supporting result evidence"],
        )
    return (
        "Workflow guidance",
        [
            "Clarify the exact request, target office, and expected outcome.",
            "Gather the minimum documents or identifiers needed for the request.",
            "Submit through the correct office or portal and keep the acknowledgement.",
            "Escalate only after a reviewer confirms the next action.",
        ],
        ["request goal", "target office", "required documents", "deadline"],
    )


def _workflow_type_for_scenario(scenario: str) -> WorkflowType | None:
    mapping = {
        "missing_marks": WorkflowType.MISSING_MARKS,
        "fee_issue": WorkflowType.FEE_ISSUE,
        "assignment_submission": WorkflowType.ASSIGNMENT_SUBMISSION,
        "exam_submission": WorkflowType.EXAM_SUBMISSION,
        "gpa_review": WorkflowType.GPA_REVIEW,
        "document_submission": WorkflowType.TRANSCRIPT_REQUEST,
    }
    return mapping.get(scenario)


def _format_guidance(title: str, steps: list[str], required_items: list[str], safety_line: str, next_step: str) -> str:
    numbered = "\n".join(f"{index}. {step}" for index, step in enumerate(steps, start=1))
    requirements = ", ".join(required_items)
    return (
        f"{title}\n\n"
        f"Required items: {requirements}\n\n"
        f"Steps:\n{numbered}\n\n"
        f"Safety: {safety_line}\n\n"
        f"Next step: {next_step}"
    )


def assist_with_workflow(
    message: str,
    *,
    actor_id: str = "assistant",
    actor_role: str = "student",
    confirm_real_action: bool = False,
) -> WorkflowAssistResult:
    if not is_workflow_prompt(message):
        return WorkflowAssistResult(text="", detected=False)

    scenario = _detect_scenario(message)
    title, steps, required_items = _guidance_steps_for_scenario(scenario)
    safe_real_type = _workflow_type_for_scenario(scenario)
    mock_requested = bool(MOCK_PATTERN.search(message or ""))
    confirmation_requested = confirm_real_action or bool(SAFE_REAL_CONFIRM_PATTERN.search(message or ""))

    preview_payload: Dict[str, Any] = {
        "scenario": scenario,
        "title": title,
        "requiredItems": required_items,
        "proposedWorkflowType": safe_real_type.value if safe_real_type else None,
    }

    if mock_requested:
        text = _format_guidance(
            title=f"{title} (demo mode)",
            steps=steps,
            required_items=required_items,
            safety_line="This is a mock workflow preview only. Nothing has been submitted.",
            next_step="If you want, I can turn this into a ready-to-use checklist or a safe internal workflow request.",
        )
        return WorkflowAssistResult(
            text=text,
            detected=True,
            workflow_kind="mock_demo",
            scenario=scenario,
            safe_real_available=bool(safe_real_type),
            confirmation_required=bool(safe_real_type),
            preview_payload=preview_payload,
            integration_points=["/api/workflows (preview only, not executed)"] if safe_real_type else [],
        )

    if safe_real_type and confirmation_requested:
        item = workflow_engine.create_workflow(
            workflow_type=safe_real_type,
            title=title,
            description=str(message or "").strip(),
            created_by=actor_id,
            created_by_role=actor_role,
            metadata={
                "source": "workflow_assistant",
                "scenario": scenario,
                "safeExecution": True,
                "destructive": False,
                "confirmationUsed": True,
            },
        )
        text = _format_guidance(
            title=f"{title} (safe workflow created)",
            steps=steps,
            required_items=required_items,
            safety_line="A safe internal workflow record was created. No destructive action or external submission was performed.",
            next_step=f"Review workflow {item.id} and move it forward only after human confirmation.",
        )
        return WorkflowAssistResult(
            text=text,
            detected=True,
            workflow_kind="real_safe",
            scenario=scenario,
            safe_real_available=True,
            confirmation_required=False,
            preview_payload=preview_payload,
            created_workflow={
                "id": item.id,
                "workflow_type": item.workflow_type.value,
                "status": item.status.value,
                "title": item.title,
            },
            integration_points=["/api/workflows", f"/api/workflows/{item.id}"],
        )

    safety_line = (
        "I can guide the workflow and prepare a safe internal request, but I will not auto-submit or perform destructive actions."
    )
    next_step = (
        "If you want a demo, say simulate it. If you want a safe internal workflow record where supported, explicitly confirm before creation."
    )
    text = _format_guidance(
        title=title,
        steps=steps,
        required_items=required_items,
        safety_line=safety_line,
        next_step=next_step,
    )
    integration_points = ["/api/workflows"] if safe_real_type else []
    return WorkflowAssistResult(
        text=text,
        detected=True,
        workflow_kind="guidance",
        scenario=scenario,
        safe_real_available=bool(safe_real_type),
        confirmation_required=bool(safe_real_type),
        preview_payload=preview_payload,
        integration_points=integration_points,
    )
