"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Application, ApplicationStatus, JobPosting } from "@/lib/types";
import { DraggableCard } from "./ApplicationCard";

const COLUMN_ACCENT: Record<ApplicationStatus, string> = {
  to_review: "border-t-slate-400",
  applied: "border-t-blue-500",
  interview_pending: "border-t-amber-500",
  offer_received: "border-t-emerald-500",
  rejected: "border-t-red-500",
};

export function KanbanColumn({
  status,
  title,
  apps,
  postings,
  onOpen,
}: {
  status: ApplicationStatus;
  title: string;
  apps: Application[];
  postings: Record<string, JobPosting>;
  onOpen?: (app: Application) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[24rem] w-[17rem] shrink-0 snap-start flex-col rounded-xl border-t-4 bg-slate-100 p-3 transition-colors dark:bg-slate-900 md:w-auto md:shrink ${
        COLUMN_ACCENT[status]
      } ${isOver ? "bg-slate-200 ring-2 ring-brand/40 dark:bg-slate-800" : ""}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {title}
        </h3>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {apps.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {apps.map((app) => (
          <DraggableCard
            key={app.id}
            app={app}
            posting={postings[app.job_posting_id]}
            onOpen={onOpen}
          />
        ))}
        {apps.length === 0 && (
          <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
            Başvuru yok
          </p>
        )}
      </div>
    </div>
  );
}
