"""PII filtering / masking layer (KVKK §4.2 and §4.4).

Two responsibilities:

1. ``filter_for_ai`` — strip *unnecessary* sensitive fields (Turkish national ID
   number "TC Kimlik No", date of birth, etc.) from CV content **before** it is
   sent to the Gemini API (a cross-border data processor). This is a regex-based
   pre-processing layer so it works even on free-text CV blobs.

2. ``strip_third_party_pii`` — for the cold-message feature, ensure no target
   person's name / email / LinkedIn is ever persisted. The name may be used
   transiently inside the AI prompt, but is masked out of anything we store.
"""
from __future__ import annotations

import re
from typing import Any

# --------------------------------------------------------------------------- #
# Regex patterns for sensitive fields to remove before AI calls (§4.4)
# --------------------------------------------------------------------------- #
_TC_KIMLIK_RE = re.compile(r"\b[1-9]\d{10}\b")  # 11-digit Turkish national ID
_EMAIL_RE = re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")
_PHONE_RE = re.compile(
    r"(?:(?:\+|00)90[\s-]?)?(?:0?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})"
)
_LINKEDIN_RE = re.compile(
    r"(?:https?://)?(?:[a-z]{2,3}\.)?linkedin\.com/\S+", re.IGNORECASE
)
_IBAN_RE = re.compile(r"\bTR\d{2}[\s]?(?:\d{4}[\s]?){5}\d{2}\b", re.IGNORECASE)
# DOB-ish dates: dd.mm.yyyy / dd/mm/yyyy / yyyy-mm-dd
_DOB_RE = re.compile(
    r"\b(?:\d{1,2}[./]\d{1,2}[./]\d{2,4}|\d{4}-\d{1,2}-\d{1,2})\b"
)

_REDACTION = "[REDACTED]"

# Field names commonly holding sensitive data that the AI doesn't need.
_SENSITIVE_KEYS = {
    "tc_kimlik",
    "tckn",
    "national_id",
    "identity_number",
    "date_of_birth",
    "dob",
    "birth_date",
    "birthdate",
    "military_status",
    "health_status",
    "marital_status",
    "iban",
    "blood_type",
}


def _scrub_text(text: str) -> str:
    text = _TC_KIMLIK_RE.sub(_REDACTION, text)
    text = _IBAN_RE.sub(_REDACTION, text)
    text = _EMAIL_RE.sub(_REDACTION, text)
    text = _PHONE_RE.sub(_REDACTION, text)
    text = _LINKEDIN_RE.sub(_REDACTION, text)
    text = _DOB_RE.sub(_REDACTION, text)
    return text


def filter_for_ai(content: Any) -> Any:
    """Recursively remove/redact sensitive fields before sending to the AI.

    - Drops keys in ``_SENSITIVE_KEYS`` entirely.
    - Redacts national IDs, IBANs, emails, phones, LinkedIn URLs and DOB-like
      dates from any string value.

    Returns a *new* structure; the input is not mutated.
    """
    if isinstance(content, dict):
        cleaned: dict[str, Any] = {}
        for key, value in content.items():
            if key.lower() in _SENSITIVE_KEYS:
                continue
            cleaned[key] = filter_for_ai(value)
        return cleaned
    if isinstance(content, list):
        return [filter_for_ai(item) for item in content]
    if isinstance(content, str):
        return _scrub_text(content)
    return content


def strip_third_party_pii(text: str, person_name: str | None = None) -> str:
    """Mask third-party PII so it is never written to the DB (§4.2).

    Removes a specific provided person name (if given) plus any emails, phone
    numbers and LinkedIn URLs that may have leaked into a generated template.
    """
    if person_name:
        # Mask the exact name and each of its whitespace-separated parts.
        parts = [person_name] + [p for p in person_name.split() if len(p) > 1]
        for part in sorted(parts, key=len, reverse=True):
            text = re.sub(re.escape(part), "[name removed]", text, flags=re.IGNORECASE)

    text = _EMAIL_RE.sub("[contact removed]", text)
    text = _PHONE_RE.sub("[contact removed]", text)
    text = _LINKEDIN_RE.sub("[contact removed]", text)
    return text


def contains_third_party_pii(text: str) -> bool:
    """True if obvious third-party contact PII is present (used as a guard)."""
    return bool(
        _EMAIL_RE.search(text)
        or _PHONE_RE.search(text)
        or _LINKEDIN_RE.search(text)
    )
