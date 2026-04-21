from __future__ import annotations


def can_access_tool(role: str, tool_name: str) -> bool:
    admin_roles = {"admin", "institution_admin", "department_head", "staff", "super_admin"}
    authenticated_roles = admin_roles | {"student", "lecturer"}
    normalized_role = str(role or "").strip().lower()
    if tool_name == "institution_analytics":
        return normalized_role in admin_roles
    if tool_name in {"profile", "timetable", "fee_balance", "results", "attendance", "units"}:
        return normalized_role in authenticated_roles
    return normalized_role not in {"", "public", "public_user"}
