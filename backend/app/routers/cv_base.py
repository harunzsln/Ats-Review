"""CV base (master CV) endpoints — upload, parse, list, signed-URL, delete."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from supabase import Client

from ..auth import CurrentUser
from ..dependencies import require_consent
from ..models.schemas import CvBase
from ..services import cv_parser, storage
from ..supabase_client import get_user_client

router = APIRouter(prefix="/api/cv-base", tags=["cv_base"])


@router.post("", response_model=CvBase, status_code=201)
async def upload_cv(
    file: UploadFile = File(...),
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> CvBase:
    """Upload a CV PDF, parse it to structured JSON, persist metadata.

    The file goes to the private ``cv-files`` bucket under ``<user_id>/...``;
    only the storage path is stored, never a public URL (§4.5).
    """
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=415, detail="Only PDF files are accepted.")

    data = await file.read()
    parsed = cv_parser.parse_cv_pdf(data)

    filename = f"{uuid.uuid4()}.pdf"
    storage_path = storage.upload_cv(client, user.id, filename, data)

    res = (
        client.table("cv_base")
        .insert(
            {
                "user_id": user.id,
                "original_filename": file.filename or filename,
                "storage_path": storage_path,
                "parsed_content": parsed,
            }
        )
        .execute()
    )
    return CvBase(**res.data[0])


@router.get("", response_model=list[CvBase])
def list_cv_base(
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> list[CvBase]:
    res = (
        client.table("cv_base")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .execute()
    )
    return [CvBase(**row) for row in res.data]


@router.get("/{cv_base_id}", response_model=CvBase)
def get_cv_base(
    cv_base_id: str,
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> CvBase:
    res = client.table("cv_base").select("*").eq("id", cv_base_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="CV not found")
    return CvBase(**res.data[0])


@router.get("/{cv_base_id}/download-url")
def get_download_url(
    cv_base_id: str,
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> dict[str, str]:
    """Mint a short-lived signed URL for the private CV file (§4.5)."""
    res = client.table("cv_base").select("storage_path").eq("id", cv_base_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="CV not found")
    signed = storage.create_signed_url(client, res.data[0]["storage_path"])
    return {"signed_url": signed}


@router.delete("/{cv_base_id}", status_code=204, response_model=None)
def delete_cv_base(
    cv_base_id: str,
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> None:
    res = client.table("cv_base").select("storage_path").eq("id", cv_base_id).execute()
    if res.data:
        try:
            from ..config import get_settings

            client.storage.from_(get_settings().cv_bucket).remove(
                [res.data[0]["storage_path"]]
            )
        except Exception:  # noqa: BLE001 - storage cleanup is best-effort
            pass
    client.table("cv_base").delete().eq("id", cv_base_id).execute()
