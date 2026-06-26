"""Gemini API integration (interview sim, cold messages, CV↔job matching).

KVKK §4.4: Gemini (Google) is a cross-border data processor. ALL CV content is
passed through ``pii_filter.filter_for_ai`` before reaching this module, so the
prompts here assume already-sanitized input. If no API key is configured the
service degrades to deterministic stub output so the app remains runnable in dev
and tests without network access.
"""
from __future__ import annotations

import json
from typing import Any

from ..config import get_settings


def _model():
    settings = get_settings()
    if not settings.gemini_api_key:
        return None
    import google.generativeai as genai  # imported lazily

    genai.configure(api_key=settings.gemini_api_key)
    return genai.GenerativeModel(settings.gemini_model)


def _generate(prompt: str) -> str:
    model = _model()
    if model is None:
        return ""
    response = model.generate_content(prompt)
    return (response.text or "").strip()


def generate_interview_questions(
    sanitized_cv: dict[str, Any],
    job_posting: dict[str, Any],
) -> dict[str, Any]:
    """Identify weak points and produce simulated interview questions."""
    prompt = f"""You are an interview coach. Based on the candidate CV and the job
posting below, return STRICT JSON with keys "weak_points" (array of strings) and
"questions" (array of objects with "question" and "focus_area").

CV (sensitive fields already removed):
{json.dumps(sanitized_cv, ensure_ascii=False)}

Job posting:
{json.dumps(job_posting, ensure_ascii=False)}
"""
    raw = _generate(prompt)
    parsed = _safe_json(raw)
    if parsed:
        return {
            "weak_points": parsed.get("weak_points", []),
            "questions": parsed.get("questions", []),
        }

    # Deterministic fallback (no API key / parse failure).
    return {
        "weak_points": [
            "Quantify impact in past roles (metrics, scale).",
            "Map experience to the posting's core requirements.",
        ],
        "questions": [
            {
                "question": "Walk me through a project most relevant to this role.",
                "focus_area": "relevance",
            },
            {
                "question": "Describe a time you handled a difficult trade-off.",
                "focus_area": "behavioral",
            },
        ],
    }


def generate_cold_message(
    *,
    target_role: str,
    company_name: str | None,
    position_title: str | None,
    sanitized_cv_summary: str,
    target_person_name: str | None,
    tone: str,
) -> str:
    """Generate a LinkedIn cold-message template.

    ``target_person_name`` is used TRANSIENTLY here only (to personalize the
    greeting in the draft shown to the user). The caller strips it before any DB
    write (KVKK §4.2).
    """
    greeting_hint = (
        f'Address the recipient as "{target_person_name}".'
        if target_person_name
        else f"Address the recipient generically by their role ({target_role})."
    )
    prompt = f"""Write a short, {tone} LinkedIn outreach message (max 120 words)
from a job seeker to a {target_role} at {company_name or 'the company'} regarding
the {position_title or 'open'} position. {greeting_hint}
Use this candidate summary for relevance: {sanitized_cv_summary}
Return ONLY the message text."""
    raw = _generate(prompt)
    if raw:
        return raw

    name = target_person_name or f"the {target_role}"
    return (
        f"Hi {name},\n\n"
        f"I came across the {position_title or 'open'} role at "
        f"{company_name or 'your company'} and was excited by the fit with my "
        f"background. {sanitized_cv_summary} I'd love to briefly connect to learn "
        f"more about the team. Thank you for your time!"
    )


def optimize_cv_for_posting(
    sanitized_cv: dict[str, Any],
    job_posting: dict[str, Any],
) -> dict[str, Any]:
    """Return an optimized CV plus per-line change reasons.

    Output shape: {"optimized_cv": {...}, "reasons": {"<new line>": "<why>"}}.
    """
    prompt = f"""You are an ATS optimization assistant. Rewrite the CV to better
match the job posting WITHOUT inventing experience. Return STRICT JSON with keys
"optimized_cv" (same structure as the input CV) and "reasons" (object mapping a
changed/added line's text to a short reason).

CV:
{json.dumps(sanitized_cv, ensure_ascii=False)}

Job posting:
{json.dumps(job_posting, ensure_ascii=False)}
"""
    raw = _generate(prompt)
    parsed = _safe_json(raw)
    if parsed and "optimized_cv" in parsed:
        return {
            "optimized_cv": parsed["optimized_cv"],
            "reasons": parsed.get("reasons", {}),
        }
    return {"optimized_cv": sanitized_cv, "reasons": {}}


def _safe_json(raw: str) -> dict[str, Any] | None:
    if not raw:
        return None
    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
    try:
        result = json.loads(text)
        return result if isinstance(result, dict) else None
    except (json.JSONDecodeError, ValueError):
        return None
