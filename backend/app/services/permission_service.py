from __future__ import annotations


def can_access_tool(role: str, tool_name: str) -> bool:
    admin_roles = {"admin", "institution_admin", "department_head", "staff", "super_admin"}
    if tool_name == "institution_analytics":
        return role in admin_roles
    return True
