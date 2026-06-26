"""Unit tests for the structured CV diff service (§5.2)."""
from __future__ import annotations

from app.services.cv_diff import generate_cv_diff


def test_identical_cvs_have_no_changes():
    cv = {
        "summary": "Backend engineer",
        "skills": ["Python", "FastAPI"],
    }
    diff = generate_cv_diff(cv, cv)
    assert diff["stats"]["added"] == 0
    assert diff["stats"]["removed"] == 0
    assert diff["stats"]["changed"] == 0
    assert diff["stats"]["unchanged"] == 3  # summary + 2 skills


def test_added_line_is_detected_with_reason():
    original = {"skills": ["Python"]}
    new = {"skills": ["Python", "Leadership"]}
    reasons = {"Leadership": "Posting required leadership experience"}

    diff = generate_cv_diff(original, new, reasons=reasons)

    assert diff["stats"]["added"] == 1
    added = diff["added"][0]
    assert added["line"] == "Leadership"
    assert added["field"].startswith("skills")
    assert added["reason"] == "Posting required leadership experience"


def test_removed_line_is_detected():
    original = {"skills": ["Python", "PHP"]}
    new = {"skills": ["Python"]}

    diff = generate_cv_diff(original, new)

    assert diff["stats"]["removed"] == 1
    assert diff["removed"][0]["line"] == "PHP"


def test_changed_line_is_paired_old_and_new():
    original = {"summary": "Software developer"}
    new = {"summary": "Senior software developer"}

    diff = generate_cv_diff(original, new)

    assert diff["stats"]["changed"] == 1
    change = diff["changed"][0]
    assert change["old_line"] == "Software developer"
    assert change["new_line"] == "Senior software developer"
    assert change["field"] == "summary"


def test_nested_experience_bullets_are_flattened_and_tracked():
    original = {
        "experience": [
            {"title": "Engineer", "bullets": ["Built APIs", "Wrote tests"]}
        ]
    }
    new = {
        "experience": [
            {
                "title": "Engineer",
                "bullets": ["Built scalable APIs", "Wrote tests", "Led a team of 5"],
            }
        ]
    }
    reasons = {"Led a team of 5": "Demonstrate leadership the posting asked for"}

    diff = generate_cv_diff(original, new, reasons=reasons)

    new_lines = [a["line"] for a in diff["added"]]
    changed_new = [c["new_line"] for c in diff["changed"]]

    assert "Led a team of 5" in new_lines or "Led a team of 5" in changed_new
    # "Built APIs" -> "Built scalable APIs" should show up as a change
    assert any(c["old_line"] == "Built APIs" for c in diff["changed"])
    # the reason should be attached to the leadership line wherever it landed
    reasoned = [
        item.get("reason")
        for item in diff["added"] + diff["changed"]
        if item.get("line") == "Led a team of 5"
        or item.get("new_line") == "Led a team of 5"
    ]
    assert "Demonstrate leadership the posting asked for" in reasoned


def test_empty_strings_are_ignored():
    original = {"summary": "  ", "skills": []}
    new = {"summary": "Now I have a summary", "skills": []}

    diff = generate_cv_diff(original, new)

    assert diff["stats"]["added"] == 1
    assert diff["added"][0]["line"] == "Now I have a summary"


def test_stats_are_internally_consistent():
    original = {"a": "one", "b": "two", "c": "three"}
    new = {"a": "one", "b": "TWO changed", "d": "four"}

    diff = generate_cv_diff(original, new)
    stats = diff["stats"]

    assert stats["added"] == len(diff["added"])
    assert stats["removed"] == len(diff["removed"])
    assert stats["changed"] == len(diff["changed"])
    assert stats["unchanged"] == len(diff["unchanged"])
