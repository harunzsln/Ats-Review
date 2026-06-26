"""Shared FastAPI dependencies."""
from __future__ import annotations

from fastapi import Depends, HTTPException, status
from supabase import Client

from .auth import CurrentUser, get_current_user
from .supabase_client import get_user_client


def require_consent(
    user: CurrentUser = Depends(get_current_user),
    client: Client = Depends(get_user_client),
) -> CurrentUser:
    """Gate data-processing endpoints on a valid KVKK consent (§4.1).

    Any endpoint that stores or processes personal data depends on this, so a
    user who has not consented cannot upload CVs, generate messages, etc.
    """
    res = (
        client.table("profiles")
        .select("kvkk_consent_at")
        .eq("id", user.id)
        .single()
        .execute()
    )
    if not res.data or not res.data.get("kvkk_consent_at"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="KVKK consent required before processing personal data.",
        )
    return user
