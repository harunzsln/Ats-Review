"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { Application, CvBase, CvVersion, JobPosting } from "@/lib/types";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  ConfirmDialog,
  EmptyState,
  Input,
  LinkButton,
  PageHeader,
  Select,
  Spinner,
  Textarea,
} from "@/components/ui";

export default function JobsPageClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [cvs, setCvs] = useState<CvBase[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [rawText, setRawText] = useState("");

  const load = useCallback(async () => {
    try {
      const [list, cvList] = await Promise.all([
        apiFetch<JobPosting[]>("/api/job-postings"),
        apiFetch<CvBase[]>("/api/cv-base"),
      ]);
      setPostings(list);
      setCvs(cvList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Veriler yüklenemedi.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rawText.trim()) {
      setError("İlan metni zorunludur.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const posting = await apiFetch<JobPosting>("/api/job-postings", {
        method: "POST",
        body: JSON.stringify({
          raw_text: rawText,
          company_name: company || null,
          position_title: position || null,
          source_url: sourceUrl || null,
        }),
      });
      await apiFetch<Application>("/api/applications", {
        method: "POST",
        body: JSON.stringify({ job_posting_id: posting.id, status: "to_review" }),
      });
      setSuccess("İlan eklendi ve Kanban'a kart oluşturuldu.");
      toast("İlan eklendi ve Kanban kartı oluşturuldu.", "success");
      setCompany("");
      setPosition("");
      setSourceUrl("");
      setRawText("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İlan eklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="İş İlanları"
        subtitle="İlan ekleyin, CV'nizi ilana göre optimize edin ve Kanban'da takip edin."
        action={
          <LinkButton href="/board" variant="secondary" size="sm">
            Kanban&apos;a git →
          </LinkButton>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Şirket"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
              <Input
                label="Pozisyon"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
            </div>
            <Input
              label="Kaynak URL (opsiyonel)"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://linkedin.com/jobs/..."
            />
            <Textarea
              label="İlan metni *"
              rows={9}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="İş tanımını buraya yapıştırın..."
            />
            <Button type="submit" disabled={loading}>
              {loading ? <Spinner /> : null}
              {loading ? "Kaydediliyor..." : "İlan Ekle + Kanban Kartı Oluştur"}
            </Button>
          </form>
        </CardBody>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Kayıtlı İlanlar
        </h2>
        {postings.length === 0 ? (
          <EmptyState
            title="Henüz ilan yok"
            description="Yukarıdaki formu kullanarak ilk ilanınızı ekleyin."
          />
        ) : (
          postings.map((p) => (
            <JobRow
              key={p.id}
              posting={p}
              cvs={cvs}
              onOptimized={() => router.push("/versions")}
              onDeleted={() => void load()}
            />
          ))
        )}
      </section>
    </div>
  );
}

function JobRow({
  posting,
  cvs,
  onOptimized,
  onDeleted,
}: {
  posting: JobPosting;
  cvs: CvBase[];
  onOptimized: () => void;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [cvId, setCvId] = useState("");
  const [label, setLabel] = useState(
    `${posting.position_title ?? "Pozisyon"} için CV`,
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    setDeleting(true);
    setErr(null);
    try {
      await apiFetch(`/api/job-postings/${posting.id}`, { method: "DELETE" });
      setConfirmDelete(false);
      onDeleted();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "İlan silinemedi.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const keywords = Array.isArray(posting.parsed_requirements?.keywords)
    ? (posting.parsed_requirements!.keywords as string[])
    : [];

  async function optimize() {
    if (!cvId) {
      setErr("Lütfen bir CV seçin.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const params = new URLSearchParams({
        cv_base_id: cvId,
        job_posting_id: posting.id,
        version_label: label,
      });
      const version = await apiFetch<CvVersion>(
        `/api/cv-versions/optimize?${params.toString()}`,
        { method: "POST" },
      );
      setScore(version.ats_score);
      setTimeout(onOptimized, 900);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Optimizasyon başarısız.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-slate-900 dark:text-slate-100">
              {posting.position_title ?? "İsimsiz pozisyon"}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {posting.company_name ?? "Bilinmeyen şirket"}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <LinkButton href={`/jobs/${posting.id}/score`} size="sm" variant="primary">
              ATS Skoru
            </LinkButton>
            <Button size="sm" variant="secondary" onClick={() => setOpen(!open)}>
              {open ? "Kapat" : "CV Optimize Et"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="!text-red-600 hover:!bg-red-50"
              onClick={() => setConfirmDelete(true)}
            >
              Sil
            </Button>
          </div>
        </div>

        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {keywords.slice(0, 12).map((k) => (
              <Badge key={k} tone="slate">
                {k}
              </Badge>
            ))}
          </div>
        )}

        {open && (
          <div className="space-y-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
            {cvs.length === 0 ? (
              <Alert tone="warning">
                Önce bir CV yüklemelisiniz.{" "}
                <a href="/cv" className="underline">
                  CV yükle
                </a>
              </Alert>
            ) : (
              <>
                <Select
                  label="Optimize edilecek CV"
                  value={cvId}
                  onChange={(e) => setCvId(e.target.value)}
                >
                  <option value="">CV seçin</option>
                  {cvs.map((cv) => (
                    <option key={cv.id} value={cv.id}>
                      {cv.original_filename}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Versiyon etiketi"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
                {err && <Alert tone="error">{err}</Alert>}
                {score != null && (
                  <Alert tone="success">
                    Versiyon oluşturuldu — ATS skoru: {score}. Yönlendiriliyor...
                  </Alert>
                )}
                <Button onClick={optimize} disabled={busy}>
                  {busy ? <Spinner /> : null}
                  {busy ? "Optimize ediliyor..." : "Optimize Et ve Versiyon Oluştur"}
                </Button>
              </>
            )}
          </div>
        )}
      </CardBody>

      <ConfirmDialog
        open={confirmDelete}
        title="İlanı sil"
        message={
          <>
            <strong>{posting.position_title ?? "Bu ilan"}</strong> ve buna bağlı
            başvuru kartı kalıcı olarak silinecek. Bu işlem geri alınamaz.
          </>
        }
        confirmLabel={deleting ? "Siliniyor..." : "Sil"}
        busy={deleting}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </Card>
  );
}
