"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, apiUpload } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { CvBase } from "@/lib/types";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  Spinner,
} from "@/components/ui";

export default function CvPageClient() {
  const { toast } = useToast();
  const [cvs, setCvs] = useState<CvBase[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CvBase | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      setCvs(await apiFetch<CvBase[]>("/api/cv-base"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "CV listesi yüklenemedi.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function uploadFile(file: File) {
    if (file.type !== "application/pdf") {
      setError("Yalnızca PDF dosyaları kabul edilir.");
      return;
    }
    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const created = await apiUpload<CvBase>("/api/cv-base", form);
      setSuccess(`"${created.original_filename}" yüklendi ve parse edildi.`);
      toast(`"${created.original_filename}" yüklendi.`, "success");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yükleme başarısız.");
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void uploadFile(file);
  }

  async function download(cv: CvBase) {
    setDownloadingId(cv.id);
    setError(null);
    try {
      const { signed_url } = await apiFetch<{ signed_url: string }>(
        `/api/cv-base/${cv.id}/download-url`,
      );
      window.open(signed_url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "İndirme bağlantısı alınamadı.");
    } finally {
      setDownloadingId(null);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await apiFetch(`/api/cv-base/${pendingDelete.id}`, { method: "DELETE" });
      setSuccess(`"${pendingDelete.original_filename}" silindi.`);
      toast("CV silindi.", "success");
      setPendingDelete(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silme başarısız.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="CV Yönetimi"
        subtitle="Master CV'nizi PDF olarak yükleyin; sistem yapılandırılmış JSON'a parse eder."
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          dragging
            ? "border-brand bg-brand-50 dark:bg-brand-900/20"
            : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900"
        }`}
      >
        <div className="text-3xl">📄</div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          PDF dosyanızı buraya sürükleyin veya seçin
        </p>
        <label className="mt-4 inline-block cursor-pointer rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark">
          {uploading ? "Yükleniyor..." : "Dosya Seç"}
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadFile(file);
            }}
          />
        </label>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Yüklenen CV&apos;ler
        </h2>
        {cvs.length === 0 ? (
          <EmptyState
            title="Henüz CV yüklenmedi"
            description="İlk CV'nizi yükleyerek optimizasyon ve ATS skorlamasını açın."
          />
        ) : (
          cvs.map((cv) => {
            const summary =
              typeof cv.parsed_content?.summary === "string"
                ? cv.parsed_content.summary
                : "";
            const skills = Array.isArray(cv.parsed_content?.skills)
              ? (cv.parsed_content.skills as string[])
              : [];
            return (
              <Card key={cv.id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {cv.original_filename}
                      </p>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {new Date(cv.created_at).toLocaleString("tr-TR")}
                      </span>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void download(cv)}
                        disabled={downloadingId === cv.id}
                      >
                        {downloadingId === cv.id ? <Spinner /> : null}
                        İndir
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="!text-red-600 hover:!bg-red-50"
                        onClick={() => setPendingDelete(cv)}
                      >
                        Sil
                      </Button>
                    </div>
                  </div>
                  {summary && (
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                      {summary}
                    </p>
                  )}
                  {skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {skills.slice(0, 10).map((s) => (
                        <Badge key={s} tone="blue">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })
        )}
      </section>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="CV'yi sil"
        message={
          <>
            <strong>{pendingDelete?.original_filename}</strong> ve buna bağlı
            dosya kalıcı olarak silinecek. Bu işlem geri alınamaz.
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
