# Job Hunter

A locally-run job search app. It uses [JobSpy](https://github.com/speedyapply/JobSpy)
to scrape LinkedIn and Indeed, filters results against your own criteria, and
tracks everything in a table you edit as you work through applications (mark
things Applied, Interviewing, Pass, etc.). No deployed backend, no hosted
database — clone the repo and run it on your own machine.

See [`CLAUDE.md`](CLAUDE.md) for the full architecture writeup (data model,
API endpoints, and how the scraper works).

## What it does

- **Search config is editable through the UI**, not Python constants: job
  titles, locations, which (title, location, remote) combos actually get
  searched, keyword filters (must-match / must-avoid / contract detection),
  job statuses, and the salary floor all live in Settings.
- **Run a search** from the Jobs page — a progress banner shows which search
  is currently running and a live count of new/filtered/already-seen jobs.
- **Track jobs in a sortable table** — click a job's title to open the
  listing, change its status inline, jot notes, all persisted to a local
  SQLite database.

## Architecture

Two local processes, no containers:

- **`backend/`** — FastAPI + SQLite. Owns the JobSpy scraping/filtering logic
  and all persistent state.
- **`frontend/`** — Next.js (App Router) + Tailwind + TypeScript. Talks to
  the backend over `http://localhost:8000`.

## Running it

See [`SETUP.md`](SETUP.md) for first-time setup. Quick version, in two
terminals:

```bash
# Terminal 1 — backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload

# Terminal 2 — frontend
cd frontend
npm run dev
```

Then open http://localhost:3000.
