"""Job posting CRUD endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from ..auth import CurrentUser
from ..dependencies import require_consent
from ..models.schemas import JobPosting, JobPostingCreate, JobPostingUpdate
from ..services.ats import _tokens  # reuse tokenizer for naive requirement parsing
from ..supabase_client import get_user_client

router = APIRouter(prefix="/api/job-postings", tags=["job_postings"])


def _auto_parse_requirements(payload: JobPostingCreate) -> dict:
    if payload.parsed_requirements:
        return payload.parsed_requirements
    # naive keyword extraction so ATS scoring works out of the box
    return {"keywords": sorted(_tokens(payload.raw_text))[:50]}


@router.post("", response_model=JobPosting, status_code=201)
def create_job_posting(
    payload: JobPostingCreate,
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> JobPosting:
    record = payload.model_dump()
    record["user_id"] = user.id
    record["parsed_requirements"] = _auto_parse_requirements(payload)
    res = client.table("job_postings").insert(record).execute()
    return JobPosting(**res.data[0])


@router.get("", response_model=list[JobPosting])
def list_job_postings(
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> list[JobPosting]:
    res = (
        client.table("job_postings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .execute()
    )
    return [JobPosting(**row) for row in res.data]


@router.get("/{posting_id}", response_model=JobPosting)
def get_job_posting(
    posting_id: str,
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> JobPosting:
    res = client.table("job_postings").select("*").eq("id", posting_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Job posting not found")
    return JobPosting(**res.data[0])


@router.patch("/{posting_id}", response_model=JobPosting)
def update_job_posting(
    posting_id: str,
    payload: JobPostingUpdate,
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> JobPosting:
    update = payload.model_dump(exclude_none=True)
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = (
        client.table("job_postings").update(update).eq("id", posting_id).execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Job posting not found")
    return JobPosting(**res.data[0])


@router.delete("/{posting_id}", status_code=204, response_model=None)
def delete_job_posting(
    posting_id: str,
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> None:
    client.table("job_postings").delete().eq("id", posting_id).execute()
