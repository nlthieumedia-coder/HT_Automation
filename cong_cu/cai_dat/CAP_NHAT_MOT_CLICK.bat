@echo off
setlocal
title Cap nhat HT_Automation
for %%I in ("%~dp0..\..") do set "HT_ROOT=%%~fI"
cd /d "%HT_ROOT%"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%HT_ROOT%\installer\update.ps1"
set "HT_EXIT=%ERRORLEVEL%"
echo.
if not "%HT_EXIT%"=="0" echo Cap nhat khong thanh cong. Ma loi: %HT_EXIT%
if "%HT_EXIT%"=="0" echo Kiem tra va cap nhat HT_Automation hoan tat.
pause
exit /b %HT_EXIT%
