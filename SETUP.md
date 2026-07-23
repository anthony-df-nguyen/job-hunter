# Setup — Job Hunter

This app has two parts that both need to be running at once: the FastAPI
backend (does the scraping, owns the database) and the Next.js frontend
(the UI you actually use). Each needs its own one-time setup.

## 1. Get the folder

Copy this whole repo onto your computer — the folder structure (`backend/`,
`frontend/`) matters.

## 2. Backend setup

Requires Python 3.10+ (`python3 --version` to check; otherwise get it from
python.org).

```bash
cd backend
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

You'll see `(venv)` in your terminal prompt once the virtual env is active —
that keeps this project's Python packages isolated from everything else on
your machine.

## 3. Frontend setup

Requires Node.js 18+ (`node --version` to check; otherwise get it from
nodejs.org).

```bash
cd frontend
npm install
```

## 4. Run it

Two terminals, both left running:

```bash
# Terminal 1
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

```bash
# Terminal 2
cd frontend
npm run dev
```

Open http://localhost:3000 — that's the app. The backend serves the API at
http://localhost:8000 (its interactive docs are at
http://localhost:8000/docs if you want to poke at the API directly).

First launch creates `backend/app/jobhunter.db` (a SQLite file) and seeds it
with a starting set of job statuses, keyword filters, and one example search
combo — all editable from the Settings page afterward.

## 5. Point your editor at the right Python interpreter (optional)

In VS Code: Cmd/Ctrl+Shift+P → "Python: Select Interpreter" → pick
`./backend/venv/bin/python`.
