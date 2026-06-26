-- =============================================================================
-- ATS Review — Core schema
-- Every table has a user_id FK. Deletion is CASCADE so a KVKK Art. 7 deletion
-- request can be fully honored with a single account delete (hard delete).
-- RLS policies live in the next migration; RLS is ENABLED here per table.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.application_status as enum (
  'to_review',
  'applied',
  'interview_pending',
  'offer_received',
  'rejected'
);

-- ---------------------------------------------------------------------------
-- profiles  (1:1 with auth.users — KVKK consent ledger lives here)
-- We never modify the auth.users table directly; instead we mirror the user id
-- and store consent metadata. A trigger creates a row on signup.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                   uuid primary key references auth.users (id) on delete cascade,
  full_name            text,
  -- KVKK §4.1: record WHEN and WHICH version of the disclosure text was approved.
  kvkk_consent_at      timestamptz,
  kvkk_consent_version text,
  -- §4.3: used by the 24-month inactivity retention job.
  last_active_at       timestamptz not null default now(),
  created_at           timestamptz not null default now()
);

comment on column public.profiles.kvkk_consent_at is
  'Timestamp the user gave explicit (opt-in) consent to the KVKK disclosure text.';
comment on column public.profiles.kvkk_consent_version is
  'Version string of the disclosure text consented to; re-prompt if it changes.';

-- ---------------------------------------------------------------------------
-- cv_base  (master / original CV)
-- ---------------------------------------------------------------------------
create table public.cv_base (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  original_filename text not null,
  storage_path      text not null,            -- path inside the private cv-files bucket
  parsed_content    jsonb not null default '{}'::jsonb,  -- ATS parser output
  created_at        timestamptz not null default now()
);
create index cv_base_user_id_idx on public.cv_base (user_id);

-- ---------------------------------------------------------------------------
-- job_postings
-- ---------------------------------------------------------------------------
create table public.job_postings (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users (id) on delete cascade,
  raw_text             text not null,
  source_url           text,
  company_name         text,
  position_title       text,
  parsed_requirements  jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now()
);
create index job_postings_user_id_idx on public.job_postings (user_id);

-- ---------------------------------------------------------------------------
-- applications  (Kanban cards)
-- Note the chicken/egg with cv_versions: an application can reference the CV
-- version that was sent, and a CV version can reference the application it was
-- tailored for. We create applications first WITHOUT the cv_version_id FK, then
-- add cv_versions, then add the FK via ALTER.
-- ---------------------------------------------------------------------------
create table public.applications (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  job_posting_id    uuid not null references public.job_postings (id) on delete cascade,
  cv_version_id     uuid,  -- FK added after cv_versions exists
  status            public.application_status not null default 'to_review',
  status_updated_at timestamptz not null default now(),
  notes             text,
  created_at        timestamptz not null default now()
);
create index applications_user_id_idx on public.applications (user_id);
create index applications_job_posting_id_idx on public.applications (job_posting_id);

-- ---------------------------------------------------------------------------
-- cv_versions  (CV version history)
-- A single cv_base has many cv_versions. Each version stores the full content
-- directly (fast render) AND a structured diff against the original.
-- ---------------------------------------------------------------------------
create table public.cv_versions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  cv_base_id         uuid not null references public.cv_base (id) on delete cascade,
  -- which application/posting this version was tailored for (nullable)
  job_application_id uuid references public.applications (id) on delete set null,
  version_label      text not null,
  -- structured line-level diff: {changed:[], added:[], removed:[], reason:...}
  content_diff       jsonb not null default '{}'::jsonb,
  -- full content stored directly, NOT reconstructed from the diff
  full_content       jsonb not null default '{}'::jsonb,
  ats_score          numeric(5,2),
  created_at         timestamptz not null default now()
);
create index cv_versions_user_id_idx on public.cv_versions (user_id);
create index cv_versions_cv_base_id_idx on public.cv_versions (cv_base_id);
create index cv_versions_job_application_id_idx on public.cv_versions (job_application_id);

-- Now wire applications.cv_version_id -> cv_versions.id (the CV that was sent).
alter table public.applications
  add constraint applications_cv_version_id_fkey
  foreign key (cv_version_id) references public.cv_versions (id) on delete set null;

-- ---------------------------------------------------------------------------
-- interview_simulations
-- ---------------------------------------------------------------------------
create table public.interview_simulations (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users (id) on delete cascade,
  application_id          uuid not null references public.applications (id) on delete cascade,
  weak_points_identified  jsonb not null default '[]'::jsonb,
  simulated_questions     jsonb not null default '[]'::jsonb,
  user_responses          jsonb not null default '[]'::jsonb,
  created_at              timestamptz not null default now()
);
create index interview_simulations_user_id_idx on public.interview_simulations (user_id);
create index interview_simulations_application_id_idx on public.interview_simulations (application_id);

-- ---------------------------------------------------------------------------
-- cold_messages  (KVKK §4.2 — NO third-party PII columns by design)
-- Stores ONLY a role label (e.g. "HR Manager"); never a name, email, or
-- LinkedIn URL of the target person. This is a structural guarantee: the
-- column to store a name simply does not exist.
-- ---------------------------------------------------------------------------
create table public.cold_messages (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users (id) on delete cascade,
  application_id            uuid not null references public.applications (id) on delete cascade,
  target_role               text not null,         -- role ONLY, never a person
  generated_template        text not null,
  user_edited_before_sending boolean not null default false,
  created_at                timestamptz not null default now()
);
create index cold_messages_user_id_idx on public.cold_messages (user_id);
create index cold_messages_application_id_idx on public.cold_messages (application_id);

comment on table public.cold_messages is
  'KVKK §4.2: third-party (HR/hiring-lead) personal data is NEVER persisted. '
  'Only target_role is stored. Names provided by the user are used transiently '
  'in the AI prompt and stripped before any write.';

-- ---------------------------------------------------------------------------
-- keep status_updated_at fresh when status changes
-- ---------------------------------------------------------------------------
create or replace function public.touch_application_status()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    new.status_updated_at := now();
  end if;
  return new;
end;
$$;

create trigger applications_status_touch
  before update on public.applications
  for each row execute function public.touch_application_status();

-- ---------------------------------------------------------------------------
-- create a profile row automatically on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Enable RLS on every table (policies in the next migration)
-- ---------------------------------------------------------------------------
alter table public.profiles              enable row level security;
alter table public.cv_base               enable row level security;
alter table public.job_postings          enable row level security;
alter table public.applications          enable row level security;
alter table public.cv_versions           enable row level security;
alter table public.interview_simulations enable row level security;
alter table public.cold_messages         enable row level security;
