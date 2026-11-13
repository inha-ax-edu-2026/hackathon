@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" -u run_local.py
) else (
    python -u run_local.py
)
if errorlevel 1 pause
endlocal
