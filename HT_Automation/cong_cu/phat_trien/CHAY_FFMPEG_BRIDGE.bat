@echo off
title FFmpeg Bridge Server — HT_Automation
for %%I in ("%~dp0..\..") do set "HT_ROOT=%%~fI"
cd /d "%HT_ROOT%"
echo =====================================================================
echo    KHOI DONG FFMPEG BRIDGE SERVER CHO PREMIERE PRO HT_AUTOMATION
echo =====================================================================
echo.
powershell -ExecutionPolicy Bypass -File "%HT_ROOT%\bin\ffmpeg_bridge_server.ps1"
pause
