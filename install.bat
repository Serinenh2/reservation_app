@echo off
rem Installs (or updates) the application on this computer.
rem Double-click this file. See install.ps1 for the details.
title Installation - Reservations
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" %*
echo.
pause
