@echo off
setlocal
title Cai dat HT_Automation
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer\install.ps1" -PackageRoot "%~dp0."
set "HT_EXIT=%ERRORLEVEL%"
if not "%HT_EXIT%"=="0" (
  echo.
  echo Cai dat khong thanh cong. Ma loi: %HT_EXIT%
  pause
)
exit /b %HT_EXIT%
