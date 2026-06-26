"""Basic ATS (Applicant Tracking System) scoring (MVP §6.3).

A transparent, keyword-overlap heuristic that scores how well a CV matches a job
posting's parsed requirements. This is intentionally explainable (no black box):
the score is the weighted coverage of required keywords found in the CV, and we
return the matched / missing keywords so the UI can show actionable gaps.
"""
from __future__ import annotations

import re
from typing import Any

_TOKEN_RE = re.compile(r"[a-zA-Z][a-zA-Z0-9+#.\-]{1,}")

_STOPWORDS = {
    "and", "or", "the", "a", "an", "to", "of", "in", "for", "with", "on",
    "experience", "years", "year", "strong", "good", "ability", "knowledge",
    "skills", "skill", "work", "team", "ve", "ile", "icin",
}


def _tokens(text: str) -> set[str]:
    return {
        t.lower()
        for t in _TOKEN_RE.findall(text or "")
        if t.lower() not in _STOPWORDS and len(t) > 1
    }


def _cv_to_text(cv_content: dict[str, Any]) -> str:
    parts: list[str] = []

    def walk(value: Any) -> None:
        if isinstance(value, str):
            parts.append(value)
        elif isinstance(value, dict):
            for v in value.values():
                walk(v)
        elif isinstance(value, list):
            for v in value:
                walk(v)

    walk(cv_content)
    return " ".join(parts)


def _required_keywords(parsed_requirements: dict[str, Any]) -> list[str]:
    """Pull keywords from parsed requirements, supporting a few shapes."""
    keywords: list[str] = []
    for key in ("keywords", "required_skills", "skills", "must_have"):
        value = parsed_requirements.get(key)
        if isinstance(value, list):
            keywords.extend(str(v) for v in value)
        elif isinstance(value, str):
            keywords.append(value)
    if not keywords and "raw_text" in parsed_requirements:
        keywords = list(_tokens(parsed_requirements["raw_text"]))
    return keywords


def compute_ats_score(
    cv_content: dict[str, Any],
    parsed_requirements: dict[str, Any],
) -> dict[str, Any]:
    """Return a 0–100 score plus matched/missing keyword breakdown."""
    cv_tokens = _tokens(_cv_to_text(cv_content))
    keywords = _required_keywords(parsed_requirements)

    if not keywords:
        return {
            "score": 0.0,
            "matched": [],
            "missing": [],
            "note": "No requirements parsed from the job posting.",
        }

    matched: list[str] = []
    missing: list[str] = []
    for kw in keywords:
        kw_tokens = _tokens(kw)
        if kw_tokens and kw_tokens.issubset(cv_tokens):
            matched.append(kw)
        else:
            missing.append(kw)

    score = round(100.0 * len(matched) / len(keywords), 2)
    return {
        "score": score,
        "matched": matched,
        "missing": missing,
        "note": f"{len(matched)}/{len(keywords)} required keywords found.",
    }
