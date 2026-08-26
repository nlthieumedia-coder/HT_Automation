@echo off
setlocal
title Sua chua HT_Automation
cd /d "%~dp0"
echo Dang kiem tra va cai dat lai toan bo thanh phan HT_Automation...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer\install.ps1" -PackageRoot "%~dp0." -Repair
set "HT_EXIT=%ERRORLEVEL%"
echo.
if not "%HT_EXIT%"=="0" echo Sua chua khong thanh cong. Ma loi: %HT_EXIT%
if "%HT_EXIT%"=="0" echo Sua chua HT_Automation thanh cong.
pause
exit /b %HT_EXIT%
