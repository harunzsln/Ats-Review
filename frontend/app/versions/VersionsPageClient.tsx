"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { CompareResponse } from "@/lib/types";
import { CvDiffView } from "@/components/CvDiffView";
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  Spinner,
} from "@/components/ui";

interface CvVersion {
  id: string;
  version_label: string;
  ats_score: number | null;
  created_at: string;
}

export default function VersionsPageClient() {
  const [versions, setVersions] = useState<CvVersion[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [compare, setCompare] = useState<CompareResponse | null>(null);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CvVersion | null>(null);
  const [deleting, setDeleting] = useState(false);

  function load() {
    apiFetch<CvVersion[]>("/api/cv-versions")
      .then(setVersions)
      .catch((e) => setError(e instanceof Error ? e.message : "Versiyonlar yüklenemedi."));
  }

  useEffect(() => {
    load();
  }, []);

  async function openVersion(id: string) {
    setSelected(id);
    setCompare(null);
    setLoadingDiff(true);
    try {
      const data = await apiFetch<CompareResponse>(
        `/api/cv-versions/${id}/compare`,
      );
      setCompare(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Karşılaştırma yüklenemedi.");
    } finally {
      setLoadingDiff(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await apiFetch(`/api/cv-versions/${pendingDelete.id}`, { method: "DELETE" });
      if (selected === pendingDelete.id) {
        setSelected(null);
        setCompare(null);
      }
      setPendingDelete(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Silme başarısız.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="CV Versiyon Geçmişi"
        subtitle="İlana göre uyarlanmış her CV; orijinaliyle yan yana diff görünümü."
      />

      {error && <Alert tone="error">{error}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <aside className="space-y-2">
          {versions.length === 0 && (
            <EmptyState
              title="Henüz versiyon yok"
              description="İlanlar sayfasından bir CV'yi optimize ederek ilk versiyonu oluşturun."
            />
          )}
          {versions.map((v) => (
            <div
              key={v.id}
              className={`group rounded-lg border p-3 transition-colors ${
                selected === v.id
                  ? "border-brand bg-brand-50 dark:bg-brand-900/20"
                  : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  onClick={() => openVersion(v.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {v.version_label}
                  </p>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    {new Date(v.created_at).toLocaleDateString("tr-TR")}
                    {v.ats_score != null && (
                      <Badge tone="emerald">ATS {v.ats_score}</Badge>
                    )}
                  </p>
                </button>
                <button
                  onClick={() => setPendingDelete(v)}
                  className="shrink-0 rounded p-1 text-slate-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                  aria-label="Versiyonu sil"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </aside>

        <section>
          {loadingDiff && (
            <p className="flex items-center gap-2 text-sm text-slate-400">
              <Spinner /> Karşılaştırma yükleniyor…
            </p>
          )}
          {compare && <CvDiffView data={compare} />}
          {!selected && !loadingDiff && (
            <EmptyState
              title="Bir versiyon seçin"
              description="Sol taraftan bir versiyona tıklayarak diff görünümünü açın."
            />
          )}
        </section>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Versiyonu sil"
        message={
          <>
            <strong>{pendingDelete?.version_label}</strong> versiyonu kalıcı
            olarak silinecek. Bu işlem geri alınamaz.
          </>
        }
        confirmLabel={deleting ? "Siliniyor..." : "Sil"}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
