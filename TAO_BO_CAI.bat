@echo off
setlocal
title Tao bo cai HT_Automation
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0build_release.ps1"
if errorlevel 1 (
    echo.
    echo TAO BO CAI THAT BAI. Xem thong bao loi phia tren.
    pause
    exit /b 1
)

echo.
echo Nhan phim bat ky de mo thu muc dist...
pause >nul
explorer.exe "%~dp0dist"
endlocal
