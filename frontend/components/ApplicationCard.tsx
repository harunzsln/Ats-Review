"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Application, JobPosting } from "@/lib/types";

export function ApplicationCard({
  app,
  posting,
  overlay = false,
}: {
  app: Application;
  posting?: JobPosting;
  overlay?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800 ${
        overlay ? "rotate-2 shadow-lg" : ""
      }`}
    >
      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
        {posting?.position_title ?? "İsimsiz pozisyon"}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {posting?.company_name ?? "Bilinmeyen şirket"}
      </p>
      {app.notes && (
        <p className="mt-2 line-clamp-2 text-xs text-slate-400 dark:text-slate-500">
          {app.notes}
        </p>
      )}
      <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Güncellendi {new Date(app.status_updated_at).toLocaleDateString("tr-TR")}
      </p>
    </div>
  );
}

export function DraggableCard({
  app,
  posting,
  onOpen,
}: {
  app: Application;
  posting?: JobPosting;
  onOpen?: (app: Application) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: app.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => {
        if (!isDragging) onOpen?.(app);
      }}
      className="cursor-grab touch-none active:cursor-grabbing"
    >
      <ApplicationCard app={app} posting={posting} />
    </div>
  );
}
