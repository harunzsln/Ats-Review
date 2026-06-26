"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  DISCLOSURE_SECTIONS,
  DISCLOSURE_TITLE,
  DISCLOSURE_VERSION,
} from "@/lib/kvkk";
import type { Profile } from "@/lib/types";
import { Alert, Button, Card, CardBody, Spinner } from "@/components/ui";

const PUBLIC_PATHS = new Set(["/login", "/register"]);

export function KvkkConsentGate({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checking, setChecking] = useState(false);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsCheck =
    !!user && !PUBLIC_PATHS.has(pathname ?? "");

  const loadProfile = useCallback(async () => {
    if (!needsCheck) {
      setProfile(null);
      return;
    }
    setChecking(true);
    setError(null);
    try {
      const p = await apiFetch<Profile>("/api/profile");
      setProfile(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profil yüklenemedi.");
      setProfile(null);
    } finally {
      setChecking(false);
    }
  }, [needsCheck]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile, user?.id]);

  async function submitConsent() {
    if (!consent) {
      setError("Devam etmek için açık rıza vermeniz gerekir.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await apiFetch<Profile>("/api/profile/consent", {
        method: "POST",
        body: JSON.stringify({
          consent_given: true,
          disclosure_version: DISCLOSURE_VERSION,
        }),
      });
      setProfile(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onay kaydedilemedi.");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || (needsCheck && checking && !profile)) {
    return (
      <p className="py-12 text-center text-sm text-slate-400">Yükleniyor...</p>
    );
  }

  const missingConsent =
    needsCheck && profile !== null && !profile.kvkk_consent_at;

  if (missingConsent) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-4">
        <Alert tone="warning">
          Kişisel veri işleyen özellikleri kullanabilmek için KVKK aydınlatma
          metnini onaylamanız gerekiyor. (Kayıt sırasında onay kaydedilmemiş
          olabilir.)
        </Alert>

        <Card>
          <CardBody className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {DISCLOSURE_TITLE}
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Sürüm: {DISCLOSURE_VERSION}
              </p>
            </div>

            <div className="max-h-64 space-y-4 overflow-y-auto pr-2 text-sm text-slate-700 dark:text-slate-300">
              {DISCLOSURE_SECTIONS.map((s) => (
                <div key={s.heading}>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    {s.heading}
                  </h3>
                  <p className="mt-1 leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/50">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand dark:border-slate-600"
              />
              <span className="text-slate-700 dark:text-slate-300">
                <strong>{DISCLOSURE_TITLE}</strong>&apos;ni okudum ve kişisel
                verilerimin (yurt dışına aktarım dâhil) işlenmesine{" "}
                <strong>açık rıza</strong> veriyorum.
              </span>
            </label>

            {error && <Alert tone="error">{error}</Alert>}

            <Button
              onClick={submitConsent}
              disabled={!consent || submitting}
              className="w-full"
            >
              {submitting ? <Spinner /> : null}
              {submitting ? "Kaydediliyor..." : "Onayla ve Devam Et"}
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (needsCheck && error && !profile) {
    return (
      <div className="mx-auto max-w-md space-y-3 py-8">
        <Alert tone="error">{error}</Alert>
        <Button variant="secondary" onClick={() => void loadProfile()}>
          Tekrar dene
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
