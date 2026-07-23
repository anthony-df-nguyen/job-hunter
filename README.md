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

Requires Python 3.10+ and Node.js 18+ installed.

- **Python**: [python.org/downloads](https://www.python.org/downloads/)
  (Windows/Mac installers). Windows users can also run
  `winget install --id Python.Python.3.10 -e` from a terminal; Mac users
  with [Homebrew](https://brew.sh) can run `brew install python@3.10`.
- **Node.js**: [nodejs.org](https://nodejs.org/en/download) — grab the LTS
  build. Windows: `winget install --id OpenJS.NodeJS.LTS -e`. Mac with
  Homebrew: `brew install node`.

- **Mac**: double-click `start.command` in Finder.
- **Windows**: double-click `start.bat`.
- **Terminal** (either OS): `./start.sh`

First run installs backend/frontend dependencies automatically; every run
after that just starts both servers. Then open http://localhost:3000.

(Mac only: the first double-click of `start.command` may trigger a "cannot
be opened because it is from an unidentified developer" warning — right-click
it and choose **Open** instead to bypass this one-time check.)

See [`SETUP.md`](SETUP.md) if you'd rather set things up manually or hit an
issue with the script.
