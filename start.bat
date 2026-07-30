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

rem Minimum versions: python-jobspy needs Python 3.10+, Next.js 16 needs Node 20.9+.
python -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>nul
if errorlevel 1 (
  for /f "tokens=2" %%v in ('python -V 2^>^&1') do echo python is %%v, but Python 3.10 or newer is required - get it from python.org
  pause
  exit /b 1
)
node -e "const [a,b]=process.versions.node.split('.').map(Number); process.exit(a>20||(a===20&&b>=9)?0:1)" >nul 2>nul
if errorlevel 1 (
  for /f %%v in ('node --version') do echo node is %%v, but Node 20.9 or newer is required - get it from nodejs.org
  pause
  exit /b 1
)

rem A venv created with an old Python stays broken even after Python is upgraded.
if exist "backend\venv" (
  backend\venv\Scripts\python -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>nul
  if errorlevel 1 (
    echo The existing backend\venv was created with an old Python.
    echo Delete the backend\venv folder and re-run this script to rebuild it.
    pause
    exit /b 1
  )
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

rem The backend creates/migrates the schema and seeds defaults during startup,
rem before it answers requests - so once /health responds, seeding is done and
rem the frontend can start.
echo ==^> Waiting for the backend to finish starting...
:wait_backend
curl -s -o nul http://localhost:8000/health >nul 2>nul
if errorlevel 1 (
  timeout /t 1 /nobreak >nul
  goto wait_backend
)

start "Job Hunter Frontend" cmd /k "cd frontend && npm run dev"
