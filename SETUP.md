# Setup — Job Hunter

This app has two parts that both need to be running at once: the FastAPI
backend (does the scraping, owns the database) and the Next.js frontend
(the UI you actually use).

## 1. Get the folder

Copy this whole repo onto your computer — the folder structure (`backend/`,
`frontend/`) matters.

## 2. Prerequisites

- Python 3.10+ (`python3 --version` on Mac, `python --version` on Windows;
  otherwise get it from python.org)
- Node.js 20.9+ (`node --version` to check; otherwise get it from
  nodejs.org)

The start scripts check both versions up front and stop with a message
telling you what to install if either is too old. They also catch the case
where `backend/venv` was created with an old Python before you upgraded —
if you see that message, delete the `backend/venv` folder and re-run the
script to rebuild it.

## 3. Run it

- **Mac**: double-click `start.command` in Finder (it just runs
  `start.sh`). First double-click may show a "cannot be opened because it
  is from an unidentified developer" warning — right-click it and choose
  **Open** instead to bypass this one-time check.
- **Windows**: double-click `start.bat`. This opens two console windows, one
  for the backend and one for the frontend — close both to stop the app.
- **Terminal** (Mac/Linux): `./start.sh`, Ctrl+C stops both.

Whichever you use, the first run creates the backend virtualenv, installs
`backend/requirements.txt`, and runs `npm install` for the frontend
automatically; every run after that skips straight to starting both
servers. The script starts the backend first, waits for it to finish
initializing (creating/migrating the database), then starts the frontend —
so the "Waiting for the backend to finish starting..." pause is normal.

On Mac the script opens http://localhost:3000 in your browser once the app
is ready; on Windows, open it yourself — that's the app. The backend
serves the API at http://localhost:8000 (its interactive docs are at
http://localhost:8000/docs if you want to poke at the API directly).

First launch creates `backend/app/jobhunter.db` (a SQLite file) and seeds it
with a starting set of job statuses, keyword filters, and one example search
combo — all editable from the Settings page afterward.

## 4. Manual setup (if you'd rather not use the script, or it fails)

```bash
# Backend
cd backend
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend, in a second terminal
cd frontend
npm install
```

Then, in two terminals left running:

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

## 5. Point your editor at the right Python interpreter (optional)

In VS Code: Cmd/Ctrl+Shift+P → "Python: Select Interpreter" → pick
`./backend/venv/bin/python`.
