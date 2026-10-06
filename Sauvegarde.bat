@echo off
rem Saves the database AND the uploaded files (photos, ID documents)
rem into the "backups" folder of the project. Double-click this file.
title Sauvegarde
cd /d "%~dp0"

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
rem The application must be running for the copy (starts it if needed).
docker compose up -d --wait >nul 2>&1
if errorlevel 1 goto backup_failed

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm"') do set D=%%i

echo Sauvegarde de la base de donnees...
docker compose exec -T backend python -c "import sqlite3; s=sqlite3.connect('/app/data/db.sqlite3'); d=sqlite3.connect('/app/backups/sauvegarde_%D%.sqlite3'); s.backup(d); d.close(); s.close()"
if errorlevel 1 goto backup_failed

echo Sauvegarde des fichiers (photos, pieces d'identite)...
docker compose exec -T backend sh -c "if [ -d /app/data/media ]; then tar czf /app/backups/fichiers_%D%.tar.gz -C /app/data media; fi"
if errorlevel 1 goto backup_failed

echo.
echo Sauvegarde terminee :
echo   backups\sauvegarde_%D%.sqlite3
if exist "backups\fichiers_%D%.tar.gz" echo   backups\fichiers_%D%.tar.gz
echo.
echo Copiez ces fichiers sur une cle USB ou un disque externe.
pause
exit /b 0

:backup_failed
echo.
echo ERREUR : la sauvegarde a echoue. Verifiez que l'application fonctionne (Ouvrir Reservations.bat).
pause
exit /b 1

:docker_failed
echo.
echo ERREUR : Docker ne demarre pas. Ouvrez Docker Desktop a la main, puis relancez ce fichier.
pause
exit /b 1
