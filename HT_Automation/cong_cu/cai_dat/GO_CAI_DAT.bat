@echo off
setlocal
title Go cai dat HT_Automation
for %%I in ("%~dp0..\..") do set "HT_ROOT=%%~fI"
cd /d "%HT_ROOT%"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%HT_ROOT%\installer\uninstall.ps1"
set "HT_EXIT=%ERRORLEVEL%"
echo.
if not "%HT_EXIT%"=="0" (
  echo Go cai dat khong thanh cong. Ma loi: %HT_EXIT%
) else (
  echo HT_Automation da duoc go khoi may.
)
pause
exit /b %HT_EXIT%
