from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile


UPLOAD_DIR = Path("backend/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


async def save_upload(file: UploadFile) -> dict:
    suffix = Path(file.filename or "").suffix
    file_id = f"{uuid4().hex}{suffix}"
    path = UPLOAD_DIR / file_id

    content = await file.read()
    path.write_bytes(content)

    return {
        "id": file_id,
        "filename": file.filename,
        "content_type": file.content_type,
        "size": len(content),
        "path": str(path),
    }

