"""Pydantic request/response models."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class ApplicationStatus(str, Enum):
    to_review = "to_review"
    applied = "applied"
    interview_pending = "interview_pending"
    offer_received = "offer_received"
    rejected = "rejected"


# --------------------------------------------------------------------------- #
# Profiles / KVKK consent
# --------------------------------------------------------------------------- #
class ConsentRequest(BaseModel):
    """Explicit, opt-in KVKK consent (§4.1)."""

    consent_given: bool = Field(..., description="Must be true; opt-in only.")
    disclosure_version: str = Field(..., description="Version of the text approved.")


class Profile(BaseModel):
    id: str
    full_name: str | None = None
    kvkk_consent_at: datetime | None = None
    kvkk_consent_version: str | None = None
    last_active_at: datetime | None = None
    created_at: datetime | None = None


# --------------------------------------------------------------------------- #
# CV base
# --------------------------------------------------------------------------- #
class CvBaseCreate(BaseModel):
    original_filename: str
    storage_path: str
    parsed_content: dict[str, Any] = Field(default_factory=dict)


class CvBase(CvBaseCreate):
    id: str
    user_id: str
    created_at: datetime


# --------------------------------------------------------------------------- #
# Job postings
# --------------------------------------------------------------------------- #
class JobPostingCreate(BaseModel):
    raw_text: str
    source_url: str | None = None
    company_name: str | None = None
    position_title: str | None = None
    parsed_requirements: dict[str, Any] = Field(default_factory=dict)


class JobPostingUpdate(BaseModel):
    raw_text: str | None = None
    source_url: str | None = None
    company_name: str | None = None
    position_title: str | None = None
    parsed_requirements: dict[str, Any] | None = None


class JobPosting(JobPostingCreate):
    id: str
    user_id: str
    created_at: datetime


# --------------------------------------------------------------------------- #
# CV versions
# --------------------------------------------------------------------------- #
class CvVersionCreate(BaseModel):
    cv_base_id: str
    job_application_id: str | None = None
    version_label: str
    full_content: dict[str, Any]
    ats_score: float | None = None


class CvVersion(BaseModel):
    id: str
    user_id: str
    cv_base_id: str
    job_application_id: str | None = None
    version_label: str
    content_diff: dict[str, Any]
    full_content: dict[str, Any]
    ats_score: float | None = None
    created_at: datetime


# --------------------------------------------------------------------------- #
# Applications (Kanban)
# --------------------------------------------------------------------------- #
class ApplicationCreate(BaseModel):
    job_posting_id: str
    cv_version_id: str | None = None
    status: ApplicationStatus = ApplicationStatus.to_review
    notes: str | None = None


class ApplicationUpdate(BaseModel):
    cv_version_id: str | None = None
    status: ApplicationStatus | None = None
    notes: str | None = None


class Application(BaseModel):
    id: str
    user_id: str
    job_posting_id: str
    cv_version_id: str | None = None
    status: ApplicationStatus
    status_updated_at: datetime
    notes: str | None = None
    created_at: datetime


# --------------------------------------------------------------------------- #
# Interview simulations
# --------------------------------------------------------------------------- #
class InterviewSimulationCreate(BaseModel):
    application_id: str


class InterviewResponseSubmit(BaseModel):
    user_responses: list[dict[str, Any]]


class InterviewSimulation(BaseModel):
    id: str
    user_id: str
    application_id: str
    weak_points_identified: list[Any]
    simulated_questions: list[Any]
    user_responses: list[Any]
    created_at: datetime


# --------------------------------------------------------------------------- #
# Cold messages (KVKK §4.2)
# --------------------------------------------------------------------------- #
class ColdMessageGenerate(BaseModel):
    application_id: str
    target_role: str = Field(..., description="Role label only, e.g. 'HR Manager'.")
    # Transient only: used in the prompt, NEVER stored. Optional.
    target_person_name: str | None = Field(
        default=None,
        description="Used transiently in the AI prompt; stripped before any DB write.",
    )
    tone: str = "professional"


class ColdMessage(BaseModel):
    id: str
    user_id: str
    application_id: str
    target_role: str
    generated_template: str
    user_edited_before_sending: bool
    created_at: datetime


class ColdMessageResponse(BaseModel):
    """Generation response — includes a mandatory KVKK warning for the UI."""

    cold_message: ColdMessage
    warning: str


# --------------------------------------------------------------------------- #
# CV diff (§5)
# --------------------------------------------------------------------------- #
class CvDiffRequest(BaseModel):
    original: dict[str, Any]
    new_version: dict[str, Any]


# --------------------------------------------------------------------------- #
# ATS scoring (brief §4) — deterministic engine + AI explanation layer
# --------------------------------------------------------------------------- #
class AtsScoreRequest(BaseModel):
    job_posting_id: str
    cv_base_id: str | None = None
    cv_version_id: str | None = None
    force: bool = Field(
        default=False,
        description="Recompute even if an identical-fingerprint score exists.",
    )


class AtsScore(BaseModel):
    id: str
    user_id: str
    job_posting_id: str
    cv_base_id: str | None = None
    cv_version_id: str | None = None
    algorithm_version: str
    fingerprint: str
    overall_score: float
    band: dict[str, Any]
    sub_scores: list[dict[str, Any]]
    matched_keywords: list[Any]
    missing_keywords: list[Any]
    format_issues: list[Any]
    ai_explanations: dict[str, Any] | None = None
    suggestions: list[dict[str, Any]] | None = None
    created_at: datetime
