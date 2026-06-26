"""ATS Review FastAPI application entrypoint."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .models.schemas import CvDiffRequest
from .routers import (
    account,
    applications,
    ats_scores,
    cold_messages,
    cv_base,
    cv_versions,
    interview,
    job_postings,
    profiles,
)
from .services.cv_diff import generate_cv_diff

settings = get_settings()

app = FastAPI(
    title="ATS Review API",
    version="0.1.0",
    description=(
        "AI-powered application tracking & career platform. "
        "KVKK-compliant: RLS-scoped data access, no third-party PII persistence, "
        "hard-delete erasure, and PII filtering before cross-border AI calls."
    ),
)

# Allow the configured origin plus common local dev ports (Next.js falls back to
# 3001/3002 when 3000 is taken), so a port shift never breaks CORS in dev.
_allowed_origins = list(
    {
        settings.frontend_origin,
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
    }
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profiles.router)
app.include_router(cv_base.router)
app.include_router(job_postings.router)
app.include_router(applications.router)
app.include_router(cv_versions.router)
app.include_router(cold_messages.router)
app.include_router(interview.router)
app.include_router(account.router)
app.include_router(ats_scores.router)


@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/kvkk/disclosure-version", tags=["meta"])
def disclosure_version() -> dict[str, str]:
    """Current KVKK disclosure text version, so the client can re-prompt on change."""
    return {"version": settings.kvkk_disclosure_version}


@app.post("/api/cv-diff", tags=["cv_versions"])
def cv_diff(payload: CvDiffRequest) -> dict:
    """Stateless structured CV diff (§5.2) — exposes ``generate_cv_diff``."""
    return generate_cv_diff(payload.original, payload.new_version)
