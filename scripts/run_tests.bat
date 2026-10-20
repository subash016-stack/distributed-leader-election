@echo off
echo ============================================================
echo Running Distributed Leader Election Automated Test Suite
echo ============================================================

cd /d "%~dp0..\backend"

if exist "..\.venv\Scripts\pytest.exe" (
    set "PYTEST_EXE=..\.venv\Scripts\pytest.exe"
) else (
    set "PYTEST_EXE=pytest"
)

echo Executing pytest test cases...
"%PYTEST_EXE%" tests -v
pause
