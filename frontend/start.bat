@echo off
title FinTrack Frontend Server (Port 3000)
cd /d "%~dp0"
echo Starting FinTrack Frontend on http://localhost:3000...
call npm.cmd run dev
pause
