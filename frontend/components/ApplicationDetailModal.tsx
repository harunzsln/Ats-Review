"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/lib/toast";
import {
  STATUS_LABELS,
  STATUS_ORDER,
  type Application,
  type ApplicationStatus,
  type JobPosting,
} from "@/lib/types";
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  Modal,
  Select,
  Spinner,
  Textarea,
} from "@/components/ui";

const STATUS_TONE: Record<ApplicationStatus, "slate" | "blue" | "amber" | "emerald" | "red"> = {
  to_review: "slate",
  applied: "blue",
  interview_pending: "amber",
  offer_received: "emerald",
  rejected: "red",
};

export function ApplicationDetailModal({
  app,
  posting,
  onClose,
  onUpdated,
  onDeleted,
}: {
  app: Application;
  posting?: JobPosting;
  onClose: () => void;
  onUpdated: (updated: Application) => void;
  onDeleted: (id: string) => void;
}) {
  const { toast } = useToast();
  const [status, setStatus] = useState<ApplicationStatus>(app.status);
  const [notes, setNotes] = useState(app.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dirty = status !== app.status || (notes ?? "") !== (app.notes ?? "");

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const updated = await apiFetch<Application>(`/api/applications/${app.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, notes: notes.trim() || null }),
      });
      onUpdated(updated);
      toast("Başvuru güncellendi.", "success");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Güncelleme başarısız.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setDeleting(true);
    setError(null);
    try {
      await apiFetch(`/api/applications/${app.id}`, { method: "DELETE" });
      onDeleted(app.id);
      toast("Başvuru silindi.", "success");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silme başarısız.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={posting?.position_title ?? "Başvuru detayı"}
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              className="!text-red-600 hover:!bg-red-50"
            >
              Sil
            </Button>
            <div className="flex-1" />
            <Button variant="secondary" size="sm" onClick={onClose}>
              Kapat
            </Button>
            <Button size="sm" onClick={save} disabled={saving || !dirty}>
              {saving ? <Spinner /> : null}
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                {posting?.company_name ?? "Bilinmeyen şirket"}
              </p>
            </div>
            <Badge tone={STATUS_TONE[app.status]}>{STATUS_LABELS[app.status]}</Badge>
          </div>

          {posting?.source_url && (
            <a
              href={posting.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-sm text-brand underline"
            >
              İlan kaynağını aç ↗
            </a>
          )}

          {error && <Alert tone="error">{error}</Alert>}

          <Select
            label="Durum"
            value={status}
            onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>

          <Textarea
            label="Notlar"
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Bu başvuruyla ilgili notlarınız (mülakat tarihi, iletişim kişisi, hatırlatmalar...)"
          />

          <p className="text-xs text-slate-400">
            Son güncelleme:{" "}
            {new Date(app.status_updated_at).toLocaleString("tr-TR")}
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title="Başvuruyu sil"
        message="Bu başvuru kartı kalıcı olarak silinecek. Bu işlem geri alınamaz."
        confirmLabel={deleting ? "Siliniyor..." : "Sil"}
        busy={deleting}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
