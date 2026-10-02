@echo off
title Lernpfad BTA
cd /d "%~dp0"
where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js wurde nicht gefunden. Bitte zuerst Node.js installieren: https://nodejs.org
  pause
  exit /b 1
)
if not exist node_modules (
  echo Pakete werden installiert ... das dauert beim ersten Mal etwas.
  call npm install
)
echo Lernpfad startet ... (Fenster offen lassen, zum Beenden einfach schliessen)
call npm run dev -- --open
