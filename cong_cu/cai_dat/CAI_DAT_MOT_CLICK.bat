@echo off
setlocal
title Cai dat HT_Automation
for %%I in ("%~dp0..\..") do set "HT_ROOT=%%~fI"
cd /d "%HT_ROOT%"
net session >nul 2>&1
if not "%ERRORLEVEL%"=="0" (
  powershell.exe -NoProfile -Command "Start-Process powershell.exe -Verb RunAs -Wait -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File ""%HT_ROOT%\installer\install.ps1"" -PackageRoot ""%HT_ROOT%""'"
  exit /b %ERRORLEVEL%
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%HT_ROOT%\installer\install.ps1" -PackageRoot "%HT_ROOT%"
set "HT_EXIT=%ERRORLEVEL%"
if not "%HT_EXIT%"=="0" (
  echo.
  echo Cai dat khong thanh cong. Ma loi: %HT_EXIT%
  pause
)
exit /b %HT_EXIT%
