"""Cold message endpoints (KVKK §4.2 — third-party PII is NEVER persisted).

Flow:
1. The user may supply ``target_person_name`` to personalize the draft.
2. That name is used ONLY transiently inside the AI prompt.
3. Before writing to the DB, the generated template is run through
   ``strip_third_party_pii`` and we persist ONLY ``target_role`` (a label) plus
   the sanitized template. The ``cold_messages`` table has no column for a name,
   email, or LinkedIn — so persistence of third-party PII is structurally
   impossible.
4. The response carries the mandatory UI warning.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from ..auth import CurrentUser
from ..dependencies import require_consent
from ..models.schemas import (
    ColdMessage,
    ColdMessageGenerate,
    ColdMessageResponse,
)
from ..services import gemini
from ..services.pii_filter import filter_for_ai, strip_third_party_pii
from ..supabase_client import get_user_client

router = APIRouter(prefix="/api/cold-messages", tags=["cold_messages"])

KVKK_WARNING = (
    "Please review this template before sending it via LinkedIn. "
    "We do not store information about third parties in our system."
)


@router.post("", response_model=ColdMessageResponse, status_code=201)
def generate(
    payload: ColdMessageGenerate,
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> ColdMessageResponse:
    app_res = (
        client.table("applications")
        .select("*, job_postings(company_name, position_title)")
        .eq("id", payload.application_id)
        .execute()
    )
    if not app_res.data:
        raise HTTPException(status_code=404, detail="Application not found")
    application = app_res.data[0]
    posting = application.get("job_postings") or {}

    cv_summary = _best_effort_cv_summary(client, user.id)

    # Generate using the name TRANSIENTLY (prompt only).
    raw_template = gemini.generate_cold_message(
        target_role=payload.target_role,
        company_name=posting.get("company_name"),
        position_title=posting.get("position_title"),
        sanitized_cv_summary=cv_summary,
        target_person_name=payload.target_person_name,
        tone=payload.tone,
    )

    # KVKK §4.2: strip the name + any leaked contact info BEFORE persisting.
    safe_template = strip_third_party_pii(
        raw_template, person_name=payload.target_person_name
    )

    record = {
        "user_id": user.id,
        "application_id": payload.application_id,
        "target_role": payload.target_role,  # role label only
        "generated_template": safe_template,
        "user_edited_before_sending": False,
    }
    res = client.table("cold_messages").insert(record).execute()
    return ColdMessageResponse(
        cold_message=ColdMessage(**res.data[0]), warning=KVKK_WARNING
    )


@router.get("", response_model=list[ColdMessage])
def list_cold_messages(
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> list[ColdMessage]:
    res = (
        client.table("cold_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .execute()
    )
    return [ColdMessage(**row) for row in res.data]


@router.patch("/{message_id}", response_model=ColdMessage)
def update_cold_message(
    message_id: str,
    generated_template: str,
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> ColdMessage:
    """User edits before sending. We re-strip third-party PII defensively and
    flag ``user_edited_before_sending``.
    """
    safe_template = strip_third_party_pii(generated_template)
    res = (
        client.table("cold_messages")
        .update(
            {
                "generated_template": safe_template,
                "user_edited_before_sending": True,
            }
        )
        .eq("id", message_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Cold message not found")
    return ColdMessage(**res.data[0])


@router.delete("/{message_id}", status_code=204, response_model=None)
def delete_cold_message(
    message_id: str,
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> None:
    client.table("cold_messages").delete().eq("id", message_id).execute()


def _best_effort_cv_summary(client: Client, user_id: str) -> str:
    """Pull a sanitized one-line summary from the user's latest CV, if any."""
    res = (
        client.table("cv_base")
        .select("parsed_content")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not res.data:
        return ""
    sanitized = filter_for_ai(res.data[0].get("parsed_content") or {})
    summary = sanitized.get("summary") if isinstance(sanitized, dict) else ""
    return summary or ""
