"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { isPro } from "@/lib/plan";
import type { AtsScore, CvBase, JobPosting } from "@/lib/types";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  PageHeader,
  Select,
  Spinner,
} from "@/components/ui";
import {
  FormatIssues,
  KeywordLists,
  ProLock,
  ScoreGauge,
  SubScoreRow,
  SuggestionCard,
} from "@/components/score/ScoreWidgets";

export default function ScorePageClient({
  jobPostingId,
}: {
  jobPostingId: string;
}) {
  const { toast } = useToast();
  const [posting, setPosting] = useState<JobPosting | null>(null);
  const [cvs, setCvs] = useState<CvBase[]>([]);
  const [cvId, setCvId] = useState("");
  const [score, setScore] = useState<AtsScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<JobPosting>(`/api/job-postings/${jobPostingId}`),
      apiFetch<CvBase[]>("/api/cv-base"),
      apiFetch<AtsScore[]>(`/api/ats-scores?job_posting_id=${jobPostingId}`),
    ])
      .then(([p, c, scores]) => {
        setPosting(p);
        setCvs(c);
        if (c.length > 0) setCvId(c[0].id);
        if (scores.length > 0) {
          setScore(scores[0]);
          if (scores[0].cv_base_id) setCvId(scores[0].cv_base_id);
        }
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Veriler yüklenemedi."),
      )
      .finally(() => setLoading(false));
  }, [jobPostingId]);

  const compute = useCallback(
    async (force: boolean) => {
      if (!cvId) {
        setError("Lütfen bir CV seçin.");
        return;
      }
      setScoring(true);
      setError(null);
      try {
        const result = await apiFetch<AtsScore>("/api/ats-scores", {
          method: "POST",
          body: JSON.stringify({
            job_posting_id: jobPostingId,
            cv_base_id: cvId,
            force,
          }),
        });
        setScore(result);
        toast(`ATS skoru hesaplandı: ${Math.round(result.overall_score)}/100`, "success");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Skor hesaplanamadı.");
      } finally {
        setScoring(false);
      }
    },
    [cvId, jobPostingId, toast],
  );

  // "Recalculate" is only meaningful when the selected CV differs from the one
  // the current score was computed against — reinforces score stability.
  const canRecalculate = useMemo(
    () => !!score && score.cv_base_id !== cvId,
    [score, cvId],
  );

  if (loading) {
    return (
      <p className="py-12 text-center text-sm text-slate-400">Yükleniyor...</p>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="ATS Uyum Skoru"
        subtitle={
          posting
            ? `${posting.position_title ?? "Pozisyon"} · ${posting.company_name ?? "—"}`
            : undefined
        }
        action={
          <Link
            href="/jobs"
            className="text-sm text-slate-500 hover:text-brand dark:text-slate-400"
          >
            ← İlanlara dön
          </Link>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}

      <Card>
        <CardBody className="flex flex-wrap items-end gap-3">
          <div className="min-w-[16rem] flex-1">
            <Select
              label="Değerlendirilecek CV"
              value={cvId}
              onChange={(e) => setCvId(e.target.value)}
            >
              {cvs.length === 0 && <option value="">Önce CV yükleyin</option>}
              {cvs.map((cv) => (
                <option key={cv.id} value={cv.id}>
                  {cv.original_filename}
                </option>
              ))}
            </Select>
          </div>
          {!score ? (
            <Button onClick={() => compute(false)} disabled={scoring || !cvId}>
              {scoring ? <Spinner /> : null}
              {scoring ? "Hesaplanıyor..." : "Skoru Hesapla"}
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={() => compute(true)}
              disabled={scoring || !canRecalculate}
              title={
                canRecalculate
                  ? "Seçili CV değişti — yeniden hesapla"
                  : "Skor sabittir; CV/ilan değişmediği için yeniden hesaplamaya gerek yok."
              }
            >
              {scoring ? <Spinner /> : null}
              Yeniden Hesapla
            </Button>
          )}
        </CardBody>
      </Card>

      {cvs.length === 0 && (
        <EmptyState
          title="CV bulunamadı"
          description="ATS skoru hesaplamak için önce bir CV yüklemelisiniz."
          action={
            <Link
              href="/cv"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
            >
              CV yükle
            </Link>
          }
        />
      )}

      {score && (
        <>
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <Card>
              <CardBody className="flex flex-col items-center gap-3 text-center">
                <ScoreGauge score={score.overall_score} bandKey={score.band.key} />
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Badge tone="slate">v{score.algorithm_version}</Badge>
                  <span>Deterministik skor</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Aynı CV ve ilan için skor her zaman aynıdır. Sayı kod tabanlı
                  bir motorla hesaplanır; yapay zekâ yalnızca açıklama ve öneri
                  üretir, puanı değiştiremez.
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="space-y-3">
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                  Kategori Dökümü
                </h2>
                <div className="space-y-2">
                  {score.sub_scores.map((sub) => (
                    <SubScoreRow
                      key={sub.key}
                      sub={sub}
                      explanation={score.ai_explanations?.[sub.key]}
                    />
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardBody className="space-y-3">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                Anahtar Kelime Eşleşmesi
              </h2>
              <KeywordLists
                matched={score.matched_keywords}
                missing={score.missing_keywords}
              />
            </CardBody>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardBody className="space-y-3">
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                  Format & Okunabilirlik
                </h2>
                <FormatIssues issues={score.format_issues} />
              </CardBody>
            </Card>

            <Card>
              <CardBody className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                    İyileştirme Önerileri
                  </h2>
                  {!isPro && <Badge tone="amber">Pro&apos;da tümü</Badge>}
                </div>

                {!score.suggestions || score.suggestions.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    Öneri bulunamadı — skorunuz oldukça iyi görünüyor.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {/* Free users see the top suggestion; the rest are Pro-locked. */}
                    {(isPro
                      ? score.suggestions
                      : score.suggestions.slice(0, 1)
                    ).map((s, i) => (
                      <SuggestionCard key={i} suggestion={s} />
                    ))}

                    {!isPro && score.suggestions.length > 1 && (
                      <ProLock
                        title={`${score.suggestions.length - 1} öneri daha`}
                        description="Tüm önceliklendirilmiş, eyleme dönük önerileri ve beceri açığı planını Pro ile görün."
                      >
                        <div className="space-y-3">
                          {score.suggestions.slice(1, 3).map((s, i) => (
                            <SuggestionCard key={i} suggestion={s} />
                          ))}
                        </div>
                      </ProLock>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
