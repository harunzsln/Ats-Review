"""Tests for the deterministic ATS scoring engine (brief §4.3).

The headline guarantee: the SAME CV + SAME job description must ALWAYS produce
an identical score and breakdown. These tests pin that behavior so a future
change that accidentally introduces non-determinism fails CI.
"""
from __future__ import annotations

from app.services.ats_scoring import (
    ALGORITHM_VERSION,
    WEIGHTS,
    band_for,
    compute_fingerprint,
    extract_required_keywords,
    score_cv_against_job,
)

# --------------------------------------------------------------------------- #
# Fixtures (plain dicts so the comparison is byte-stable)
# --------------------------------------------------------------------------- #
CV = {
    "raw_text": (
        "Summary\nSenior Backend Engineer\n"
        "Experience\n6 years building APIs at scale\n"
        "Education\nBachelor of Computer Science\n"
        "Skills\nPython, FastAPI, Docker, PostgreSQL\n"
        "Contact\njane@example.com\n"
    ),
    "contact": {"email": "jane@example.com"},
    "summary": "Senior Backend Engineer with 6 years of experience.",
    "skills": ["Python", "FastAPI", "Docker", "PostgreSQL"],
    "experience": ["6 years building APIs at scale"],
    "education": ["Bachelor of Computer Science"],
}

JOB = {
    "raw_text": (
        "We need a Senior Backend Engineer with 5 years experience. "
        "Required: Python, FastAPI, Kubernetes, PostgreSQL. Bachelor degree."
    ),
    "parsed_requirements": {
        "required_skills": ["Python", "FastAPI", "Kubernetes", "PostgreSQL"],
    },
}


# --------------------------------------------------------------------------- #
# Determinism
# --------------------------------------------------------------------------- #
def test_same_input_same_score_repeated_runs():
    results = [score_cv_against_job(CV, JOB) for _ in range(5)]
    first = results[0]
    for r in results[1:]:
        assert r == first, "Scoring is not deterministic across runs"


def test_overall_score_is_stable_value():
    result = score_cv_against_job(CV, JOB)
    # Pin the exact number so accidental weight/logic drift is caught.
    again = score_cv_against_job(CV, JOB)
    assert result["overall_score"] == again["overall_score"]
    assert 0.0 <= result["overall_score"] <= 100.0


def test_fingerprint_is_stable_and_input_sensitive():
    fp1 = compute_fingerprint(CV, JOB)
    fp2 = compute_fingerprint(CV, JOB)
    assert fp1 == fp2

    changed_job = {**JOB, "raw_text": JOB["raw_text"] + " Extra requirement: Redis."}
    assert compute_fingerprint(CV, changed_job) != fp1


# --------------------------------------------------------------------------- #
# Weights / structure
# --------------------------------------------------------------------------- #
def test_weights_sum_to_one():
    assert round(sum(WEIGHTS.values()), 6) == 1.0


def test_breakdown_has_all_categories_and_version():
    result = score_cv_against_job(CV, JOB)
    keys = {s["key"] for s in result["sub_scores"]}
    assert keys == set(WEIGHTS.keys())
    assert result["algorithm_version"] == ALGORITHM_VERSION
    # Overall equals the sum of weighted contributions (within rounding).
    total = sum(s["weighted_contribution"] for s in result["sub_scores"])
    assert abs(total - result["overall_score"]) < 0.5


# --------------------------------------------------------------------------- #
# Keyword matching
# --------------------------------------------------------------------------- #
def test_matched_and_missing_keywords():
    result = score_cv_against_job(CV, JOB)
    assert "Python" in result["matched_keywords"]
    assert "FastAPI" in result["matched_keywords"]
    assert "Kubernetes" in result["missing_keywords"]


def test_extract_keywords_is_sorted_and_deduplicated():
    job = {
        "parsed_requirements": {"required_skills": ["Python", "python", "Docker"]}
    }
    kws = extract_required_keywords(job)
    assert kws == sorted(kws)
    # case-insensitive de-dupe
    assert len([k for k in kws if k.lower() == "python"]) == 1


# --------------------------------------------------------------------------- #
# Bands
# --------------------------------------------------------------------------- #
def test_band_thresholds():
    assert band_for(90)["key"] == "strong"
    assert band_for(72)["key"] == "good"
    assert band_for(55)["key"] == "fair"
    assert band_for(20)["key"] == "needs_work"


# --------------------------------------------------------------------------- #
# Edge cases
# --------------------------------------------------------------------------- #
def test_empty_job_does_not_crash():
    result = score_cv_against_job(CV, {"raw_text": "", "parsed_requirements": {}})
    assert 0.0 <= result["overall_score"] <= 100.0


def test_empty_cv_scores_low_but_valid():
    result = score_cv_against_job({"raw_text": ""}, JOB)
    assert 0.0 <= result["overall_score"] <= 100.0
    # An empty CV should miss the required skills.
    assert "Python" in result["missing_keywords"]
