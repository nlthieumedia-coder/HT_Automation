@echo off
chcp 65001 >nul
set "SCRIPT_DIR=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%..\..\installer\install.ps1"
if errorlevel 1 (echo. & echo Cai dat that bai. & pause & exit /b 1)
