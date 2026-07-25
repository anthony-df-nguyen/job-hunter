# Job Hunter

## What this is

A locally-run job search app: scrapes LinkedIn/Indeed via
[JobSpy](https://github.com/speedyapply/JobSpy), applies configurable
filters, tracks results in a table you can update (status, notes) as you
work through applications, and can tailor your resume to a specific job
using a local LLM (Ollama). No deployed backend/database — everything runs
on your own machine.

The app started as a single script (`job_search_csv.py` writing to CSVs);
that migration to the current FastAPI + Next.js architecture is long done
and the old script/CSVs are gone — `backend/requirements.txt` is the only
Python dependency list.

## Architecture

- **Backend**: FastAPI (Python) + SQLite, in `backend/`. Owns the `jobspy`
  scraping logic (including LinkedIn monkeypatches carried over from the
  original script), all persistent state, and the LLM resume-tailoring
  call.
- **Frontend**: Next.js (App Router) + Tailwind v4 + TypeScript, in
  `frontend/`. Talks to the backend over `http://localhost:8000` (see
  `lib/api.ts` / `lib/types.ts`). The jobs table is AG Grid
  (`ag-grid-community` + `ag-grid-react`, migrated from TanStack Table);
  data fetching is SWR.
- **LLM**: optional local Ollama instance, reached through its
  OpenAI-compatible API via the `openai` Python client. Only used by the
  tailor-resume feature; the rest of the app works without it.
- Two local processes (`uvicorn` + `npm run dev`), no containerization, no
  hosted database — install and run on a laptop.

### Why FastAPI over the alternatives considered

`jobspy` is Python-only, so the backend had to be Python — the real choice
was FastAPI vs. Flask, decided in favor of FastAPI for: Pydantic request
validation (config coming from the UI gets typed/validated automatically),
built-in async/background-task support (needed for "run a scrape without
blocking the UI"), and auto-generated `/docs` for exercising endpoints while
building the frontend.

## Data model (`backend/app/models.py`)

- **JobTitle** `(id, term, active)` — search terms sent to job boards.
- **Location** `(id, name, active)` — place labels, including the literal
  string "Remote".
- **SearchConfig** `(id, job_title_id, location_id, is_remote, active)` —
  the actual combos that get run. An explicit join, not a title×location
  cross-product — combos are picked/added explicitly (the same location can
  appear once remote and once not).
- **KeywordRule** `(id, keyword, category, active)` — one table for all
  filter keywords; `category` is one of `good_title` / `skip_title` /
  `skip_description` / `contract_type`. The UI shows four plain tag/chip
  inputs rather than a generic rule builder.
- **JobStatus** `(id, name, sort_order, is_default, color)` — user-editable
  pipeline stages, seeded with New (default) / Reviewing / Applied /
  Interviewing / Pass / Closed, each with a hex `color` used by the UI.
  Add/rename/reorder/recolor/delete from Settings. Deleting a status still
  referenced by a `Job` is rejected (409) rather than cascading.
- **RunSettings** (singleton row, id=1) — `sites`, `results_per_search`,
  `hours_old`, `min_salary`, `include_jobs_without_salary`. Global only, no
  per-`SearchConfig` overrides.
- **AppSettings** (singleton row, id=1) — resume-tailoring config:
  `base_resume_text` (extracted plain text; the uploaded file itself is not
  kept), `base_resume_filename`, `system_prompt`, `llm_base_url` (defaults
  to Ollama at `http://localhost:11434/v1`), `llm_model`.
- **Job** — one row per tracked job: `date_seen, title, company, location,
  is_remote, url (unique/dedup key), status_id, notes, site, salary_min,
  salary_max, salary_interval, description, search_config_id, run_id`.
  `description` is stored so tailor-resume has something to work from.
- **Run** — one row per scrape execution: `started_at, finished_at, status
  (running|done|error|cancelled), cancel_requested,
  current_search_title/location/is_remote, progress_completed,
  progress_total, new_jobs_count, filtered_count, skipped_seen_count,
  error_message`. Written to directly by the background scrape task as it
  progresses — the frontend polls this row rather than streaming logs, so
  progress survives a page refresh mid-run.

**Migrations**: no Alembic. `Base.metadata.create_all()` at startup creates
missing *tables* only; columns added to existing tables need a manual
`ALTER TABLE` in `main._run_migrations()` (currently `jobs.description` and
`job_statuses.color`). `seed.py` seeds defaults on startup. Shared router
helpers (`get_or_404`, `apply_updates`, singleton `get_settings_row`) live
in `backend/app/routers/common.py`.

## Backend endpoints

- CRUD for `job-titles`, `locations`, `search-configs`, `keyword-rules`
  (filterable by `category`), `statuses`.
- `GET/PUT /run-settings` and `GET/PUT /app-settings` (singletons), plus
  `POST /app-settings/resume` — multipart upload of a `.pdf`/`.docx` resume,
  text extracted via `pdfplumber` / `python-docx`.
- `POST /runs` starts a scrape as a background task (409 if one is already
  running); `GET /runs/{id}` is what the frontend polls for progress;
  `POST /runs/{id}/cancel` sets `cancel_requested` (cooperative — the
  scrape loop checks it between searches); `GET /runs` is history.
- `GET /jobs` lists/filters/sorts; `PATCH /jobs/{id}` updates
  `status_id`/`notes`; `DELETE /jobs/{id}` deletes one job and
  `DELETE /jobs` wipes the table (the "clear all" button).
- `POST /jobs/{id}/tailor-resume` sends the job description + base resume +
  system prompt to the configured LLM and returns the tailored resume text.
  Nothing is stored — the frontend shows the result in a modal. 400 if the
  job has no description or no base resume is uploaded; 502 if the LLM call
  fails (Ollama not running, model not pulled).

## Scraper (`backend/app/scraper.py`)

Ported from `job_search_csv.py` with minimal changes: the
`Country.from_string` and LinkedIn detail-page salary monkeypatches are
kept, as is `normalize_url()`. `passes_filters()` reads keyword rules from
the DB instead of module constants. The main loop (`run_scrape`) iterates
active `SearchConfig`s, calls `scrape_jobs(...)`, updates the `Run` row's
progress before each search, checks `cancel_requested` between searches
(marking the run `cancelled` if set), dedupes against existing `Job.url`
values, filters, and inserts new `Job` rows (including the job
description). Per-search try/except means one bad site doesn't abort the
run.

## Frontend layout

- `app/page.tsx` — jobs page: AG Grid table
  (`components/JobsTable/` — `index.tsx`, `columns.tsx`, `ColumnsMenu.tsx`
  for show/hide columns, salary formatting), run button +
  `RunProgressBanner` (SWR polling of `GET /runs/{id}` while running, with
  cancel), `TailoredResumeModal` (shows/copies the LLM result),
  `UndoToastStack` + `ConfirmDialog` for delete flows, `ThemeToggle`.
- `app/settings/page.tsx` — composes `SearchConfigsEditor`,
  `KeywordRulesEditor` (four `TagList` instances), `JobStatusesEditor`,
  `RunSettingsForm`, and `AppSettingsForm` (resume upload, system prompt,
  Ollama URL/model).

Historical design rationale (why SQLite over CSV, why polling over SSE,
alternatives considered for each decision) lived in the planning
conversation that produced this file — this doc captures the resulting
decisions, not the deliberation.
