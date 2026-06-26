"""Profile + KVKK consent endpoints (§4.1)."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from ..auth import CurrentUser, get_current_user
from ..config import Settings, get_settings
from ..models.schemas import ConsentRequest, Profile
from ..supabase_client import get_user_client

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("", response_model=Profile)
def get_profile(
    user: CurrentUser = Depends(get_current_user),
    client: Client = Depends(get_user_client),
) -> Profile:
    res = client.table("profiles").select("*").eq("id", user.id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return Profile(**res.data)


@router.post("/consent", response_model=Profile)
def record_consent(
    payload: ConsentRequest,
    user: CurrentUser = Depends(get_current_user),
    client: Client = Depends(get_user_client),
    settings: Settings = Depends(get_settings),
) -> Profile:
    """Record explicit, opt-in KVKK consent (§4.1).

    Consent must be opt-in: we reject the request unless ``consent_given`` is
    true. We also reject stale disclosure versions so the client re-prompts.
    """
    if not payload.consent_given:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="KVKK consent must be explicitly given (opt-in).",
        )
    if payload.disclosure_version != settings.kvkk_disclosure_version:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Disclosure text is out of date. Re-display the current version "
                f"({settings.kvkk_disclosure_version}) and request consent again."
            ),
        )

    now = datetime.now(timezone.utc).isoformat()
    update_payload = {
        "kvkk_consent_at": now,
        "kvkk_consent_version": payload.disclosure_version,
        "last_active_at": now,
    }
    res = (
        client.table("profiles")
        .update(update_payload)
        .eq("id", user.id)
        .execute()
    )
    if not res.data:
        # Profile row missing (e.g. trigger not applied) — create it.
        insert_payload = {"id": user.id, **update_payload}
        if user.email:
            insert_payload.setdefault("full_name", user.email.split("@")[0])
        res = client.table("profiles").insert(insert_payload).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return Profile(**res.data[0])
