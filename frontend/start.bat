@echo off
title FinTrack Frontend Server (Port 3000)
cd /d "%~dp0"
echo Starting FinTrack Frontend Server on http://localhost:3000...
call npx.cmd next start -p 3000
pause
