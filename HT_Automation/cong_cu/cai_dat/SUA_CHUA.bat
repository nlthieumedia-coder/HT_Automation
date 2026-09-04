@echo off
setlocal
title Sua chua HT_Automation
for %%I in ("%~dp0..\..") do set "HT_ROOT=%%~fI"
cd /d "%HT_ROOT%"
echo Dang kiem tra va cai dat lai toan bo thanh phan HT_Automation...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%HT_ROOT%\installer\run_action.ps1" -PackageRoot "%HT_ROOT%" -Action Repair
set "HT_EXIT=%ERRORLEVEL%"
echo.
if not "%HT_EXIT%"=="0" echo Sua chua khong thanh cong. Ma loi: %HT_EXIT%
if "%HT_EXIT%"=="0" echo Sua chua HT_Automation thanh cong.
echo Nhat ky nam trong: %TEMP%\HT_Automation_Logs
pause
exit /b %HT_EXIT%
