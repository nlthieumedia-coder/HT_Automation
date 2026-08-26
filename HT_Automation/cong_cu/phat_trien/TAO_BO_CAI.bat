@echo off
setlocal
title Tao bo cai HT_Automation
for %%I in ("%~dp0..\..") do set "HT_ROOT=%%~fI"
cd /d "%HT_ROOT%"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%HT_ROOT%\build_release.ps1"
if errorlevel 1 (
    echo.
    echo TAO BO CAI THAT BAI. Xem thong bao loi phia tren.
    pause
    exit /b 1
)

echo.
echo Nhan phim bat ky de mo thu muc dist...
pause >nul
explorer.exe "%HT_ROOT%\dist"
endlocal
