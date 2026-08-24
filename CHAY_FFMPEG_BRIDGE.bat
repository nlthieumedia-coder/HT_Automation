@echo off
title FFmpeg Bridge Server — HT_Automation
cd /d "%~dp0"
echo =====================================================================
echo    KHOI DONG FFMPEG BRIDGE SERVER CHO PREMIERE PRO HT_AUTOMATION
echo =====================================================================
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0bin\ffmpeg_bridge_server.ps1"
pause
