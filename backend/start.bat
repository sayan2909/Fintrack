@echo off
title FinTrack Backend Server (Port 5000)
cd /d "%~dp0"
echo Starting FinTrack Backend Server on http://localhost:5000...
call npx.cmd next start -p 5000
pause
