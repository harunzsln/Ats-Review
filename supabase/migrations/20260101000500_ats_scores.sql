-- =============================================================================
-- ATS Review — ats_scores table (deterministic scoring engine, brief §4.3)
--
-- Persists every scoring event with the full sub-score breakdown AND the
-- algorithm version + content fingerprint, so:
--   * historical scores stay explainable even after the algorithm improves,
--   * a score can be reused (instead of recomputed) when nothing changed,
--   * the AI explanation layer reads a stored breakdown without recomputation.
--
-- KVKK: RLS-scoped to auth.uid() = user_id like every other table. The AI
-- explanation text is generated from PII-scrubbed input upstream.
-- =============================================================================

create table if not exists public.ats_scores (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  job_posting_id     uuid not null references public.job_postings (id) on delete cascade,
  cv_base_id         uuid references public.cv_base (id) on delete cascade,
  cv_version_id      uuid references public.cv_versions (id) on delete cascade,

  algorithm_version  text not null,
  fingerprint        text not null,

  overall_score      numeric(5, 2) not null,
  band               text not null,
  sub_scores         jsonb not null default '[]'::jsonb,
  matched_keywords   jsonb not null default '[]'::jsonb,
  missing_keywords   jsonb not null default '[]'::jsonb,
  format_issues      jsonb not null default '[]'::jsonb,

  -- Layer 2 (AI) output — qualitative only, never authoritative over numbers.
  ai_explanations    jsonb,
  suggestions        jsonb,

  created_at         timestamptz not null default now()
);

comment on table public.ats_scores is
  'Deterministic ATS score events with versioned sub-score breakdown (brief §4.3).';
comment on column public.ats_scores.fingerprint is
  'sha256(cv + job + algorithm_version); identical input => identical fingerprint.';
comment on column public.ats_scores.ai_explanations is
  'Layer-2 AI natural-language explanations; never overrides the numeric score.';

-- Fast lookup of the latest score for a given (cv, job) pair + reuse-by-fingerprint.
create index if not exists ats_scores_user_job_idx
  on public.ats_scores (user_id, job_posting_id, created_at desc);
create index if not exists ats_scores_fingerprint_idx
  on public.ats_scores (user_id, fingerprint);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.ats_scores enable row level security;

create policy "ats_scores_select_own" on public.ats_scores
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "ats_scores_insert_own" on public.ats_scores
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "ats_scores_update_own" on public.ats_scores
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "ats_scores_delete_own" on public.ats_scores
  for delete to authenticated using ((select auth.uid()) = user_id);
