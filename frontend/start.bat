@echo off
title FinTrack Frontend Production Server (Port 3000)
cd /d "%~dp0"
echo Starting FinTrack Frontend Production Preview on http://localhost:3000...
call npm.cmd run start
pause
