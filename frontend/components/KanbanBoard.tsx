"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { apiFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/lib/toast";
import {
  STATUS_LABELS,
  STATUS_ORDER,
  type Application,
  type ApplicationStatus,
  type JobPosting,
} from "@/lib/types";
import { KanbanColumn } from "./KanbanColumn";
import { ApplicationCard } from "./ApplicationCard";
import { ApplicationDetailModal } from "./ApplicationDetailModal";
import { Alert } from "@/components/ui";

export function KanbanBoard() {
  const { toast } = useToast();
  const [apps, setApps] = useState<Application[]>([]);
  const [postings, setPostings] = useState<Record<string, JobPosting>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    void load();
  }, []);

  // Realtime sync (spec §6.4): reflect changes from other sessions/devices.
  useEffect(() => {
    const channel = supabase
      .channel("applications-board")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "applications" },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  async function load() {
    try {
      const [appList, postingList] = await Promise.all([
        apiFetch<Application[]>("/api/applications"),
        apiFetch<JobPosting[]>("/api/job-postings"),
      ]);
      setApps(appList);
      setPostings(Object.fromEntries(postingList.map((p) => [p.id, p])));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pano yüklenemedi.");
    }
  }

  const grouped = useMemo(() => {
    const map: Record<ApplicationStatus, Application[]> = {
      to_review: [],
      applied: [],
      interview_pending: [],
      offer_received: [],
      rejected: [],
    };
    for (const app of apps) map[app.status].push(app);
    return map;
  }, [apps]);

  const activeApp = apps.find((a) => a.id === activeId) ?? null;
  const selectedApp = apps.find((a) => a.id === selectedId) ?? null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const appId = String(active.id);
    const newStatus = over.id as ApplicationStatus;
    const current = apps.find((a) => a.id === appId);
    if (!current || current.status === newStatus) return;

    // Optimistic update.
    const previous = apps;
    setApps((prev) =>
      prev.map((a) =>
        a.id === appId
          ? { ...a, status: newStatus, status_updated_at: new Date().toISOString() }
          : a,
      ),
    );

    try {
      await apiFetch(`/api/applications/${appId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      toast(`Durum güncellendi: ${STATUS_LABELS[newStatus]}`, "success");
    } catch (err) {
      setApps(previous); // rollback
      setError(err instanceof Error ? err.message : "Güncelleme başarısız.");
    }
  }

  return (
    <div className="space-y-4">
      {error && <Alert tone="error">{error}</Alert>}
      <p className="text-xs text-slate-400 md:hidden">
        Sütunlar arasında kaydırmak için yatay kaydırın.
      </p>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory md:grid md:grid-cols-3 md:overflow-visible md:pb-0 xl:grid-cols-5">
          {STATUS_ORDER.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              title={STATUS_LABELS[status]}
              apps={grouped[status]}
              postings={postings}
              onOpen={(a) => setSelectedId(a.id)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeApp ? (
            <ApplicationCard app={activeApp} posting={postings[activeApp.job_posting_id]} overlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      {selectedApp && (
        <ApplicationDetailModal
          app={selectedApp}
          posting={postings[selectedApp.job_posting_id]}
          onClose={() => setSelectedId(null)}
          onUpdated={(updated) =>
            setApps((prev) =>
              prev.map((a) => (a.id === updated.id ? updated : a)),
            )
          }
          onDeleted={(id) =>
            setApps((prev) => prev.filter((a) => a.id !== id))
          }
        />
      )}
    </div>
  );
}
