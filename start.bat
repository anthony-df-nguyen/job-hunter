@echo off
setlocal
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo python is required - get it from python.org
  pause
  exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
  echo node is required - get it from nodejs.org
  pause
  exit /b 1
)

if not exist "backend\venv" (
  echo ==^> Setting up backend ^(first run only^)...
  python -m venv backend\venv
  backend\venv\Scripts\pip install -q -r backend\requirements.txt
)

if not exist "frontend\node_modules" (
  echo ==^> Setting up frontend ^(first run only^)...
  pushd frontend
  call npm install
  popd
)

echo ==^> Starting Job Hunter - http://localhost:3000
echo Two windows will open for the backend and frontend - close both to stop.
start "Job Hunter Backend" cmd /k "cd backend && venv\Scripts\uvicorn app.main:app --reload"
start "Job Hunter Frontend" cmd /k "cd frontend && npm run dev"
