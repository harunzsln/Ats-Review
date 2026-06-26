# ATS Review — AI-Powered Application Tracking & Career Platform

An end-to-end, KVKK-compliant platform that optimizes job seekers' CVs against
their target job postings and supports them with interview simulations and a
networking (cold message) assistant.

> **Market:** Turkey — KVKK (Law No. 6698 on the Protection of Personal Data)
> compliance is treated as a hard requirement, enforced both in the database
> (RLS, hard deletes, no third-party PII columns) and in application code
> (PII filtering, transient-only third-party data, explicit consent).

## Architecture

| Layer        | Technology                                                        |
| ------------ | ----------------------------------------------------------------- |
| Backend      | Python 3.11+ / FastAPI                                             |
| AI           | Google Gemini API (interview sim, cold messages, CV↔job matching) |
| DB & Auth    | Supabase (PostgreSQL + Row Level Security + Auth)                 |
| File storage | Supabase Storage (private bucket, short-lived signed URLs)         |
| Frontend     | Next.js (App Router) + Tailwind + `@dnd-kit` + `react-diff-viewer` |

```
ats-review/
├── supabase/
│   ├── config.toml
│   ├── migrations/            # SQL schema + RLS + storage + retention cron
│   └── functions/
│       └── auto-anonymize/    # Edge Function for 24-month inactivity cleanup
├── backend/
│   ├── app/
│   │   ├── routers/           # FastAPI CRUD endpoints (one per table)
│   │   ├── services/          # cv_diff, pii_filter, ats, gemini, cold_message
│   │   ├── models/            # Pydantic schemas
│   │   ├── auth.py            # Supabase JWT verification dependency
│   │   ├── supabase_client.py # Per-request RLS-scoped client factory
│   │   └── main.py
│   └── tests/                 # Unit tests (cv_diff, pii_filter)
└── frontend/                  # Next.js app (KVKK consent, Kanban, diff view)
```

## KVKK compliance map

| Requirement (spec §)                          | Where it is enforced                                        |
| --------------------------------------------- | ---------------------------------------------------------- |
| §4.1 Separate disclosure + opt-in consent     | `frontend/app/(auth)/register`, `users.kvkk_consent_*`     |
| §4.2 No third-party PII persisted             | `services/pii_filter.py` + `cold_messages` has no name col |
| §4.3 Hard cascade delete + export             | `routers/account.py`, `ON DELETE CASCADE` migrations       |
| §4.3 24-month inactivity auto-cleanup         | `supabase/functions/auto-anonymize` + `pg_cron`            |
| §4.4 Strip national ID / DOB before AI calls  | `services/pii_filter.py::filter_for_ai`                    |
| §4.5 Private bucket + signed URLs             | `migrations/*_storage.sql`, `services` signed-url helper   |
| §4.5 RLS `auth.uid() = user_id` on every table| `migrations/*_rls.sql`                                     |

## Quick start

### 1. Database (Supabase)

```bash
cd supabase
supabase start                      # local stack
supabase db reset                   # applies migrations in order
```

### 2. Backend

**Requires Python 3.12 or 3.13** (not 3.14 — `pydantic-core` has no pre-built wheels yet).

```bash
cd backend
py -3.12 -m venv .venv                             # Windows: use py launcher
.venv\Scripts\activate                             # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                               # fill in Supabase + Gemini keys
uvicorn app.main:app --reload
pytest                                             # run unit tests
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

## MVP scope (first sprint)

1. Auth + KVKK consent flow
2. CV upload + parsing (PDF → structured JSON)
3. Job posting input + basic ATS scoring
4. Kanban board (CRUD + drag-and-drop + realtime)
5. CV version history + side-by-side diff
6. Cold message generation (third-party-PII-safe)
7. Interview simulator
8. Account deletion / data export endpoints

See [`docs`](#) inline within each module for details.
