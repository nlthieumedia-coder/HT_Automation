@echo off
chcp 65001 >nul
title Cap nhat HT_BinBuilder
set "SCRIPT_DIR=%~dp0"
net session >nul 2>&1
if not "%errorlevel%"=="0" (
  powershell.exe -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%..\..\installer\update.ps1"
set "HT_EXIT=%ERRORLEVEL%"
echo.
if not "%HT_EXIT%"=="0" echo Cap nhat khong thanh cong. Ma loi: %HT_EXIT%
if "%HT_EXIT%"=="0" echo Kiem tra va cap nhat HT_BinBuilder hoan tat.
pause
exit /b %HT_EXIT%
