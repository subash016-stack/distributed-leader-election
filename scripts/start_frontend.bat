@echo off
echo ============================================================
echo Starting Distributed Leader Election - React Dashboard
echo ============================================================

cd /d "%~dp0..\frontend"

echo Launching Vite development server on http://localhost:5173
npm run dev
pause
