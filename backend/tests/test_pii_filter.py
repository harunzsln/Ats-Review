"""Unit tests for the PII filter (KVKK §4.2 and §4.4)."""
from __future__ import annotations

from app.services.pii_filter import (
    contains_third_party_pii,
    filter_for_ai,
    strip_third_party_pii,
)


def test_filter_drops_sensitive_keys():
    cv = {
        "summary": "Engineer",
        "tc_kimlik": "12345678901",
        "date_of_birth": "1990-01-01",
        "military_status": "completed",
        "skills": ["Python"],
    }
    cleaned = filter_for_ai(cv)

    assert "tc_kimlik" not in cleaned
    assert "date_of_birth" not in cleaned
    assert "military_status" not in cleaned
    assert cleaned["summary"] == "Engineer"
    assert cleaned["skills"] == ["Python"]


def test_filter_redacts_national_id_in_free_text():
    cv = {"summary": "TC: 12345678901, experienced developer"}
    cleaned = filter_for_ai(cv)
    assert "12345678901" not in cleaned["summary"]
    assert "[REDACTED]" in cleaned["summary"]


def test_filter_redacts_email_and_phone():
    cv = {"contact": "reach me at john@example.com or +90 532 123 45 67"}
    cleaned = filter_for_ai(cv)
    assert "john@example.com" not in cleaned["contact"]
    assert "532 123 45 67" not in cleaned["contact"]


def test_filter_does_not_mutate_input():
    cv = {"tc_kimlik": "12345678901", "summary": "x"}
    _ = filter_for_ai(cv)
    assert cv["tc_kimlik"] == "12345678901"  # original untouched


def test_filter_is_recursive_over_lists_and_dicts():
    cv = {
        "experience": [
            {"company": "Acme", "note": "ssn 12345678901"},
        ]
    }
    cleaned = filter_for_ai(cv)
    assert "12345678901" not in cleaned["experience"][0]["note"]


def test_strip_third_party_name_is_masked():
    template = "Hi Ayşe Yılmaz, I am interested in the role."
    safe = strip_third_party_pii(template, person_name="Ayşe Yılmaz")
    assert "Ayşe" not in safe
    assert "Yılmaz" not in safe
    assert "[name removed]" in safe


def test_strip_third_party_contact_info():
    template = "Contact me at recruiter@corp.com or linkedin.com/in/recruiter"
    safe = strip_third_party_pii(template)
    assert "recruiter@corp.com" not in safe
    assert "linkedin.com/in/recruiter" not in safe


def test_contains_third_party_pii_detection():
    assert contains_third_party_pii("email me at a@b.com") is True
    assert contains_third_party_pii("just a normal sentence") is False
