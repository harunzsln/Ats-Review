"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import {
  DISCLOSURE_SECTIONS,
  DISCLOSURE_TITLE,
  DISCLOSURE_VERSION,
} from "@/lib/kvkk";
import {
  Alert,
  Button,
  Card,
  CardBody,
  Input,
  PageHeader,
  Spinner,
} from "@/components/ui";

export default function RegisterPageClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) {
      setStatus({
        tone: "error",
        text: "KVKK aydınlatma metnini onaylamadan kayıt olamazsınız.",
      });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw error;

      // Session may not be ready immediately; wait briefly for auth state.
      if (!data.session) {
        await new Promise((r) => setTimeout(r, 500));
      }

      await apiFetch("/api/profile/consent", {
        method: "POST",
        body: JSON.stringify({
          consent_given: true,
          disclosure_version: DISCLOSURE_VERSION,
        }),
      });
      router.push("/");
    } catch (err) {
      setStatus({
        tone: "error",
        text: err instanceof Error ? err.message : "Bir hata oluştu.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Card>
        <CardBody>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {DISCLOSURE_TITLE}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Sürüm: {DISCLOSURE_VERSION}
          </p>
          <div className="mt-4 max-h-[28rem] space-y-4 overflow-y-auto pr-2 text-sm text-slate-700 dark:text-slate-300">
            {DISCLOSURE_SECTIONS.map((s) => (
              <div key={s.heading}>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  {s.heading}
                </h3>
                <p className="mt-1 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <div>
        <PageHeader
          title="Hesap oluştur"
          subtitle={
            <>
              Zaten hesabın var mı?{" "}
              <Link href="/login" className="text-brand hover:underline">
                Giriş yap
              </Link>
            </>
          }
        />

        <Card className="mt-6">
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Ad Soyad"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
              />
              <Input
                label="E-posta"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <Input
                label="Şifre"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />

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

              {status && <Alert tone={status.tone}>{status.text}</Alert>}

              <Button type="submit" disabled={!consent || loading} className="w-full">
                {loading ? <Spinner /> : null}
                {loading ? "Kaydediliyor..." : "Kayıt Ol"}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
