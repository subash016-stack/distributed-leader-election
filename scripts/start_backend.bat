@echo off
echo ============================================================
echo Starting Distributed Leader Election - FastAPI Backend
echo ============================================================

cd /d "%~dp0..\backend"

if exist "..\.venv\Scripts\python.exe" (
    echo Activating Python virtual environment...
    set "PYTHON_EXE=..\.venv\Scripts\python.exe"
) else (
    set "PYTHON_EXE=python"
)

echo Running backend server on http://127.0.0.1:8000
"%PYTHON_EXE%" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
