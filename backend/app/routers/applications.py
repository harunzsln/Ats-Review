"""Application (Kanban card) CRUD endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from ..auth import CurrentUser
from ..dependencies import require_consent
from ..models.schemas import (
    Application,
    ApplicationCreate,
    ApplicationStatus,
    ApplicationUpdate,
)
from ..supabase_client import get_user_client

router = APIRouter(prefix="/api/applications", tags=["applications"])


@router.post("", response_model=Application, status_code=201)
def create_application(
    payload: ApplicationCreate,
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> Application:
    record = payload.model_dump()
    record["status"] = payload.status.value
    record["user_id"] = user.id
    res = client.table("applications").insert(record).execute()
    return Application(**res.data[0])


@router.get("", response_model=list[Application])
def list_applications(
    status: ApplicationStatus | None = None,
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> list[Application]:
    query = client.table("applications").select("*").eq("user_id", user.id)
    if status is not None:
        query = query.eq("status", status.value)
    res = query.order("created_at", desc=True).execute()
    return [Application(**row) for row in res.data]


@router.get("/{application_id}", response_model=Application)
def get_application(
    application_id: str,
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> Application:
    res = client.table("applications").select("*").eq("id", application_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Application not found")
    return Application(**res.data[0])


@router.patch("/{application_id}", response_model=Application)
def update_application(
    application_id: str,
    payload: ApplicationUpdate,
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> Application:
    """Update an application — primarily used by the Kanban board for status
    changes via drag-and-drop. ``status_updated_at`` is refreshed by a DB
    trigger when the status changes.
    """
    update = payload.model_dump(exclude_none=True)
    if "status" in update and isinstance(update["status"], ApplicationStatus):
        update["status"] = update["status"].value
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = (
        client.table("applications")
        .update(update)
        .eq("id", application_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Application not found")
    return Application(**res.data[0])


@router.delete("/{application_id}", status_code=204, response_model=None)
def delete_application(
    application_id: str,
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> None:
    client.table("applications").delete().eq("id", application_id).execute()
