@echo off
setlocal
title Go cai dat HT_Automation
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer\uninstall.ps1"
set "HT_EXIT=%ERRORLEVEL%"
echo.
if not "%HT_EXIT%"=="0" (
  echo Go cai dat khong thanh cong. Ma loi: %HT_EXIT%
) else (
  echo HT_Automation da duoc go khoi may.
)
pause
exit /b %HT_EXIT%
