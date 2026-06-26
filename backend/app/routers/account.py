"""Account-level KVKK endpoints — data export (Art. 11) and hard delete (Art. 7)."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from supabase import Client

from ..auth import CurrentUser, get_current_user
from ..supabase_client import get_admin_client, get_user_client

router = APIRouter(prefix="/api/account", tags=["account"])

# Tables that hold the user's personal data, exported and (via cascade) deleted.
_USER_TABLES = [
    "profiles",
    "cv_base",
    "cv_versions",
    "job_postings",
    "applications",
    "interview_simulations",
    "cold_messages",
]


@router.get("/export")
def export_account(
    user: CurrentUser = Depends(get_current_user),
    client: Client = Depends(get_user_client),
) -> JSONResponse:
    """Full export of the user's own data as JSON (KVKK Art. 11, §4.3).

    Runs under the user's RLS context, so it can only ever return their rows.
    """
    export: dict[str, object] = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "user_id": user.id,
        "email": user.email,
        "data": {},
    }
    for table in _USER_TABLES:
        column = "id" if table == "profiles" else "user_id"
        res = client.table(table).select("*").eq(column, user.id).execute()
        export["data"][table] = res.data

    return JSONResponse(
        content=export,
        headers={
            "Content-Disposition": (
                f'attachment; filename="ats-review-export-{user.id}.json"'
            )
        },
    )


@router.delete("", status_code=200)
def delete_account(
    user: CurrentUser = Depends(get_current_user),
    admin: Client = Depends(get_admin_client),
) -> dict[str, str]:
    """Hard-delete the account and ALL related data (KVKK Art. 7, §4.3).

    Deleting the auth.users row cascades to every public.* table via
    ``ON DELETE CASCADE``. We prefer hard delete over soft delete so an erasure
    request is fully honored. Sessions are revoked first because deleting a user
    does not invalidate already-issued tokens.
    """
    try:
        admin.auth.admin.sign_out(user.id, "global")
    except Exception:  # noqa: BLE001 - best-effort session revocation
        pass

    try:
        admin.auth.admin.delete_user(user.id)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=500, detail=f"Account deletion failed: {exc}"
        )

    return {
        "status": "deleted",
        "detail": "All personal data has been permanently erased.",
    }
