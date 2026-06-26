"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useApplications } from "@/lib/useApplications";
import type { InterviewSimulation } from "@/lib/types";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  Select,
  Spinner,
  Textarea,
} from "@/components/ui";

export default function InterviewsPageClient() {
  const { options, loading: appsLoading } = useApplications();
  const [applicationId, setApplicationId] = useState("");
  const [sim, setSim] = useState<InterviewSimulation | null>(null);
  const [history, setHistory] = useState<InterviewSimulation[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<InterviewSimulation | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    apiFetch<InterviewSimulation[]>("/api/interviews")
      .then(setHistory)
      .catch(() => setHistory([]));
  }, []);

  async function startSimulation() {
    if (!applicationId) {
      setError("Lütfen bir başvuru seçin.");
      return;
    }
    setStarting(true);
    setError(null);
    setSim(null);
    setAnswers({});
    setSaved(false);
    try {
      const res = await apiFetch<InterviewSimulation>("/api/interviews", {
        method: "POST",
        body: JSON.stringify({ application_id: applicationId }),
      });
      setSim(res);
      const list = await apiFetch<InterviewSimulation[]>("/api/interviews");
      setHistory(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simülasyon başlatılamadı.");
    } finally {
      setStarting(false);
    }
  }

  async function submitAnswers() {
    if (!sim) return;
    setSaving(true);
    setError(null);
    try {
      const userResponses = sim.simulated_questions.map((q, i) => ({
        question: q.question,
        answer: answers[i] ?? "",
      }));
      await apiFetch(`/api/interviews/${sim.id}/responses`, {
        method: "POST",
        body: JSON.stringify({ user_responses: userResponses }),
      });
      setSaved(true);
      const list = await apiFetch<InterviewSimulation[]>("/api/interviews");
      setHistory(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cevaplar kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await apiFetch(`/api/interviews/${pendingDelete.id}`, { method: "DELETE" });
      setHistory((prev) => prev.filter((s) => s.id !== pendingDelete.id));
      if (sim?.id === pendingDelete.id) setSim(null);
      setPendingDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silme başarısız.");
    } finally {
      setDeleting(false);
    }
  }

  const appLabel = (id: string) =>
    options.find((o) => o.application.id === id)?.label ?? "Başvuru";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mülakat Simülatörü"
        subtitle="İlana ve CV'nize göre üretilen sorularla prova yapın."
      />

      {error && <Alert tone="error">{error}</Alert>}

      <Card>
        <CardBody className="space-y-4">
          <Select
            label="Başvuru"
            value={applicationId}
            onChange={(e) => setApplicationId(e.target.value)}
          >
            <option value="">
              {appsLoading ? "Yükleniyor..." : "Başvuru seçin"}
            </option>
            {options.map((o) => (
              <option key={o.application.id} value={o.application.id}>
                {o.label}
              </option>
            ))}
          </Select>
          <Button onClick={startSimulation} disabled={starting}>
            {starting ? <Spinner /> : null}
            {starting ? "Hazırlanıyor..." : "Simülasyonu Başlat"}
          </Button>
        </CardBody>
      </Card>

      {sim && (
        <>
          {sim.weak_points_identified.length > 0 && (
            <Card className="border-amber-200">
              <CardBody>
                <h2 className="mb-2 font-semibold text-slate-900 dark:text-slate-100">
                  Tespit edilen zayıf noktalar
                </h2>
                <ul className="space-y-1">
                  {sim.weak_points_identified.map((w, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <span className="text-amber-500">•</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Sorular
            </h2>
            {sim.simulated_questions.map((q, i) => (
              <Card key={i}>
                <CardBody className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      {i + 1}. {q.question}
                    </p>
                    {q.focus_area && <Badge tone="blue">{q.focus_area}</Badge>}
                  </div>
                  <Textarea
                    rows={4}
                    placeholder="Cevabınızı buraya yazın..."
                    value={answers[i] ?? ""}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [i]: e.target.value }))
                    }
                  />
                </CardBody>
              </Card>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={submitAnswers} disabled={saving}>
              {saving ? <Spinner /> : null}
              {saving ? "Kaydediliyor..." : "Cevapları Kaydet"}
            </Button>
            {saved && <Alert tone="success">Cevaplarınız kaydedildi.</Alert>}
          </div>
        </>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Geçmiş Simülasyonlar
        </h2>
        {history.length === 0 ? (
          <EmptyState
            title="Henüz simülasyon yok"
            description="Yukarıdan bir başvuru seçip ilk mülakat provanızı başlatın."
          />
        ) : (
          history.map((item) => (
            <Card key={item.id}>
              <CardBody className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                      {appLabel(item.application_id)}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {new Date(item.created_at).toLocaleString("tr-TR")} ·{" "}
                      {item.simulated_questions.length} soru
                      {item.user_responses.length > 0 && " · cevaplandı"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setSim(item);
                        setAnswers(
                          Object.fromEntries(
                            item.user_responses.map((r, i) => [i, r.answer]),
                          ),
                        );
                        setSaved(item.user_responses.length > 0);
                      }}
                    >
                      Aç
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="!text-red-600 hover:!bg-red-50"
                      onClick={() => setPendingDelete(item)}
                    >
                      Sil
                    </Button>
                  </div>
                </div>
                {item.weak_points_identified.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.weak_points_identified.slice(0, 4).map((w, i) => (
                      <Badge key={i} tone="amber">
                        {w}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          ))
        )}
      </section>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Simülasyonu sil"
        message="Bu mülakat simülasyonu kalıcı olarak silinecek."
        confirmLabel={deleting ? "Siliniyor..." : "Sil"}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
