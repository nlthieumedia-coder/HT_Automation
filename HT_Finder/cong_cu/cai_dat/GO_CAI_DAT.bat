@echo off
setlocal
chcp 65001 >nul
title Go cai dat HT_Finder
for %%I in ("%~dp0..\..") do set "HT_ROOT=%%~fI"
net session >nul 2>&1
if not "%ERRORLEVEL%"=="0" (
  powershell.exe -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b %ERRORLEVEL%
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%HT_ROOT%\installer\uninstall.ps1"
if errorlevel 1 pause
