"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "./api";
import type { Application, JobPosting } from "./types";

export interface ApplicationOption {
  application: Application;
  job?: JobPosting;
  label: string;
}

/** Loads the user's applications joined with their job postings, for pickers. */
export function useApplications() {
  const [options, setOptions] = useState<ApplicationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [apps, jobs] = await Promise.all([
        apiFetch<Application[]>("/api/applications"),
        apiFetch<JobPosting[]>("/api/job-postings"),
      ]);
      const jobMap = Object.fromEntries(jobs.map((j) => [j.id, j]));
      setOptions(
        apps.map((application) => {
          const job = jobMap[application.job_posting_id];
          const label = job
            ? `${job.position_title ?? "Pozisyon"} — ${job.company_name ?? "Şirket"}`
            : `Başvuru ${application.id.slice(0, 8)}`;
          return { application, job, label };
        }),
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Başvurular yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { options, loading, error, reload };
}
