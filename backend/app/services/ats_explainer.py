"""ATS scoring — Layer 2: AI explanation & suggestions (brief §4.2, §4.5).

CRITICAL CONTRACT: this layer NEVER computes or overrides the numeric score. It
receives the deterministic breakdown produced by ``ats_scoring`` (Layer 1) and
only adds:
  * a short natural-language explanation per sub-score, and
  * prioritized, specific, actionable improvement suggestions tied to a
    sub-score with an estimated impact.

If no Gemini key is configured (or the call/parse fails), it degrades to
deterministic templated text so the feature still works fully offline — only the
prose quality drops, never the numbers.

KVKK §4.4: the breakdown passed in is derived from already-PII-scrubbed CV
content; we additionally never forward raw CV text here, only the computed
breakdown (keywords, scores, issues).
"""
from __future__ import annotations

import json
from typing import Any

from . import gemini

# Rough per-category headroom → impact estimate. Deterministic so the fallback
# and the UI ordering are stable.
_IMPACT_BANDS = [(15, "high"), (7, "medium"), (0, "low")]


def _impact_for(points: float) -> str:
    for threshold, label in _IMPACT_BANDS:
        if points >= threshold:
            return label
    return "low"


def _potential_points(sub: dict[str, Any]) -> float:
    """Max points this category could still gain (weight * remaining %)."""
    remaining = max(0.0, 100.0 - float(sub["score"]))
    return round(remaining * float(sub["weight"]), 1)


# --------------------------------------------------------------------------- #
# Deterministic fallback suggestions (templated, still specific)
# --------------------------------------------------------------------------- #
def _fallback_suggestions(breakdown: dict[str, Any]) -> list[dict[str, Any]]:
    suggestions: list[dict[str, Any]] = []
    by_key = {s["key"]: s for s in breakdown["sub_scores"]}

    missing = breakdown.get("missing_keywords", [])
    if missing:
        kw = by_key.get("keyword_match", {})
        pts = _potential_points(kw) if kw else 0.0
        shown = ", ".join(missing[:6])
        suggestions.append(
            {
                "category": "keyword_match",
                "title": "Eksik anahtar kelimeleri ekleyin",
                "detail": (
                    f"İlanda geçen ancak CV'nizde bulunmayan şu beceriler eklenmeli: "
                    f"{shown}. Yalnızca gerçekten sahip olduğunuz becerileri ekleyin."
                ),
                "impact": _impact_for(pts),
                "estimated_points": pts,
                "action": "rewrite_skills",
            }
        )

    exp = by_key.get("experience_match")
    if exp and exp["score"] < 80:
        pts = _potential_points(exp)
        suggestions.append(
            {
                "category": "experience_match",
                "title": "Deneyimi ilana göre çerçeveleyin",
                "detail": (
                    "Deneyim maddelerinizi ölçülebilir sonuçlarla (metrik, ölçek) "
                    "yazın ve ilanın gerektirdiği kıdem/yıl ile hizalayın."
                ),
                "impact": _impact_for(pts),
                "estimated_points": pts,
                "action": "skill_gap_plan",
            }
        )

    fmt = by_key.get("format_parseability")
    if fmt and fmt["score"] < 90:
        pts = _potential_points(fmt)
        issues = fmt.get("detail", {}).get("issues", [])
        suggestions.append(
            {
                "category": "format_parseability",
                "title": "Format/okunabilirlik sorunlarını giderin",
                "detail": "; ".join(issues[:3])
                or "Tek sütun, standart başlıklar ve düz metin kullanın.",
                "impact": _impact_for(pts),
                "estimated_points": pts,
                "action": "fix_format",
            }
        )

    sec = by_key.get("section_completeness")
    if sec and sec["score"] < 100:
        pts = _potential_points(sec)
        missing_sections = sec.get("detail", {}).get("missing", [])
        suggestions.append(
            {
                "category": "section_completeness",
                "title": "Eksik bölümleri tamamlayın",
                "detail": (
                    f"Şu bölümler eksik: {', '.join(missing_sections)}."
                    if missing_sections
                    else "Tüm standart bölümler mevcut."
                ),
                "impact": _impact_for(pts),
                "estimated_points": pts,
                "action": "rewrite_sections",
            }
        )

    edu = by_key.get("education_match")
    if edu and edu["score"] < 100:
        pts = _potential_points(edu)
        suggestions.append(
            {
                "category": "education_match",
                "title": "Eğitim/sertifika uyumunu artırın",
                "detail": (
                    "İlanın istediği derece/sertifikaları, sahipseniz, eğitim "
                    "bölümünde açıkça belirtin."
                ),
                "impact": _impact_for(pts),
                "estimated_points": pts,
                "action": "skill_gap_plan",
            }
        )

    # Prioritize highest estimated impact first (stable, deterministic).
    suggestions.sort(key=lambda s: s["estimated_points"], reverse=True)
    return suggestions


def _fallback_explanations(breakdown: dict[str, Any]) -> dict[str, str]:
    out: dict[str, str] = {}
    for sub in breakdown["sub_scores"]:
        detail = sub.get("detail", {})
        if sub["key"] == "keyword_match":
            out[sub["key"]] = detail.get("note", "")
        elif sub["key"] == "experience_match":
            out[sub["key"]] = detail.get("years_note", "Deneyim uyumu değerlendirildi.")
        elif sub["key"] == "format_parseability":
            issues = detail.get("issues", [])
            out[sub["key"]] = issues[0] if issues else "Format uygun görünüyor."
        elif sub["key"] == "section_completeness":
            missing = detail.get("missing", [])
            out[sub["key"]] = (
                f"Eksik bölümler: {', '.join(missing)}." if missing else "Tüm bölümler mevcut."
            )
        elif sub["key"] == "education_match":
            out[sub["key"]] = detail.get("note", "Eğitim uyumu değerlendirildi.")
    return out


# --------------------------------------------------------------------------- #
# Public entrypoint
# --------------------------------------------------------------------------- #
def explain_breakdown(breakdown: dict[str, Any]) -> dict[str, Any]:
    """Return {"explanations": {...}, "suggestions": [...]} for a breakdown.

    Uses Gemini for natural prose when available; otherwise deterministic
    templated text. The numeric score is taken as-is from ``breakdown`` and is
    never modified here.
    """
    # Always compute deterministic fallbacks first (and as ordering source of truth).
    fallback_expl = _fallback_explanations(breakdown)
    fallback_sugg = _fallback_suggestions(breakdown)

    model = gemini._model()  # type: ignore[attr-defined]
    if model is None:
        return {"explanations": fallback_expl, "suggestions": fallback_sugg, "ai": False}

    # Pass ONLY the numeric breakdown (no raw CV text) to the model.
    compact = {
        "overall_score": breakdown["overall_score"],
        "sub_scores": [
            {
                "key": s["key"],
                "label": s["label"],
                "score": s["score"],
                "detail": s.get("detail", {}),
            }
            for s in breakdown["sub_scores"]
        ],
        "matched_keywords": breakdown.get("matched_keywords", []),
        "missing_keywords": breakdown.get("missing_keywords", []),
    }
    prompt = f"""Sen bir ATS (özgeçmiş tarama) uzmanısın. Aşağıda DETERMINISTIK bir
motorla HESAPLANMIŞ skor dökümü var. Skoru ASLA değiştirme veya yeniden hesaplama;
yalnızca açıkla ve iyileştirme önerileri üret.

STRICT JSON döndür:
{{
  "explanations": {{ "<sub_score_key>": "tek cümlelik Türkçe açıklama" }},
  "suggestions": [
    {{
      "category": "<sub_score_key>",
      "title": "kısa başlık",
      "detail": "spesifik, eyleme dönük öneri (genel değil)",
      "impact": "high|medium|low"
    }}
  ]
}}

Öneriler spesifik olmalı (örn. 'Kubernetes ve CI/CD ekleyin' gibi, 'daha fazla
anahtar kelime ekle' gibi DEĞİL) ve en yüksek etkili olan önce gelmeli.

Skor dökümü:
{json.dumps(compact, ensure_ascii=False)}
"""
    raw = gemini._generate(prompt)  # type: ignore[attr-defined]
    parsed = gemini._safe_json(raw)  # type: ignore[attr-defined]
    if not parsed:
        return {"explanations": fallback_expl, "suggestions": fallback_sugg, "ai": False}

    explanations = parsed.get("explanations") or fallback_expl
    ai_suggestions = parsed.get("suggestions")

    # Merge: keep our deterministic impact/points ordering as the backbone, but
    # let AI enrich titles/details. If AI gave nothing usable, fall back.
    if isinstance(ai_suggestions, list) and ai_suggestions:
        by_cat = {s["category"]: s for s in fallback_sugg}
        merged: list[dict[str, Any]] = []
        for s in ai_suggestions:
            cat = s.get("category", "")
            base = by_cat.get(cat, {})
            merged.append(
                {
                    "category": cat,
                    "title": s.get("title") or base.get("title", "Öneri"),
                    "detail": s.get("detail") or base.get("detail", ""),
                    "impact": s.get("impact") or base.get("impact", "low"),
                    "estimated_points": base.get("estimated_points", 0.0),
                    "action": base.get("action", "rewrite_skills"),
                }
            )
        merged.sort(key=lambda x: x.get("estimated_points", 0.0), reverse=True)
        suggestions = merged
    else:
        suggestions = fallback_sugg

    return {"explanations": explanations, "suggestions": suggestions, "ai": True}
