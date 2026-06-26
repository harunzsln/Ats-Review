"""CV version diff service (spec §5.2).

We diff at the level of *structured CV fields* (summary, experience, skills, ...)
rather than raw text, because that produces a far more readable side-by-side UI.

A CV is represented as a JSON document, e.g.::

    {
      "summary": "Backend engineer ...",
      "skills": ["Python", "FastAPI", "PostgreSQL"],
      "experience": [
        {"title": "...", "company": "...", "bullets": ["...", "..."]}
      ],
      "education": [...]
    }

The output ``content_diff`` is a structured, line-level diff suitable for a
GitHub-style PR view, with an optional per-line "reason for change" that the AI
optimizer can attach to explain *why* a line was changed.
"""
from __future__ import annotations

import difflib
from typing import Any, Iterable


def _flatten(content: dict[str, Any]) -> list[tuple[str, str]]:
    """Flatten a structured CV into ``(field_path, line)`` pairs.

    The field path lets the UI group changes by section. Ordering is stable so
    the diff is deterministic.
    """
    lines: list[tuple[str, str]] = []

    def add(path: str, value: Any) -> None:
        if value is None:
            return
        if isinstance(value, str):
            text = value.strip()
            if text:
                lines.append((path, text))
        elif isinstance(value, (int, float, bool)):
            lines.append((path, str(value)))
        elif isinstance(value, list):
            for idx, item in enumerate(value):
                add(f"{path}[{idx}]", item)
        elif isinstance(value, dict):
            for key in value:
                add(f"{path}.{key}" if path else key, value[key])

    for key in content:
        add(key, content[key])
    return lines


def _lines_only(flat: Iterable[tuple[str, str]]) -> list[str]:
    return [line for _, line in flat]


def generate_cv_diff(
    original: dict[str, Any],
    new_version: dict[str, Any],
    reasons: dict[str, str] | None = None,
) -> dict[str, Any]:
    """Compute a structured, line-level diff between two CV versions.

    Args:
        original: the master/original CV content (structured JSON).
        new_version: the tailored CV content (structured JSON).
        reasons: optional mapping of ``new line text -> reason for change`` that
            the AI optimizer can supply (e.g. {"Led a team of 5": "posting
            required leadership experience"}).

    Returns:
        A dict with the shape::

            {
              "added":    [{"field": str, "line": str, "reason": str|None}, ...],
              "removed":  [{"field": str, "line": str}, ...],
              "changed":  [{"field": str, "old_line": str, "new_line": str,
                            "reason": str|None}, ...],
              "unchanged":[{"field": str, "line": str}, ...],
              "stats": {"added": int, "removed": int, "changed": int,
                        "unchanged": int}
            }
    """
    reasons = reasons or {}

    orig_flat = _flatten(original)
    new_flat = _flatten(new_version)

    orig_lines = _lines_only(orig_flat)
    new_lines = _lines_only(new_flat)

    matcher = difflib.SequenceMatcher(a=orig_lines, b=new_lines, autojunk=False)

    added: list[dict[str, Any]] = []
    removed: list[dict[str, Any]] = []
    changed: list[dict[str, Any]] = []
    unchanged: list[dict[str, Any]] = []

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            for offset in range(i2 - i1):
                field, line = orig_flat[i1 + offset]
                unchanged.append({"field": field, "line": line})
        elif tag == "delete":
            for k in range(i1, i2):
                field, line = orig_flat[k]
                removed.append({"field": field, "line": line})
        elif tag == "insert":
            for k in range(j1, j2):
                field, line = new_flat[k]
                added.append(
                    {"field": field, "line": line, "reason": reasons.get(line)}
                )
        elif tag == "replace":
            # Pair old/new lines positionally; surplus on either side becomes a
            # pure add or remove so nothing is lost.
            old_block = orig_flat[i1:i2]
            new_block = new_flat[j1:j2]
            pair_count = min(len(old_block), len(new_block))
            for idx in range(pair_count):
                old_field, old_line = old_block[idx]
                new_field, new_line = new_block[idx]
                changed.append(
                    {
                        "field": new_field,
                        "old_line": old_line,
                        "new_line": new_line,
                        "reason": reasons.get(new_line),
                    }
                )
            for old_field, old_line in old_block[pair_count:]:
                removed.append({"field": old_field, "line": old_line})
            for new_field, new_line in new_block[pair_count:]:
                added.append(
                    {
                        "field": new_field,
                        "line": new_line,
                        "reason": reasons.get(new_line),
                    }
                )

    return {
        "added": added,
        "removed": removed,
        "changed": changed,
        "unchanged": unchanged,
        "stats": {
            "added": len(added),
            "removed": len(removed),
            "changed": len(changed),
            "unchanged": len(unchanged),
        },
    }
