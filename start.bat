@echo off
title FinTrack Production Server Launcher
cd /d "%~dp0"
echo ====================================================
echo  Launching FinTrack Production Servers...
echo  - Backend:  http://localhost:5000
echo  - Frontend: http://localhost:5173
echo ====================================================

start "FinTrack Backend (:5000)" cmd /k "cd /d "%~dp0backend" && npm run start"
start "FinTrack Frontend (:5173)" cmd /k "cd /d "%~dp0frontend" && npm run start"

echo Servers launched in separate windows!
