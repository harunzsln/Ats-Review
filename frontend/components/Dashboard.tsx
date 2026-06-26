"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  STATUS_LABELS,
  STATUS_ORDER,
  type Application,
  type CvBase,
  type CvVersion,
  type JobPosting,
} from "@/lib/types";
import {
  Badge,
  Card,
  CardBody,
  EmptyState,
  LinkButton,
  PageHeader,
} from "@/components/ui";

interface ActivityItem {
  id: string;
  at: string;
  label: string;
  detail?: string;
  href: string;
  icon: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [cvs, setCvs] = useState<CvBase[]>([]);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [versions, setVersions] = useState<CvVersion[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<Application[]>("/api/applications").catch(() => []),
      apiFetch<CvBase[]>("/api/cv-base").catch(() => []),
      apiFetch<JobPosting[]>("/api/job-postings").catch(() => []),
      apiFetch<CvVersion[]>("/api/cv-versions").catch(() => []),
    ]).then(([a, c, j, v]) => {
      setApps(a);
      setCvs(c);
      setJobs(j);
      setVersions(v);
      setLoaded(true);
    });
  }, []);

  const counts = STATUS_ORDER.reduce<Record<string, number>>((acc, s) => {
    acc[s] = apps.filter((a) => a.status === s).length;
    return acc;
  }, {});

  const scoredVersions = versions.filter((v) => v.ats_score != null);
  const avgAts =
    scoredVersions.length > 0
      ? Math.round(
          scoredVersions.reduce((sum, v) => sum + (v.ats_score ?? 0), 0) /
            scoredVersions.length,
        )
      : null;
  const bestAts =
    scoredVersions.length > 0
      ? Math.max(...scoredVersions.map((v) => v.ats_score ?? 0))
      : null;

  const activity = useMemo(() => {
    const items: ActivityItem[] = [];

    for (const a of apps) {
      const job = jobs.find((j) => j.id === a.job_posting_id);
      items.push({
        id: `app-${a.id}`,
        at: a.status_updated_at,
        label: `Durum: ${STATUS_LABELS[a.status]}`,
        detail: `${job?.position_title ?? "Pozisyon"} · ${job?.company_name ?? "—"}`,
        href: "/board",
        icon: "🗂️",
      });
    }

    for (const v of versions) {
      items.push({
        id: `ver-${v.id}`,
        at: v.created_at,
        label: "CV versiyonu oluşturuldu",
        detail: `${v.version_label}${v.ats_score != null ? ` · ATS ${v.ats_score}` : ""}`,
        href: "/versions",
        icon: "🔀",
      });
    }

    for (const cv of cvs) {
      items.push({
        id: `cv-${cv.id}`,
        at: cv.created_at,
        label: "CV yüklendi",
        detail: cv.original_filename,
        href: "/cv",
        icon: "📄",
      });
    }

    for (const j of jobs) {
      if (!j.created_at) continue;
      items.push({
        id: `job-${j.id}`,
        at: j.created_at,
        label: "İlan eklendi",
        detail: `${j.position_title ?? "Pozisyon"} · ${j.company_name ?? "—"}`,
        href: "/jobs",
        icon: "📋",
      });
    }

    return items
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 8);
  }, [apps, cvs, jobs, versions]);

  const greeting = user?.email?.split("@")[0] ?? "tekrar hoş geldin";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Merhaba, ${greeting} 👋`}
        subtitle="Kariyer yolculuğunun genel görünümü."
        action={
          <div className="flex gap-2">
            <LinkButton href="/jobs" variant="primary" size="sm">
              + İlan ekle
            </LinkButton>
            <LinkButton href="/cv" variant="secondary" size="sm">
              CV yükle
            </LinkButton>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Toplam Başvuru" value={apps.length} href="/board" />
        <StatCard label="Yüklü CV" value={cvs.length} href="/cv" />
        <StatCard label="Kayıtlı İlan" value={jobs.length} href="/jobs" />
        <StatCard
          label="CV Versiyonu"
          value={versions.length}
          href="/versions"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                Pano Özeti
              </h2>
              <LinkButton href="/board" variant="ghost" size="sm">
                Panoya git →
              </LinkButton>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {STATUS_ORDER.map((s) => (
              <div
                key={s}
                className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center dark:border-slate-800 dark:bg-slate-800/50"
              >
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {loaded ? counts[s] : "–"}
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {STATUS_LABELS[s]}
                </div>
              </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                ATS Uyum Skorları
              </h2>
              <LinkButton href="/versions" variant="ghost" size="sm">
                Versiyonlar →
              </LinkButton>
            </div>

            {!loaded && (
              <p className="text-sm text-slate-400">Yükleniyor...</p>
            )}

            {loaded && scoredVersions.length === 0 && (
              <EmptyState
                title="Henüz ATS skoru yok"
                description="İlanlar sayfasından bir CV'yi optimize ederek skor üretin."
                action={
                  <LinkButton href="/jobs" size="sm">
                    İlanlara git
                  </LinkButton>
                }
              />
            )}

            {loaded && scoredVersions.length > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-brand-50 p-3 text-center dark:bg-brand-900/30">
                    <div className="text-2xl font-bold text-brand dark:text-brand-200">
                      {avgAts}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Ortalama ATS
                    </div>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-3 text-center dark:bg-emerald-900/30">
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {bestAts}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      En yüksek ATS
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {scoredVersions.slice(0, 5).map((v) => (
                    <AtsBar
                      key={v.id}
                      label={v.version_label}
                      score={v.ats_score ?? 0}
                    />
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h2 className="mb-3 font-semibold text-slate-900 dark:text-slate-100">
              Son Aktivite
            </h2>
            {!loaded && <p className="text-sm text-slate-400">Yükleniyor...</p>}
            {loaded && activity.length === 0 && (
              <p className="text-sm text-slate-400">
                Henüz aktivite yok. İlan ekleyerek başlayın.
              </p>
            )}
            <ul className="space-y-2">
              {activity.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="flex items-start gap-3 rounded-lg border border-slate-100 px-3 py-2 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {item.label}
                      </p>
                      {item.detail && (
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {item.detail}
                        </p>
                      )}
                    </div>
                    <time className="shrink-0 text-[10px] text-slate-400">
                      {new Date(item.at).toLocaleDateString("tr-TR")}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="mb-3 font-semibold text-slate-900 dark:text-slate-100">
              Hızlı Erişim
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <QuickLink href="/cv" icon="📄" label="CV Yönetimi" />
              <QuickLink href="/jobs" icon="🗂️" label="İlanlar" />
              <QuickLink href="/versions" icon="🔀" label="CV Versiyonları" />
              <QuickLink href="/cold-messages" icon="✉️" label="Soğuk Mesaj" />
              <QuickLink href="/interviews" icon="🎤" label="Mülakat Provası" />
              <QuickLink href="/account" icon="⚙️" label="Hesap & KVKK" />
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <h2 className="mb-3 font-semibold text-slate-900 dark:text-slate-100">
            Son Başvurular
          </h2>
          {!loaded && <p className="text-sm text-slate-400">Yükleniyor...</p>}
          {loaded && apps.length === 0 && (
            <p className="text-sm text-slate-400">
              Henüz başvuru yok. İlan ekleyerek başla.
            </p>
          )}
          <ul className="space-y-2">
            {apps.slice(0, 5).map((a) => {
              const job = jobs.find((j) => j.id === a.job_posting_id);
              return (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                      {job?.position_title ?? "İsimsiz pozisyon"}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {job?.company_name ?? "—"}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[a.status]}>
                    {STATUS_LABELS[a.status]}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}

const STATUS_TONE: Record<
  Application["status"],
  "slate" | "blue" | "amber" | "emerald" | "red"
> = {
  to_review: "slate",
  applied: "blue",
  interview_pending: "amber",
  offer_received: "emerald",
  rejected: "red",
};

function AtsBar({ label, score }: { label: string; score: number }) {
  const tone =
    score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-red-400";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="truncate text-slate-600 dark:text-slate-400">{label}</span>
        <span className="shrink-0 font-medium text-slate-800 dark:text-slate-200">
          {score}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all ${tone}`}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <LinkButton
      href={href}
      variant="secondary"
      className="!block !p-0 hover:!bg-white"
    >
      <Card className="border-0 shadow-none">
        <CardBody>
          <div className="text-3xl font-bold text-brand dark:text-brand-300">
            {value}
          </div>
          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {label}
          </div>
        </CardBody>
      </Card>
    </LinkButton>
  );
}

function QuickLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 transition-colors hover:border-brand hover:bg-brand-50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand dark:hover:bg-brand-900/20"
    >
      <span className="text-lg">{icon}</span>
      {label}
    </Link>
  );
}
