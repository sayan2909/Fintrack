@echo off
title FinTrack Backend Server (Port 5000)
cd /d "%~dp0"
echo Starting FinTrack Backend Server on http://localhost:5000...
call npm.cmd run start
pause
