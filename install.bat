@echo off
rem Installs (or updates) the application on this computer.
rem Double-click this file: it asks once for administrator rights, then
rem runs install.ps1 in this same window. Details are saved in install-log.txt.
title Installation - Reservations
cd /d "%~dp0"

rem Already administrator? (net session only works as administrator)
set "INSTALL_BAT=%~f0"
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Demande des droits administrateur...
  powershell.exe -NoProfile -Command "try { Start-Process -FilePath $env:ComSpec -ArgumentList '/c', ('\"' + $env:INSTALL_BAT + '\"') -Verb RunAs } catch { exit 1 }"
  if errorlevel 1 (
    echo.
    echo Installation annulee : il faut cliquer sur "Oui" quand Windows demande l'autorisation.
    pause
  )
  exit /b
)

rem Windows PowerShell 5.1 is part of every Windows 10/11 (PowerShell 7 is optional).
rem -ExecutionPolicy Bypass: Windows blocks .ps1 scripts by default.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" %*
echo.
pause
