"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useApplications } from "@/lib/useApplications";
import type { ColdMessage, ColdMessageResponse } from "@/lib/types";
import {
  Alert,
  Button,
  Card,
  CardBody,
  ConfirmDialog,
  EmptyState,
  Input,
  PageHeader,
  Select,
  Spinner,
} from "@/components/ui";

export default function ColdMessagesPageClient() {
  const { options, loading: appsLoading } = useApplications();
  const [applicationId, setApplicationId] = useState("");
  const [targetRole, setTargetRole] = useState("İK Yöneticisi");
  const [targetPerson, setTargetPerson] = useState("");
  const [tone, setTone] = useState("professional");

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<ColdMessageResponse | null>(null);
  const [history, setHistory] = useState<ColdMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ColdMessage | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    apiFetch<ColdMessage[]>("/api/cold-messages")
      .then(setHistory)
      .catch(() => setHistory([]));
  }, []);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!applicationId) {
      setError("Lütfen bir başvuru seçin.");
      return;
    }
    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiFetch<ColdMessageResponse>("/api/cold-messages", {
        method: "POST",
        body: JSON.stringify({
          application_id: applicationId,
          target_role: targetRole,
          target_person_name: targetPerson || null,
          tone,
        }),
      });
      setResult(res);
      setTargetPerson(""); // never keep the name around in the UI either
      const list = await apiFetch<ColdMessage[]>("/api/cold-messages");
      setHistory(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Üretim başarısız.");
    } finally {
      setGenerating(false);
    }
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await apiFetch(`/api/cold-messages/${pendingDelete.id}`, {
        method: "DELETE",
      });
      setHistory((prev) => prev.filter((m) => m.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silme başarısız.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Soğuk Mesaj Asistanı"
        subtitle="LinkedIn için kişiselleştirilmiş, KVKK uyumlu erişim mesajları üretin."
      />

      <Alert tone="warning">
        Bu şablonu LinkedIn üzerinden göndermeden önce lütfen gözden geçirin.
        Üçüncü taraflara ait bilgileri sistemimizde saklamıyoruz.
      </Alert>

      {error && <Alert tone="error">{error}</Alert>}

      <Card>
        <CardBody>
          <form onSubmit={handleGenerate} className="space-y-4">
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

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Hedef rol (yalnızca rol etiketi)"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="İK Yöneticisi, Teknik Lider..."
              />
              <Input
                label="Hedef kişi adı (opsiyonel, saklanmaz)"
                value={targetPerson}
                onChange={(e) => setTargetPerson(e.target.value)}
                placeholder="Sadece taslakta kullanılır"
              />
            </div>

            <p className="-mt-2 text-xs text-slate-500 dark:text-slate-400">
              Girdiğiniz kişi adı yalnızca taslağı kişiselleştirmek için anlık
              olarak kullanılır; veritabanına <strong>yazılmaz</strong> ve
              mesajdan otomatik temizlenir.
            </p>

            <Select
              label="Üslup"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
            >
              <option value="professional">Profesyonel</option>
              <option value="friendly">Samimi</option>
              <option value="concise">Kısa ve net</option>
            </Select>

            <Button type="submit" disabled={generating}>
              {generating ? <Spinner /> : null}
              {generating ? "Üretiliyor..." : "Mesaj Üret"}
            </Button>
          </form>
        </CardBody>
      </Card>

      {result && (
        <Card className="border-brand/30">
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                Üretilen Taslak
              </h2>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => copy(result.cold_message.generated_template)}
              >
                {copied ? "Kopyalandı ✓" : "Kopyala"}
              </Button>
            </div>
            <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm text-slate-800 dark:bg-slate-800/50 dark:text-slate-200">
              {result.cold_message.generated_template}
            </p>
            <Alert tone="info">{result.warning}</Alert>
          </CardBody>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Geçmiş
        </h2>
        {history.length === 0 ? (
          <EmptyState
            title="Henüz mesaj üretilmedi"
            description="Bir başvuru seçip ilk soğuk mesajınızı oluşturun."
          />
        ) : (
          history.map((m) => (
            <Card key={m.id}>
              <CardBody className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {m.target_role}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {new Date(m.created_at).toLocaleString("tr-TR")}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="!text-red-600 hover:!bg-red-50"
                      onClick={() => setPendingDelete(m)}
                    >
                      Sil
                    </Button>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">
                  {m.generated_template}
                </p>
              </CardBody>
            </Card>
          ))
        )}
      </section>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Mesajı sil"
        message="Bu soğuk mesaj kaydı kalıcı olarak silinecek."
        confirmLabel={deleting ? "Siliniyor..." : "Sil"}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
