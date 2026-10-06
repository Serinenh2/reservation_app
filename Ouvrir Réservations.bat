@echo off
rem Starts the application and opens it in the browser.
rem Double-click this file. It works wherever the project folder is.
title Reservations
cd /d "%~dp0"

if not exist ".env" (
  echo ERREUR : fichier .env introuvable. Voir le README, etape 2.
  pause
  exit /b 1
)

docker info >nul 2>&1 || (
  echo Demarrage de Docker Desktop, patientez...
  start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
)
set /a TRIES=0
:wait_docker
docker info >nul 2>&1 && goto docker_ready
set /a TRIES+=1
if %TRIES% geq 60 goto docker_failed
timeout /t 3 /nobreak >nul
goto wait_docker

:docker_ready
echo Demarrage de l'application...
docker compose up -d --wait
if errorlevel 1 (
  echo.
  echo ERREUR : l'application n'a pas demarre. Details : docker compose logs backend
  pause
  exit /b 1
)
start "" http://localhost:3000
exit /b 0

:docker_failed
echo.
echo ERREUR : Docker ne demarre pas. Ouvrez Docker Desktop a la main, puis relancez ce fichier.
pause
exit /b 1
