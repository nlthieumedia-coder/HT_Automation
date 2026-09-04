@echo off
setlocal
title Cap nhat HT_Automation
for %%I in ("%~dp0..\..") do set "HT_ROOT=%%~fI"
cd /d "%HT_ROOT%"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%HT_ROOT%\installer\run_action.ps1" -PackageRoot "%HT_ROOT%" -Action UpdateLocal
set "HT_EXIT=%ERRORLEVEL%"
echo.
if not "%HT_EXIT%"=="0" echo Cap nhat khong thanh cong. Ma loi: %HT_EXIT%
if "%HT_EXIT%"=="0" echo Kiem tra va cap nhat HT_Automation hoan tat.
echo Nhat ky nam trong: %TEMP%\HT_Automation_Logs
pause
exit /b %HT_EXIT%
