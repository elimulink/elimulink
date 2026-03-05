from __future__ import annotations

import time

from fastapi import APIRouter


router = APIRouter()


@router.get("/health")
async def health() -> object:
    return {"ok": True, "ts": int(time.time() * 1000)}
