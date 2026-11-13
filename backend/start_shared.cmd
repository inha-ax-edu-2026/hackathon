@echo off
chcp 65001 >nul
cd /d "%~dp0"
set PYTHONUTF8=1
if exist ".venv\Scripts\python.exe" (
  ".venv\Scripts\python.exe" run_shared.py %*
) else (
  python run_shared.py %*
)
set shared_exit_code=%errorlevel%
if not "%shared_exit_code%"=="0" pause
exit /b %shared_exit_code%
