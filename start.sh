#!/bin/bash
# One-command setup + launch: creates the backend venv / installs deps on
# first run (skipped on later runs once venv/ and node_modules/ exist), then
# starts both servers. Ctrl+C stops both.
set -e
cd "$(dirname "$0")"

command -v python3 >/dev/null 2>&1 || { echo "python3 is required — get it from python.org"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "node is required — get it from nodejs.org"; exit 1; }

if [ ! -d "backend/venv" ]; then
  echo "==> Setting up backend (first run only)..."
  python3 -m venv backend/venv
  backend/venv/bin/pip install -q -r backend/requirements.txt
fi

if [ ! -d "frontend/node_modules" ]; then
  echo "==> Setting up frontend (first run only)..."
  (cd frontend && npm install)
fi

echo "==> Starting Job Hunter — http://localhost:3000"
trap 'kill $(jobs -p) 2>/dev/null' EXIT

(cd backend && venv/bin/uvicorn app.main:app --reload) &
(cd frontend && npm run dev) &

( until curl -s -o /dev/null http://localhost:3000; do sleep 0.5; done
  open http://localhost:3000 ) &

wait
