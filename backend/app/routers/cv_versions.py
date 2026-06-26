"""CV version history endpoints (§5).

Two ways to create a version:
* ``POST /api/cv-versions`` — store a client-provided full_content; the backend
  computes the structured diff against the originating cv_base.
* ``POST /api/cv-versions/optimize`` — run the AI optimizer against a job
  posting, then store the optimized content + diff + ATS score.

``GET /api/cv-versions/{id}/compare`` powers the side-by-side diff view, diffing
a version against either the original cv_base or another version.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from ..auth import CurrentUser
from ..dependencies import require_consent
from ..models.schemas import CvVersion, CvVersionCreate
from ..services import ats_scoring, gemini
from ..services.cv_diff import generate_cv_diff
from ..services.pii_filter import filter_for_ai
from ..supabase_client import get_user_client

router = APIRouter(prefix="/api/cv-versions", tags=["cv_versions"])


def _fetch_cv_base_content(client: Client, cv_base_id: str) -> dict:
    res = (
        client.table("cv_base")
        .select("parsed_content")
        .eq("id", cv_base_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="cv_base not found")
    return res.data[0]["parsed_content"] or {}


@router.post("", response_model=CvVersion, status_code=201)
def create_version(
    payload: CvVersionCreate,
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> CvVersion:
    original = _fetch_cv_base_content(client, payload.cv_base_id)
    diff = generate_cv_diff(original, payload.full_content)

    record = {
        "user_id": user.id,
        "cv_base_id": payload.cv_base_id,
        "job_application_id": payload.job_application_id,
        "version_label": payload.version_label,
        "content_diff": diff,
        "full_content": payload.full_content,
        "ats_score": payload.ats_score,
    }
    res = client.table("cv_versions").insert(record).execute()
    return CvVersion(**res.data[0])


@router.post("/optimize", response_model=CvVersion, status_code=201)
def optimize_version(
    cv_base_id: str,
    job_posting_id: str,
    version_label: str,
    job_application_id: str | None = None,
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> CvVersion:
    """AI-optimize the master CV for a posting, storing diff + ATS score (§5.1)."""
    original = _fetch_cv_base_content(client, cv_base_id)

    posting_res = (
        client.table("job_postings").select("*").eq("id", job_posting_id).execute()
    )
    if not posting_res.data:
        raise HTTPException(status_code=404, detail="Job posting not found")
    posting = posting_res.data[0]

    # KVKK §4.4: strip sensitive fields before the cross-border AI call.
    sanitized = filter_for_ai(original)
    result = gemini.optimize_cv_for_posting(sanitized, posting)
    optimized = result["optimized_cv"]
    reasons = result["reasons"]

    diff = generate_cv_diff(original, optimized, reasons=reasons)
    # Deterministic scoring engine (brief §4): the optimized CV scored against
    # the posting. Same input -> same number, every time.
    breakdown = ats_scoring.score_cv_against_job(optimized, posting)

    record = {
        "user_id": user.id,
        "cv_base_id": cv_base_id,
        "job_application_id": job_application_id,
        "version_label": version_label,
        "content_diff": diff,
        "full_content": optimized,
        "ats_score": breakdown["overall_score"],
    }
    res = client.table("cv_versions").insert(record).execute()
    return CvVersion(**res.data[0])


@router.get("", response_model=list[CvVersion])
def list_versions(
    cv_base_id: str | None = None,
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> list[CvVersion]:
    query = client.table("cv_versions").select("*").eq("user_id", user.id)
    if cv_base_id:
        query = query.eq("cv_base_id", cv_base_id)
    res = query.order("created_at", desc=True).execute()
    return [CvVersion(**row) for row in res.data]


@router.get("/{version_id}", response_model=CvVersion)
def get_version(
    version_id: str,
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> CvVersion:
    res = client.table("cv_versions").select("*").eq("id", version_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Version not found")
    return CvVersion(**res.data[0])


@router.get("/{version_id}/compare")
def compare_version(
    version_id: str,
    against_version_id: str | None = None,
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> dict:
    """Side-by-side diff data (§5.1).

    Compares this version against either the original cv_base (default) or
    another version (when ``against_version_id`` is supplied).
    """
    res = client.table("cv_versions").select("*").eq("id", version_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Version not found")
    version = res.data[0]

    if against_version_id:
        other = (
            client.table("cv_versions")
            .select("*")
            .eq("id", against_version_id)
            .execute()
        )
        if not other.data:
            raise HTTPException(status_code=404, detail="Comparison version not found")
        left_content = other.data[0]["full_content"]
        left_label = other.data[0]["version_label"]
    else:
        left_content = _fetch_cv_base_content(client, version["cv_base_id"])
        left_label = "Original CV"

    diff = generate_cv_diff(left_content, version["full_content"])
    return {
        "left": {"label": left_label, "content": left_content},
        "right": {"label": version["version_label"], "content": version["full_content"]},
        "diff": diff,
    }


@router.delete("/{version_id}", status_code=204, response_model=None)
def delete_version(
    version_id: str,
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> None:
    client.table("cv_versions").delete().eq("id", version_id).execute()
