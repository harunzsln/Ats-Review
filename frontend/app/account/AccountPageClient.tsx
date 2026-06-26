"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiDownload, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Profile } from "@/lib/types";
import {
  Alert,
  Button,
  Card,
  CardBody,
  PageHeader,
  Spinner,
} from "@/components/ui";

export default function AccountPageClient() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Profile>("/api/profile")
      .then(setProfile)
      .catch(() => setProfile(null));
  }, []);

  async function handleExport() {
    setExporting(true);
    setError(null);
    setInfo(null);
    try {
      await apiDownload(
        "/api/account/export",
        `ats-review-export-${user?.id ?? "data"}.json`,
      );
      setInfo("Verileriniz indirildi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dışa aktarma başarısız.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await apiFetch("/api/account", { method: "DELETE" });
      await signOut();
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hesap silinemedi.");
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hesap & KVKK"
        subtitle="Kişisel verileriniz üzerindeki haklarınızı buradan kullanın."
      />

      {error && <Alert tone="error">{error}</Alert>}
      {info && <Alert tone="success">{info}</Alert>}

      <Card>
        <CardBody className="space-y-2">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Profil</h2>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <Row label="E-posta" value={user?.email ?? "—"} />
            <Row label="Ad Soyad" value={profile?.full_name ?? "—"} />
            <Row
              label="KVKK onay tarihi"
              value={
                profile?.kvkk_consent_at
                  ? new Date(profile.kvkk_consent_at).toLocaleString("tr-TR")
                  : "—"
              }
            />
            <Row
              label="Onaylanan metin sürümü"
              value={profile?.kvkk_consent_version ?? "—"}
            />
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">
            Verilerimi dışa aktar (KVKK m. 11)
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Tüm kişisel verilerinizin tam bir kopyasını JSON formatında
            indirebilirsiniz.
          </p>
          <Button onClick={handleExport} disabled={exporting} variant="secondary">
            {exporting ? <Spinner /> : null}
            {exporting ? "Hazırlanıyor..." : "JSON olarak indir"}
          </Button>
        </CardBody>
      </Card>

      <Card className="border-red-200">
        <CardBody className="space-y-3">
          <h2 className="font-semibold text-red-700 dark:text-red-400">
            Hesabı sil (KVKK m. 7)
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Bu işlem <strong>geri alınamaz</strong>. Hesabınız ve tüm verileriniz
            (CV&apos;ler, başvurular, versiyonlar, mülakat ve mesaj kayıtları)
            kalıcı olarak silinir (hard-delete).
          </p>
          <Input
            placeholder='Onaylamak için "SİL" yazın'
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
          />
          <Button
            onClick={handleDelete}
            disabled={confirmText !== "SİL" || deleting}
            variant="danger"
          >
            {deleting ? <Spinner /> : null}
            {deleting ? "Siliniyor..." : "Hesabımı kalıcı olarak sil"}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-800 dark:text-slate-200">{value}</dd>
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
    />
  );
}
