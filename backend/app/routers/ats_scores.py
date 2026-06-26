"""ATS scoring endpoints (brief §4).

Flow:
  POST /api/ats-scores         -> compute (or reuse) a deterministic score for a
                                  (CV, job posting) pair, then attach AI
                                  explanations/suggestions, persist, and return.
  GET  /api/ats-scores         -> list saved scores (optionally by job posting).
  GET  /api/ats-scores/{id}    -> fetch one saved score.
  DELETE /api/ats-scores/{id}  -> delete a saved score.

Determinism guarantee (brief §4.1–4.3): the numeric score comes ONLY from
``ats_scoring`` (Layer 1). When a score with the same fingerprint already exists
we return it instead of recomputing, so identical input never produces a
different number — and the UI's "Recalculate" is a no-op unless the CV/job text
actually changed (``force=True`` bypasses reuse for an explicit recompute).
"""
from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from ..auth import CurrentUser
from ..dependencies import require_consent
from ..models.schemas import AtsScore, AtsScoreRequest
from ..services import ats_explainer, ats_scoring
from ..supabase_client import get_user_client

router = APIRouter(prefix="/api/ats-scores", tags=["ats_scores"])


def _normalize_band(band: Any) -> dict[str, str]:
    """DB stores band as text (key or legacy JSON); API always returns {label, key}."""
    if isinstance(band, dict):
        return band
    if isinstance(band, str):
        try:
            parsed = json.loads(band)
            if isinstance(parsed, dict) and "key" in parsed:
                return parsed
        except json.JSONDecodeError:
            pass
        return ats_scoring.band_from_key(band)
    raise ValueError(f"Invalid band value: {band!r}")


def _normalize_score_row(row: dict[str, Any]) -> dict[str, Any]:
    out = dict(row)
    out["band"] = _normalize_band(out.get("band"))
    return out


def _to_score(row: dict[str, Any]) -> AtsScore:
    return AtsScore(**_normalize_score_row(row))


def _resolve_cv_content(
    client: Client, payload: AtsScoreRequest
) -> dict:
    if payload.cv_version_id:
        res = (
            client.table("cv_versions")
            .select("full_content")
            .eq("id", payload.cv_version_id)
            .execute()
        )
        if not res.data:
            raise HTTPException(status_code=404, detail="CV version not found")
        return res.data[0]["full_content"] or {}
    if payload.cv_base_id:
        res = (
            client.table("cv_base")
            .select("parsed_content")
            .eq("id", payload.cv_base_id)
            .execute()
        )
        if not res.data:
            raise HTTPException(status_code=404, detail="cv_base not found")
        return res.data[0]["parsed_content"] or {}
    raise HTTPException(
        status_code=400, detail="Provide cv_base_id or cv_version_id."
    )


@router.post("", response_model=AtsScore, status_code=201)
def compute_score(
    payload: AtsScoreRequest,
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> AtsScore:
    posting_res = (
        client.table("job_postings")
        .select("*")
        .eq("id", payload.job_posting_id)
        .execute()
    )
    if not posting_res.data:
        raise HTTPException(status_code=404, detail="Job posting not found")
    posting = posting_res.data[0]

    cv_content = _resolve_cv_content(client, payload)

    # Layer 1: deterministic breakdown (no LLM).
    breakdown = ats_scoring.score_cv_against_job(cv_content, posting)
    fingerprint = breakdown["fingerprint"]

    # Reuse an identical-fingerprint score unless the caller forces a recompute.
    if not payload.force:
        existing = (
            client.table("ats_scores")
            .select("*")
            .eq("user_id", user.id)
            .eq("fingerprint", fingerprint)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if existing.data:
            return _to_score(existing.data[0])

    # Layer 2: AI explanations + prioritized suggestions (never alters numbers).
    enriched = ats_explainer.explain_breakdown(breakdown)

    record = {
        "user_id": user.id,
        "job_posting_id": payload.job_posting_id,
        "cv_base_id": payload.cv_base_id,
        "cv_version_id": payload.cv_version_id,
        "algorithm_version": breakdown["algorithm_version"],
        "fingerprint": fingerprint,
        "overall_score": breakdown["overall_score"],
        "band": breakdown["band"]["key"],
        "sub_scores": breakdown["sub_scores"],
        "matched_keywords": breakdown["matched_keywords"],
        "missing_keywords": breakdown["missing_keywords"],
        "format_issues": breakdown["format_issues"],
        "ai_explanations": enriched["explanations"],
        "suggestions": enriched["suggestions"],
    }
    res = client.table("ats_scores").insert(record).execute()
    return _to_score(res.data[0])


@router.get("", response_model=list[AtsScore])
def list_scores(
    job_posting_id: str | None = None,
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> list[AtsScore]:
    query = client.table("ats_scores").select("*").eq("user_id", user.id)
    if job_posting_id:
        query = query.eq("job_posting_id", job_posting_id)
    res = query.order("created_at", desc=True).execute()
    return [_to_score(row) for row in res.data]


@router.get("/{score_id}", response_model=AtsScore)
def get_score(
    score_id: str,
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> AtsScore:
    res = client.table("ats_scores").select("*").eq("id", score_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Score not found")
    return _to_score(res.data[0])


@router.delete("/{score_id}", status_code=204, response_model=None)
def delete_score(
    score_id: str,
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> None:
    client.table("ats_scores").delete().eq("id", score_id).execute()
