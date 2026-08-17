@echo off
setlocal enabledelayedexpansion

echo ================================================================
echo   Plate Runner - Controller Pairing Wizard
echo ================================================================
echo.
echo This pairs THIS PC as a Controller for a Plate Runner Display.
echo You will need:
echo   1. The API Base URL and API Key of the backend both this PC
echo      and the Display are talking to.
echo   2. A pairing code generated FROM THE DISPLAY'S OWN SCREEN
echo      (Display Mode -^> Pairing -^> Generate Pairing Code).
echo      Codes expire after 5 minutes.
echo.
echo After you enter the code below, this script waits for the
echo Display to approve the request on its own screen, then
echo finalizes the pairing and prints/saves the Controller Token.
echo ================================================================
echo.

set /p API_BASE_URL="API Base URL [http://localhost:8787]: "
if "%API_BASE_URL%"=="" set "API_BASE_URL=http://localhost:8787"

set /p API_KEY="API Key: "
if "%API_KEY%"=="" (
  echo.
  echo ERROR: API Key is required.
  pause
  exit /b 1
)

set /p CONTROLLER_NAME="Controller name [%COMPUTERNAME%]: "
if "%CONTROLLER_NAME%"=="" set "CONTROLLER_NAME=%COMPUTERNAME%"

set /p PAIRING_CODE="Pairing code from the Display's screen: "
if "%PAIRING_CODE%"=="" (
  echo.
  echo ERROR: Pairing code is required.
  pause
  exit /b 1
)

set "SCRIPT_DIR=%~dp0"

if not exist "%SCRIPT_DIR%pair-controller.ps1" (
  echo.
  echo ERROR: pair-controller.ps1 not found next to this .bat file.
  echo Both files must stay together in the project root.
  pause
  exit /b 1
)

echo.
echo Requesting pairing...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%pair-controller.ps1" -ApiBaseUrl "%API_BASE_URL%" -ApiKey "%API_KEY%" -ControllerName "%CONTROLLER_NAME%" -PairingCode "%PAIRING_CODE%"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
pause
exit /b %EXIT_CODE%
