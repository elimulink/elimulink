import os
from typing import Any

try:
    from supabase import Client, create_client
except Exception:  # noqa: BLE001
    Client = Any
    create_client = None


supabase: Client | None = None
_supabase_config: tuple[str, str] | None = None


def get_supabase_client() -> Client | None:
    global supabase, _supabase_config

    if create_client is None:
        return None

    url = (os.getenv("SUPABASE_URL") or "").strip()
    service_role_key = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()

    if not url or not service_role_key:
        return None

    current_config = (url, service_role_key)
    if supabase is None or _supabase_config != current_config:
        supabase = create_client(url, service_role_key)
        _supabase_config = current_config

    return supabase
