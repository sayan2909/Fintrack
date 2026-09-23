@echo off
title FinTrack Frontend Development Server (Port 3000)
cd /d "%~dp0"
echo Starting FinTrack Frontend in dev mode on http://localhost:3000...
call npm.cmd run dev
pause
