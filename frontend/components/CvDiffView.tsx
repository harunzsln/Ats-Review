"use client";

import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";
import type { CompareResponse } from "@/lib/types";
import { cvToText } from "@/lib/cvText";

/**
 * Side-by-side CV diff view (spec §5.1):
 * - left  = original CV (or another version), right = this version
 * - added lines green, removed lines red (GitHub PR style)
 * - a "Why these changes?" panel lists each changed/added line with the AI's
 *   reason, satisfying the per-line reason/tooltip requirement.
 */
export function CvDiffView({ data }: { data: CompareResponse }) {
  const leftText = cvToText(data.left.content);
  const rightText = cvToText(data.right.content);

  const reasoned = [
    ...data.diff.added.map((l) => ({
      kind: "added" as const,
      line: l.line ?? "",
      reason: l.reason,
      field: l.field,
    })),
    ...data.diff.changed.map((l) => ({
      kind: "changed" as const,
      line: l.new_line ?? "",
      reason: l.reason,
      field: l.field,
    })),
  ].filter((r) => r.reason);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-400">
        <Stat label="Eklenen" value={data.diff.stats.added} className="text-emerald-600" />
        <Stat label="Çıkarılan" value={data.diff.stats.removed} className="text-red-600" />
        <Stat label="Değişen" value={data.diff.stats.changed} className="text-amber-600" />
        <Stat label="Aynı" value={data.diff.stats.unchanged} className="text-slate-500" />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
        <ReactDiffViewer
          oldValue={leftText}
          newValue={rightText}
          splitView
          compareMethod={DiffMethod.WORDS}
          leftTitle={data.left.label}
          rightTitle={data.right.label}
        />
      </div>

      {reasoned.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Bu değişiklikler neden yapıldı?
          </h3>
          <ul className="mt-3 space-y-2">
            {reasoned.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span
                  className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${
                    r.kind === "added" ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                  title={r.kind}
                />
                <span className="text-slate-700 dark:text-slate-300">
                  <span className="font-medium">{r.line}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {r.field} — {r.reason}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <span className="rounded-full bg-white px-3 py-1 shadow-sm dark:bg-slate-800">
      <span className={`font-semibold ${className ?? ""}`}>{value}</span> {label}
    </span>
  );
}
