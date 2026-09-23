@echo off
title FinTrack Development Server Launcher
cd /d "%~dp0"
echo ====================================================
echo  Launching FinTrack Backend and Frontend...
echo  - Backend:  http://localhost:5000
echo  - Frontend: http://localhost:5173
echo ====================================================

start "FinTrack Backend (:5000)" cmd /k "cd /d "%~dp0backend" && npm run dev"
start "FinTrack Frontend (:5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo Servers launched in separate windows!
