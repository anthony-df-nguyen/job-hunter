# Job Hunter

## What this is

A locally-run job search app: scrapes LinkedIn/Indeed via
[JobSpy](https://github.com/speedyapply/JobSpy), applies configurable
filters, and tracks results in a table you can update (status, notes) as you
work through applications. No deployed backend/database — everything runs
on your own machine.

**Status: migration complete.** The original version was a single script,
`job_search_csv.py`, which wrote to `job_tracker.csv` / `search_log.csv`.
It's been fully replaced by a FastAPI backend (SQLite) + Next.js frontend so
search config and job statuses are editable through a UI instead of Python
constants and CSV edits. Backend parity was verified with a real scrape run
and the UI was confirmed working in-browser (see build order below); the
old script, its CSVs, and its root-level `requirements.txt` have been
removed — `backend/requirements.txt` is now the only Python dependency list.

## Architecture

- **Backend**: FastAPI (Python) + SQLite, in `backend/`. Owns the `jobspy`
  scraping logic (ported near-verbatim from `job_search_csv.py`, including
  its LinkedIn monkeypatches) and all persistent state.
- **Frontend**: Next.js (App Router) + Tailwind + TypeScript, in
  `frontend/`. Talks to the backend over `http://localhost:8000`.
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

Everything that used to be a hardcoded Python constant in
`job_search_csv.py` is now a DB table, editable via the UI:

- **JobTitle** `(id, term, active)` — search terms sent to job boards (was
  the title half of `SEARCHES`).
- **Location** `(id, name, active)` — place labels, including the literal
  string "Remote" (was the location half of `SEARCHES`).
- **SearchConfig** `(id, job_title_id, location_id, is_remote, active)` —
  the actual combos that get run. This is an explicit join, not a
  title×location cross-product: `SEARCHES` in the original script wasn't a
  full cross-product either (e.g. "Orange County, CA" appeared once with
  `is_remote=True` and once `False`), so combos are picked/added explicitly
  rather than auto-generated.
- **KeywordRule** `(id, keyword, category, active)` — replaces
  `GOOD_TITLE_KEYWORDS` / `SKIP_TITLE_KEYWORDS` / `SKIP_DESCRIPTION_KEYWORDS`
  / `CONTRACT_KEYWORDS`. One table, `category` is one of those four values;
  the UI shows four plain tag/chip inputs rather than a generic field+mode
  rule builder — simpler for both the schema and the UX.
- **JobStatus** `(id, name, sort_order, is_default)` — user-editable
  pipeline stages, seeded with New (default) / Reviewing / Applied /
  Interviewing / Pass / Closed. Add/rename/reorder/delete from Settings.
  Deleting a status still referenced by a `Job` is rejected (409) rather
  than cascading.
- **RunSettings** (singleton row) — `sites`, `results_per_search`,
  `hours_old`, `min_salary`, `include_jobs_without_salary`. Global only, no
  per-`SearchConfig` overrides (matches the original script; add overrides
  later only if a real need shows up).
- **Job** — one row per tracked job: `date_seen, title, company, location,
  is_remote, url (unique/dedup key), status_id, notes, site, salary_min,
  salary_max, salary_interval, search_config_id, run_id`.
- **Run** — one row per scrape execution: `started_at, finished_at, status
  (running|done|error), current_search_title/location/is_remote,
  progress_completed, progress_total, new_jobs_count, filtered_count,
  skipped_seen_count, error_message`. Written to directly by the background
  scrape task as it progresses — the frontend polls this row rather than
  streaming full console-style logs, so progress also survives a page
  refresh mid-run.

## Backend endpoints

CRUD for `job-titles`, `locations`, `search-configs`, `keyword-rules`
(filterable by `category`), `statuses`, and a singleton `run-settings`.
`POST /runs` starts a scrape as a background task (rejects with 409 if one
is already running); `GET /runs/{id}` is what the frontend polls for
progress; `GET /runs` is history. `GET /jobs` lists/filters/sorts;
`PATCH /jobs/{id}` updates `status_id`/`notes`.

## Scraper (`backend/app/scraper.py`)

Ported from `job_search_csv.py` with minimal changes: the `Country.from_string`
and LinkedIn detail-page salary monkeypatches are unchanged, as is
`normalize_url()`. `passes_filters()` has the same logic but reads keyword
rules from the DB instead of module constants. The main loop (`run_scrape`)
mirrors the old `main()`: iterate active `SearchConfig`s, call
`scrape_jobs(...)`, update the `Run` row's progress before each search,
dedupe against existing `Job.url` values (DB query replaces
`load_seen_urls`), filter, insert new `Job` rows. Per-search try/except
means one bad site doesn't abort the run, same as today.

## Build order / current progress

0. ~~Write this file~~ (done)
1. ~~Backend scaffold~~ (done) — FastAPI app, SQLAlchemy models, SQLite init,
   `seed.py`, CRUD routers for job-titles/locations/search-configs/
   keyword-rules/statuses/run-settings. Verified via direct curl calls
   against every endpoint, including the create/duplicate-reject/
   delete-guard paths.
2. ~~Scraper port~~ (done) — `app/scraper.py`, `POST/GET /runs` with
   background execution. Verified end-to-end with a real scrape (lowered
   `results_per_search`/`hours_old` for a cheap run): found and filtered
   real LinkedIn/Indeed listings, correctly parsed a LinkedIn salary via the
   detail-page patch, wrote progress to the `Run` row, and rejected a
   concurrent second run with 409 while one was in flight.
3. ~~`GET/PATCH /jobs`~~ (done) — verified via curl.
4. ~~Frontend scaffold + Jobs table page~~ (done) — `create-next-app`
   (App Router, Tailwind v4, TypeScript, Turbopack), `lib/api.ts` +
   `lib/types.ts`, `components/JobsTable.tsx` (TanStack Table, inline status
   `<select>` and notes field), `app/page.tsx`.
5. ~~Settings page~~ (done) — `components/SearchConfigsEditor.tsx`,
   `KeywordRulesEditor.tsx` (four `TagList` instances), `JobStatusesEditor.tsx`,
   `RunSettingsForm.tsx`, composed in `app/settings/page.tsx`.
6. ~~Run button + progress banner~~ (done) — `components/RunProgressBanner.tsx`
   polls `GET /runs/{id}` via SWR's `refreshInterval` while `status ===
   "running"`.
7. ~~Cleanup~~ (done) — `README.md`/`SETUP.md` rewritten for the
   two-process local app; `job_search_csv.py`, `job_tracker.csv`,
   `search_log.csv`, and the old root `requirements.txt` removed after the
   new app was confirmed working in-browser.

Full historical design rationale (why SQLite over CSV, why polling over
SSE, alternatives considered for each decision) lived in the planning
conversation that produced this file — this doc captures the resulting
decisions, not the deliberation.
