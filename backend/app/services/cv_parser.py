"""CV PDF -> structured JSON parser (MVP §6.2).

A lightweight, dependency-light parser: extract text with pdfplumber, then split
it into the structured sections the rest of the app expects (summary, skills,
experience, education, contact). This is the "ATS parser output" stored in
``cv_base.parsed_content``.

The heuristic is intentionally simple and offline; the AI optimizer later works
on this structured form. PII is NOT stripped here (the master CV legitimately
holds the user's own data); stripping happens only before AI calls.
"""
from __future__ import annotations

import io
import re
from typing import Any

_SECTION_HEADERS = {
    "summary": ["summary", "profile", "objective", "özet", "hakkımda"],
    "skills": ["skills", "technical skills", "yetenekler", "beceriler"],
    "experience": ["experience", "work experience", "deneyim", "iş deneyimi"],
    "education": ["education", "eğitim"],
}


def _detect_section(line: str) -> str | None:
    normalized = line.strip().lower().rstrip(":")
    for section, aliases in _SECTION_HEADERS.items():
        if normalized in aliases:
            return section
    return None


def parse_cv_pdf(data: bytes) -> dict[str, Any]:
    """Extract structured content from a CV PDF byte stream."""
    try:
        import pdfplumber
    except ImportError:  # pragma: no cover - dependency guard
        return {"raw_text": "", "sections": {}, "error": "pdfplumber not installed"}

    text_parts: list[str] = []
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for page in pdf.pages:
            text_parts.append(page.extract_text() or "")
    return parse_cv_text("\n".join(text_parts))


def parse_cv_text(raw_text: str) -> dict[str, Any]:
    """Structure already-extracted CV text (also handy for tests)."""
    sections: dict[str, list[str]] = {}
    current: str | None = None

    for line in raw_text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        detected = _detect_section(stripped)
        if detected:
            current = detected
            sections.setdefault(current, [])
            continue
        if current:
            sections[current].append(stripped)

    email = _first(re.findall(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b", raw_text))

    skills_list: list[str] = []
    for line in sections.get("skills", []):
        skills_list.extend(s.strip() for s in re.split(r"[,;|·•]", line) if s.strip())

    return {
        "raw_text": raw_text,
        "contact": {"email": email},
        "summary": " ".join(sections.get("summary", [])),
        "skills": skills_list,
        "experience": sections.get("experience", []),
        "education": sections.get("education", []),
    }


def _first(items: list[str]) -> str | None:
    return items[0] if items else None
