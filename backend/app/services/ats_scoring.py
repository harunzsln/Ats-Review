"""Deterministic ATS scoring engine — Layer 1 (no LLM).

This is the trust core of the product (brief §4). The SAME CV + SAME job
description MUST always produce the SAME score. Therefore every number here is
computed with explicit, versioned rules and fixed weights — no model calls, no
randomness, no time-dependence.

The output is a structured breakdown that:
  * the UI renders directly (overall gauge + per-category bars + keyword lists),
  * the AI explanation layer (Layer 2) consumes WITHOUT re-deciding any number,
  * is persisted with ``ALGORITHM_VERSION`` so historical scores stay reproducible.

Sub-scores and their FIXED weights (must sum to 1.0):
    keyword_match        0.35
    experience_match     0.25
    section_completeness  0.15
    format_parseability  0.15
    education_match      0.10
"""
from __future__ import annotations

import hashlib
import json
import re
from typing import Any

# --------------------------------------------------------------------------- #
# Versioned constants — bump ALGORITHM_VERSION whenever weights/logic change.
# --------------------------------------------------------------------------- #
ALGORITHM_VERSION = "1.0.0"

WEIGHTS: dict[str, float] = {
    "keyword_match": 0.35,
    "experience_match": 0.25,
    "section_completeness": 0.15,
    "format_parseability": 0.15,
    "education_match": 0.10,
}

CATEGORY_LABELS: dict[str, str] = {
    "keyword_match": "Anahtar Kelime Uyumu",
    "experience_match": "Deneyim Uyumu",
    "section_completeness": "Bölüm Bütünlüğü",
    "format_parseability": "Format ve Okunabilirlik",
    "education_match": "Eğitim Uyumu",
}

# Qualitative bands (paired with the number so we never show a bare digit).
SCORE_BANDS: list[tuple[int, str, str]] = [
    (85, "Güçlü", "strong"),
    (70, "İyi", "good"),
    (50, "Orta", "fair"),
    (0, "Geliştirilmeli", "needs_work"),
]

# --------------------------------------------------------------------------- #
# Tokenization (shared, deterministic)
# --------------------------------------------------------------------------- #
_TOKEN_RE = re.compile(r"[a-zA-ZçğıöşüÇĞİÖŞÜ][a-zA-Z0-9çğıöşüÇĞİÖŞÜ+#.\-]{1,}")

_STOPWORDS = {
    "and", "or", "the", "a", "an", "to", "of", "in", "for", "with", "on",
    "experience", "years", "year", "strong", "good", "ability", "knowledge",
    "skills", "skill", "work", "team", "ve", "ile", "için", "icin", "bir",
    "olan", "gibi", "veya", "the", "as", "is", "are", "be", "we", "you",
}

# Common hard-skill / tool vocabulary boosts deterministic keyword extraction
# weighting (these are weighted higher than generic words when present).
_HARD_SKILL_HINTS = {
    "python", "java", "javascript", "typescript", "react", "next.js", "node",
    "fastapi", "django", "flask", "sql", "postgresql", "mysql", "mongodb",
    "docker", "kubernetes", "aws", "azure", "gcp", "ci/cd", "git", "rest",
    "graphql", "redis", "kafka", "terraform", "linux", "c++", "c#", ".net",
    "go", "rust", "php", "ruby", "swift", "kotlin", "tensorflow", "pytorch",
    "pandas", "numpy", "spark", "hadoop", "tableau", "excel", "powerbi",
    "figma", "sap", "salesforce", "jira", "agile", "scrum",
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


# --------------------------------------------------------------------------- #
# Requirement extraction (deterministic)
# --------------------------------------------------------------------------- #
def extract_required_keywords(job: dict[str, Any]) -> list[str]:
    """Pull required skills/keywords from a job posting, deterministically.

    Supports several shapes of ``parsed_requirements`` and falls back to a
    stable tokenization of the raw text. Output is sorted + de-duplicated so the
    same posting always yields the same ordered keyword set.
    """
    requirements = job.get("parsed_requirements") or {}
    keywords: list[str] = []
    for key in ("required_skills", "keywords", "skills", "must_have", "tools"):
        value = requirements.get(key)
        if isinstance(value, list):
            keywords.extend(str(v).strip() for v in value if str(v).strip())
        elif isinstance(value, str) and value.strip():
            keywords.append(value.strip())

    if not keywords:
        raw = requirements.get("raw_text") or job.get("raw_text") or ""
        toks = _tokens(raw)
        # Prefer recognizable hard skills; otherwise fall back to top tokens.
        hard = sorted(t for t in toks if t in _HARD_SKILL_HINTS)
        keywords = hard if hard else sorted(toks)[:40]

    # De-duplicate case-insensitively while preserving a stable sorted order.
    seen: dict[str, str] = {}
    for kw in keywords:
        seen.setdefault(kw.lower(), kw)
    return [seen[k] for k in sorted(seen)]


def _keyword_weight(keyword: str) -> float:
    """Hard skills count double; generic keywords count once."""
    return 2.0 if keyword.lower() in _HARD_SKILL_HINTS else 1.0


# --------------------------------------------------------------------------- #
# Sub-scorers — each returns (score_0_100, detail_dict). All deterministic.
# --------------------------------------------------------------------------- #
def _score_keyword_match(
    cv_tokens: set[str], keywords: list[str]
) -> tuple[float, dict[str, Any]]:
    if not keywords:
        return 0.0, {"matched": [], "missing": [], "note": "İlandan gereksinim çıkarılamadı."}

    matched: list[str] = []
    missing: list[str] = []
    matched_weight = 0.0
    total_weight = 0.0
    for kw in keywords:
        w = _keyword_weight(kw)
        total_weight += w
        kw_tokens = _tokens(kw)
        if kw_tokens and kw_tokens.issubset(cv_tokens):
            matched.append(kw)
            matched_weight += w
        else:
            missing.append(kw)

    score = round(100.0 * matched_weight / total_weight, 2) if total_weight else 0.0
    return score, {
        "matched": matched,
        "missing": missing,
        "note": f"{len(matched)}/{len(keywords)} gerekli anahtar kelime bulundu.",
    }


_YEARS_RE = re.compile(r"(\d{1,2})\s*\+?\s*(?:years?|yıl|yil|sene)", re.IGNORECASE)
_SENIORITY = {
    "intern": 0, "stajyer": 0,
    "junior": 1, "jr": 1, "entry": 1,
    "mid": 2, "intermediate": 2,
    "senior": 3, "sr": 3,
    "lead": 4, "principal": 4, "staff": 4, "manager": 4, "müdür": 4, "mudur": 4,
}


def _detect_years(text: str) -> int | None:
    matches = [int(m) for m in _YEARS_RE.findall(text or "")]
    return max(matches) if matches else None


def _detect_seniority(text: str) -> int | None:
    toks = _tokens(text)
    levels = [_SENIORITY[t] for t in toks if t in _SENIORITY]
    return max(levels) if levels else None


def _score_experience_match(
    cv_text: str, job_text: str
) -> tuple[float, dict[str, Any]]:
    required_years = _detect_years(job_text)
    cv_years = _detect_years(cv_text)
    req_level = _detect_seniority(job_text)
    cv_level = _detect_seniority(cv_text)

    detail: dict[str, Any] = {
        "required_years": required_years,
        "cv_years": cv_years,
        "required_seniority": req_level,
        "cv_seniority": cv_level,
    }

    # Years component (0..1)
    if required_years is None:
        years_component = 0.7  # neutral-ish when posting doesn't specify
        detail["years_note"] = "İlanda belirli bir deneyim yılı belirtilmemiş."
    elif cv_years is None:
        years_component = 0.3
        detail["years_note"] = "CV'de net bir deneyim süresi tespit edilemedi."
    elif cv_years >= required_years:
        years_component = 1.0
        detail["years_note"] = f"{cv_years} yıl ≥ gereken {required_years} yıl."
    else:
        years_component = max(0.0, cv_years / required_years)
        detail["years_note"] = (
            f"{cv_years} yıl < gereken {required_years} yıl."
        )

    # Seniority component (0..1)
    if req_level is None or cv_level is None:
        level_component = 0.6
    elif cv_level >= req_level:
        level_component = 1.0
    else:
        level_component = max(0.0, 1.0 - 0.25 * (req_level - cv_level))

    score = round(100.0 * (0.6 * years_component + 0.4 * level_component), 2)
    return score, detail


_SECTION_CHECKS = {
    "contact": "İletişim bilgileri",
    "summary": "Özet / profil",
    "experience": "İş deneyimi",
    "education": "Eğitim",
    "skills": "Yetenekler",
}


def _section_present(cv_content: dict[str, Any], section: str) -> bool:
    value = cv_content.get(section)
    if isinstance(value, dict):
        return any(bool(v) for v in value.values())
    if isinstance(value, (list, str)):
        return bool(value)
    return bool(value)


def _score_section_completeness(
    cv_content: dict[str, Any]
) -> tuple[float, dict[str, Any]]:
    present: list[str] = []
    missing: list[str] = []
    for key, label in _SECTION_CHECKS.items():
        if _section_present(cv_content, key):
            present.append(label)
        else:
            missing.append(label)
    score = round(100.0 * len(present) / len(_SECTION_CHECKS), 2)
    return score, {"present": present, "missing": missing}


def _score_format_parseability(
    cv_content: dict[str, Any]
) -> tuple[float, dict[str, Any]]:
    """Heuristic parseability score from the extracted text (deterministic).

    We don't have the original PDF layout here, only pdfplumber's text output,
    so we detect *signals* of common ATS-breaking problems.
    """
    raw = cv_content.get("raw_text") or _cv_to_text(cv_content)
    issues: list[str] = []
    penalty = 0.0

    if not raw.strip():
        return 0.0, {"issues": ["CV metni çıkarılamadı (taranmış/görsel PDF olabilir)."]}

    lines = [ln for ln in raw.splitlines() if ln.strip()]

    # Missing standard section headers -> ATS parsers rely on them.
    lower = raw.lower()
    header_hits = sum(
        any(alias in lower for alias in aliases)
        for aliases in (
            ("experience", "deneyim"),
            ("education", "eğitim", "egitim"),
            ("skills", "yetenek", "beceri"),
        )
    )
    if header_hits < 3:
        issues.append("Standart bölüm başlıkları eksik olabilir (Deneyim/Eğitim/Yetenekler).")
        penalty += 0.20

    # Multi-column artifact: many very long lines (columns merged into one line).
    long_lines = sum(1 for ln in lines if len(ln) > 180)
    if lines and long_lines / len(lines) > 0.15:
        issues.append("Çok sütunlu düzen belirtisi (uzun birleşik satırlar) tespit edildi.")
        penalty += 0.20

    # Table-ish content: lines with many tab/multi-space columns.
    tableish = sum(1 for ln in lines if len(re.findall(r"\s{3,}|\t", ln)) >= 2)
    if lines and tableish / len(lines) > 0.20:
        issues.append("Tablo benzeri hizalama tespit edildi — birçok ATS tabloyu yanlış ayrıştırır.")
        penalty += 0.15

    # Excessive special/box-drawing characters from text boxes.
    weird = len(re.findall(r"[│┃┌┐└┘├┤▪◦●·]", raw))
    if weird > 5:
        issues.append("Metin kutusu / özel karakter belirtileri tespit edildi.")
        penalty += 0.10

    # No detectable contact email -> ATS contact parsing fails.
    if not re.search(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b", raw):
        issues.append("İletişim e-postası bulunamadı.")
        penalty += 0.10

    score = round(max(0.0, 1.0 - penalty) * 100.0, 2)
    if not issues:
        issues.append("Belirgin bir ayrıştırma sorunu tespit edilmedi.")
    return score, {"issues": issues}


_DEGREE_HINTS = {
    "bachelor", "master", "phd", "doctorate", "associate", "lisans",
    "yüksek lisans", "yuksek lisans", "doktora", "önlisans", "onlisans",
    "mba", "bsc", "msc", "be", "btech",
}


def _score_education_match(
    cv_text: str, job_text: str
) -> tuple[float, dict[str, Any]]:
    job_lower = (job_text or "").lower()
    cv_lower = (cv_text or "").lower()

    required = sorted({d for d in _DEGREE_HINTS if d in job_lower})
    if not required:
        # Posting doesn't require a specific degree; reward simply having education.
        has_edu = any(d in cv_lower for d in _DEGREE_HINTS)
        score = 100.0 if has_edu else 70.0
        return score, {
            "required": [],
            "present": has_edu,
            "note": "İlanda belirli bir derece şartı yok.",
        }

    present = sorted({d for d in required if d in cv_lower})
    score = round(100.0 * len(present) / len(required), 2)
    return score, {
        "required": required,
        "matched": present,
        "missing": [d for d in required if d not in present],
    }


# --------------------------------------------------------------------------- #
# Fingerprint + bands
# --------------------------------------------------------------------------- #
def compute_fingerprint(cv_content: dict[str, Any], job: dict[str, Any]) -> str:
    """Stable hash of (cv, job, algorithm version).

    Used to (a) reuse an existing score instead of recomputing, and (b) decide
    whether the UI's "Recalculate" action should be enabled at all.
    """
    payload = {
        "cv": cv_content,
        "job_text": job.get("raw_text", ""),
        "requirements": job.get("parsed_requirements", {}),
        "algo": ALGORITHM_VERSION,
    }
    blob = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()


def band_for(score: float) -> dict[str, str]:
    for threshold, label, key in SCORE_BANDS:
        if score >= threshold:
            return {"label": label, "key": key}
    return {"label": "Geliştirilmeli", "key": "needs_work"}


def band_from_key(key: str) -> dict[str, str]:
    """Resolve a stored band key back to {label, key} for API responses."""
    for _threshold, label, band_key in SCORE_BANDS:
        if band_key == key:
            return {"label": label, "key": band_key}
    return {"label": "Geliştirilmeli", "key": "needs_work"}


# --------------------------------------------------------------------------- #
# Public entrypoint
# --------------------------------------------------------------------------- #
def score_cv_against_job(
    cv_content: dict[str, Any], job: dict[str, Any]
) -> dict[str, Any]:
    """Compute the full deterministic ATS breakdown for a CV + job posting.

    Returns a JSON-serializable dict with the overall score, per-category
    sub-scores (each with weight, raw score, weighted contribution, and detail),
    matched/missing keywords, format issues, the qualitative band, the
    fingerprint, and the algorithm version.
    """
    cv_text = _cv_to_text(cv_content)
    job_text = " ".join(
        str(v)
        for v in (
            job.get("raw_text", ""),
            json.dumps(job.get("parsed_requirements", {}), ensure_ascii=False),
        )
    )
    keywords = extract_required_keywords(job)
    cv_tokens = _tokens(cv_text)

    kw_score, kw_detail = _score_keyword_match(cv_tokens, keywords)
    exp_score, exp_detail = _score_experience_match(cv_text, job_text)
    sec_score, sec_detail = _score_section_completeness(cv_content)
    fmt_score, fmt_detail = _score_format_parseability(cv_content)
    edu_score, edu_detail = _score_education_match(cv_text, job_text)

    raw_scores = {
        "keyword_match": kw_score,
        "experience_match": exp_score,
        "section_completeness": sec_score,
        "format_parseability": fmt_score,
        "education_match": edu_score,
    }
    details = {
        "keyword_match": kw_detail,
        "experience_match": exp_detail,
        "section_completeness": sec_detail,
        "format_parseability": fmt_detail,
        "education_match": edu_detail,
    }

    sub_scores: list[dict[str, Any]] = []
    overall = 0.0
    for key, weight in WEIGHTS.items():
        raw = raw_scores[key]
        contribution = round(raw * weight, 2)
        overall += contribution
        sub_scores.append(
            {
                "key": key,
                "label": CATEGORY_LABELS[key],
                "score": raw,
                "weight": weight,
                "weighted_contribution": contribution,
                "detail": details[key],
            }
        )

    overall = round(overall, 1)
    return {
        "algorithm_version": ALGORITHM_VERSION,
        "overall_score": overall,
        "band": band_for(overall),
        "sub_scores": sub_scores,
        "matched_keywords": kw_detail["matched"],
        "missing_keywords": kw_detail["missing"],
        "format_issues": fmt_detail["issues"],
        "fingerprint": compute_fingerprint(cv_content, job),
        "weights": WEIGHTS,
    }
