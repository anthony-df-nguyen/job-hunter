#!/bin/bash
# One-command setup + launch: creates the backend venv / installs deps on
# first run (skipped on later runs once venv/ and node_modules/ exist), then
# starts both servers. Ctrl+C stops both.
set -e
cd "$(dirname "$0")"

# Minimum versions: python-jobspy needs Python 3.10+, Next.js 16 needs Node 20.9+.
PY_MIN="3.10"
NODE_MIN="20.9"

command -v python3 >/dev/null 2>&1 || { echo "python3 is required — get it from python.org"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "node is required — get it from nodejs.org"; exit 1; }

check_python() { # $1 = python executable, $2 = label
  "$1" -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)" 2>/dev/null || {
    echo "$2 is $("$1" -V 2>&1 | awk '{print $2}'), but Python $PY_MIN or newer is required."
    return 1
  }
}

check_python python3 "python3" || { echo "Install a newer Python from python.org, then re-run."; exit 1; }

node_ver=$(node --version); node_ver=${node_ver#v}
IFS=. read -r node_major node_minor _ <<<"$node_ver"
if [ "$node_major" -lt "${NODE_MIN%.*}" ] || { [ "$node_major" -eq "${NODE_MIN%.*}" ] && [ "$node_minor" -lt "${NODE_MIN#*.}" ]; }; then
  echo "node is v$node_ver, but Node $NODE_MIN or newer is required — get it from nodejs.org."
  exit 1
fi

# A venv created with an old Python stays broken even after Python is
# upgraded — detect that and tell the user how to fix it.
if [ -d "backend/venv" ] && ! check_python backend/venv/bin/python "the existing backend/venv"; then
  echo "It was created with an old Python. Delete the backend/venv folder and re-run this script to rebuild it."
  exit 1
fi

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

# Job control mode: each background job gets its own process group, so
# killing -PID takes down the whole tree (uvicorn's reloader child, next
# dev's node process), not just the top-level subshell.
set -m

cleanup() {
  trap - INT TERM EXIT
  kill -- -$BACKEND_PID ${FRONTEND_PID:+-$FRONTEND_PID} 2>/dev/null
  wait 2>/dev/null
}
trap cleanup INT TERM EXIT

(cd backend && venv/bin/uvicorn app.main:app --reload) &
BACKEND_PID=$!

# The backend creates/migrates the schema and seeds defaults during startup,
# before it answers requests — so once /health responds, seeding is done and
# the frontend can start.
echo "==> Waiting for the backend to finish starting..."
until curl -s -o /dev/null http://localhost:8000/health; do
  kill -0 $BACKEND_PID 2>/dev/null || { echo "Backend exited before becoming ready."; exit 1; }
  sleep 0.5
done

(cd frontend && npm run dev) &
FRONTEND_PID=$!

( until curl -s -o /dev/null http://localhost:3000; do sleep 0.5; done
  open http://localhost:3000 ) &

wait $BACKEND_PID $FRONTEND_PID
