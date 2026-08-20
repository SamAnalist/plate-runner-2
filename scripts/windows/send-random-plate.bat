@echo off
setlocal enabledelayedexpansion

echo ================================================================
echo   Plate Runner - Send Random Plate
echo ================================================================
echo.
echo Sends a random plate (and random vehicle type/color unless you
echo pick one) to a paired Display as a Controller.
echo.
echo Leave a field blank to use the value saved in pairing-result.json
echo by pair-controller.bat (API Base URL / API Key / Controller Token /
echo Display ID) — you'll only be prompted here if that file is missing.
echo ================================================================
echo.

set /p API_BASE_URL="API Base URL (blank = use pairing-result.json): "
set /p API_KEY="API Key (blank = use pairing-result.json): "
set /p CONTROLLER_TOKEN="Controller Token (blank = use pairing-result.json): "
set /p DISPLAY_ID="Display ID (blank = use pairing-result.json): "

set "WAIT_FLAG="
set /p WAIT_ANSWER="Wait for signal at the gate before opening it? [y/N]: "
if /i "%WAIT_ANSWER%"=="y" set "WAIT_FLAG=-WaitForSignal"
if /i "%WAIT_ANSWER%"=="yes" set "WAIT_FLAG=-WaitForSignal"

set "SCRIPT_DIR=%~dp0"

if not exist "%SCRIPT_DIR%send-random-plate.ps1" (
  echo.
  echo ERROR: send-random-plate.ps1 not found next to this .bat file.
  echo Both files must stay together in scripts\windows\.
  pause
  exit /b 1
)

echo.
echo Sending...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%send-random-plate.ps1" -ApiBaseUrl "%API_BASE_URL%" -ApiKey "%API_KEY%" -ControllerToken "%CONTROLLER_TOKEN%" -DisplayId "%DISPLAY_ID%" %WAIT_FLAG%
set "EXIT_CODE=%ERRORLEVEL%"

echo.
pause
exit /b %EXIT_CODE%
