@echo off
chcp 65001 >nul
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\..\build_release.ps1"
if errorlevel 1 (echo. & echo Dong goi that bai. & pause & exit /b 1)
pause
