@echo off
chcp 65001 >nul
set "SCRIPT_DIR=%~dp0"
net session >nul 2>&1
if not "%errorlevel%"=="0" (
  powershell.exe -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%..\..\installer\install.ps1"
if errorlevel 1 (echo. & echo Cai dat that bai. & pause & exit /b 1)
