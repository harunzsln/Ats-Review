"use client";

import type { ReactNode } from "react";
import {
  SCORE_BAND_META,
  type AtsSubScore,
  type AtsSuggestion,
} from "@/lib/types";

function bandFor(score: number): keyof typeof SCORE_BAND_META {
  if (score >= 85) return "strong";
  if (score >= 70) return "good";
  if (score >= 50) return "fair";
  return "needs_work";
}

/** Large radial gauge — the product's signature score visualization. */
export function ScoreGauge({
  score,
  bandKey,
  size = 200,
}: {
  score: number;
  bandKey?: string;
  size?: number;
}) {
  const key = (bandKey as keyof typeof SCORE_BAND_META) ?? bandFor(score);
  const meta = SCORE_BAND_META[key] ?? SCORE_BAND_META.needs_work;
  const radius = (size - 24) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference * (1 - clamped / 100);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`ATS skoru ${Math.round(score)} / 100 — ${meta.label}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={12}
          className="stroke-slate-200 dark:stroke-slate-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={12}
          strokeLinecap="round"
          stroke={meta.ring}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold text-slate-900 dark:text-slate-100">
          {Math.round(score)}
        </span>
        <span className="text-xs text-slate-400">/ 100</span>
        <span className={`mt-1 text-sm font-semibold ${meta.color}`}>
          {meta.icon} {meta.label}
        </span>
      </div>
    </div>
  );
}

/** One row per scoring category with a mini bar + explanation. */
export function SubScoreRow({
  sub,
  explanation,
}: {
  sub: AtsSubScore;
  explanation?: string;
}) {
  const key = bandFor(sub.score);
  const meta = SCORE_BAND_META[key];
  return (
    <div className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
          {sub.label}
        </span>
        <span className="flex items-center gap-2 text-xs text-slate-400">
          <span>%{Math.round(sub.weight * 100)} ağırlık</span>
          <span className={`font-semibold ${meta.color}`}>
            {Math.round(sub.score)}
          </span>
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.max(0, Math.min(100, sub.score))}%`, background: meta.ring }}
        />
      </div>
      {explanation && (
        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {explanation}
        </p>
      )}
    </div>
  );
}

/** Matched vs missing keyword lists — high-trust, high-clarity element. */
export function KeywordLists({
  matched,
  missing,
}: {
  matched: string[];
  missing: string[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          ✓ CV&apos;nizde bulunan ({matched.length})
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {matched.length === 0 ? (
            <span className="text-xs text-slate-400">Eşleşen anahtar kelime yok.</span>
          ) : (
            matched.map((k) => (
              <span
                key={k}
                className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                {k}
              </span>
            ))
          )}
        </div>
      </div>
      <div>
        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400">
          ✕ Eksik olanlar ({missing.length})
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {missing.length === 0 ? (
            <span className="text-xs text-slate-400">Tüm gereksinimler karşılanıyor.</span>
          ) : (
            missing.map((k) => (
              <span
                key={k}
                className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300"
              >
                {k}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/** Checklist of detected format/parseability issues. */
export function FormatIssues({ issues }: { issues: string[] }) {
  return (
    <ul className="space-y-2">
      {issues.map((issue, i) => {
        const ok =
          issue.includes("tespit edilmedi") || issue.includes("uygun");
        return (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className={ok ? "text-emerald-500" : "text-amber-500"}>
              {ok ? "✓" : "⚠"}
            </span>
            <span className="text-slate-600 dark:text-slate-400">{issue}</span>
          </li>
        );
      })}
    </ul>
  );
}

const IMPACT_META: Record<string, { label: string; cls: string }> = {
  high: {
    label: "Yüksek etki",
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  medium: {
    label: "Orta etki",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  low: {
    label: "Düşük etki",
    cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  },
};

/** A single prioritized, actionable suggestion card. */
export function SuggestionCard({
  suggestion,
  onAction,
}: {
  suggestion: AtsSuggestion;
  onAction?: (s: AtsSuggestion) => void;
}) {
  const impact = IMPACT_META[suggestion.impact] ?? IMPACT_META.low;
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {suggestion.title}
        </p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${impact.cls}`}>
          {impact.label}
          {suggestion.estimated_points > 0 && ` · +${Math.round(suggestion.estimated_points)} puan`}
        </span>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        {suggestion.detail}
      </p>
      {onAction && (
        <button
          onClick={() => onAction(suggestion)}
          className="mt-2 text-xs font-medium text-brand hover:underline"
        >
          Bu adımı uygula →
        </button>
      )}
    </div>
  );
}

/** Pro-locked overlay used to demonstrate the Free→Pro value gap. */
export function ProLock({
  title = "Pro özelliği",
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg">
      <div className="pointer-events-none select-none blur-sm" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/60 p-4 text-center backdrop-blur-[2px] dark:bg-slate-900/60">
        <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent-dark dark:text-accent">
          🔒 {title}
        </span>
        {description && (
          <p className="max-w-xs text-xs text-slate-600 dark:text-slate-400">
            {description}
          </p>
        )}
        <a
          href="/#pricing"
          className="mt-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark"
        >
          Pro&apos;ya yükselt
        </a>
      </div>
    </div>
  );
}
