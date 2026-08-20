<#
.SYNOPSIS
  Sends a random plate to a paired Plate Runner Display as a Controller.

.DESCRIPTION
  Generates a random plate (uppercase A-Z0-9, 6-8 chars unless -PlateLength
  is given), a random vehicle color (blue/red/gray unless -VehicleColor is
  given), and a random vehicle type (sedan/suv unless -VehicleType is
  given), then sends it via POST /api/remote/displays/:displayId/simulate.

  If -WaitForSignal is passed, the gate is set to wait_for_signal — the
  script then blocks until you press Enter (watch the Display/Camera Mode
  screen yourself; there is no API endpoint that reports live simulation
  phase) before sending POST /api/remote/displays/:displayId/open-gate.

  Called by send-random-plate.bat, which just prompts for the parameters
  below and hands off to this script — run this directly if you'd rather
  skip the prompts.

  Every /api/remote/... call needs BOTH the API key (same one used to
  pair) and the controller token — a missing/wrong API key and a
  missing/wrong controller token both come back from the server as the
  same generic "unauthorized" error, so double check both if you hit it.

.EXAMPLE
  .\send-random-plate.ps1 -ApiBaseUrl "https://plate-runner-server-production.up.railway.app" `
                           -ApiKey "xxxxxxxx" -ControllerToken "yyyyyyyy" -DisplayId "zzzz" -WaitForSignal
#>
param(
    [string] $ApiBaseUrl,
    [string] $ApiKey,
    [string] $ControllerToken,
    [string] $DisplayId,
    [switch] $WaitForSignal,
    [ValidateRange(1, 12)] [int] $PlateLength = 0,   # 0 = pick randomly between 6-8
    [ValidateSet('incoming', 'away')] [string] $Direction = 'incoming',
    [ValidateSet('driver_front', 'center_front', 'passenger_front', 'driver_back', 'center_back', 'passenger_back')]
    [string] $DetectorPlacement = 'center_front',
    [ValidateSet('blue', 'red', 'gray', '')] [string] $VehicleColor = '',   # '' = random
    [ValidateSet('sedan', 'suv', '')] [string] $VehicleType = ''            # '' = random
)

$ErrorActionPreference = 'Stop'

function Fail([string]$Message) {
    Write-Host ''
    Write-Host "ERROR: $Message" -ForegroundColor Red
    exit 1
}

# pairing-result.json always lives at the project root, regardless of where
# this script itself lives (scripts/windows/) — two levels up.
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$pairingResultPath = Join-Path $projectRoot 'pairing-result.json'

if (Test-Path $pairingResultPath) {
    $pairingResult = Get-Content $pairingResultPath -Raw | ConvertFrom-Json
    if (-not $ApiBaseUrl)      { $ApiBaseUrl      = $pairingResult.apiBaseUrl }
    if (-not $ApiKey)          { $ApiKey          = $pairingResult.apiKey }
    if (-not $ControllerToken) { $ControllerToken = $pairingResult.controllerToken }
    if (-not $DisplayId)       { $DisplayId       = $pairingResult.displayId }
}

if (-not $ApiBaseUrl)      { $ApiBaseUrl = Read-Host 'API Base URL' }
if (-not $ApiBaseUrl)      { Fail 'API Base URL is required.' }
$ApiBaseUrl = $ApiBaseUrl.TrimEnd('/')

if (-not $ApiKey)          { $ApiKey = Read-Host 'API Key' }
if (-not $ApiKey)          { Fail 'API Key is required — every /api/remote/... call needs it in addition to the controller token.' }

if (-not $ControllerToken) { $ControllerToken = Read-Host 'Controller Token' }
if (-not $ControllerToken) { Fail 'Controller Token is required.' }

if (-not $DisplayId)       { $DisplayId = Read-Host 'Display ID' }
if (-not $DisplayId)       { Fail 'Display ID is required.' }

$frontPlacements = @('driver_front', 'center_front', 'passenger_front')
$backPlacements  = @('driver_back', 'center_back', 'passenger_back')
if ($Direction -eq 'incoming' -and $frontPlacements -notcontains $DetectorPlacement) {
    Fail "detectorPlacement '$DetectorPlacement' is not valid for direction 'incoming' (use driver_front|center_front|passenger_front)."
}
if ($Direction -eq 'away' -and $backPlacements -notcontains $DetectorPlacement) {
    Fail "detectorPlacement '$DetectorPlacement' is not valid for direction 'away' (use driver_back|center_back|passenger_back)."
}

if (-not $VehicleColor) {
    # Mirrors VEHICLE_COLORS in packages/shared/src/types/simulation.ts.
    $VehicleColor = @('blue', 'red', 'gray') | Get-Random
}

if (-not $VehicleType) {
    # Mirrors VEHICLE_TYPES in packages/shared/src/types/simulation.ts.
    $VehicleType = @('sedan', 'suv') | Get-Random
}

if ($PlateLength -eq 0) {
    $PlateLength = Get-Random -Minimum 6 -Maximum 9   # 6, 7, or 8
}

# Generates a random plate: A-Z0-9 only, uppercase, no separators — mirrors
# packages/shared/src/validators/plate.ts (PLATE_REGEX = /^[A-Z0-9]+$/, MAX_LENGTH = 12).
$chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
$plate = -join ((1..$PlateLength) | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
Write-Host "Generated plate: $plate"
Write-Host ''

if (-not $WaitForSignal) {
    $answer = Read-Host 'Wait for signal at the gate before opening it? [y/N]'
    if ($answer -match '^(y|yes)$') { $WaitForSignal = $true }
}

$gateMode = if ($WaitForSignal) { 'wait_for_signal' } else { 'auto_open' }

$headers = @{
    'x-api-key'          = $ApiKey
    'x-controller-token' = $ControllerToken
    'Content-Type'       = 'application/json'
}

function Invoke-Api {
    param([string]$Method, [string]$Path, [hashtable]$Body)
    try {
        if ($Body) {
            $json = $Body | ConvertTo-Json -Depth 10
            return Invoke-RestMethod -Uri "$ApiBaseUrl$Path" -Method $Method -Headers $headers -Body $json
        }
        return Invoke-RestMethod -Uri "$ApiBaseUrl$Path" -Method $Method -Headers $headers
    } catch {
        $msg = $_.Exception.Message
        if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
            try {
                $parsed = $_.ErrorDetails.Message | ConvertFrom-Json
                if ($parsed.error) { $msg = $parsed.error }
            } catch { }
        }
        Fail "$Method $Path failed - $msg"
    }
}

# Mirrors SimulationConfig/GateConfig/PlateQueueConfig shapes in packages/shared/src/types.
$body = @{
    plate             = $plate
    direction         = $Direction
    detectorPlacement = $DetectorPlacement
    vehicleColor      = $VehicleColor
    vehicleType       = $VehicleType
    gateConfig        = @{
        gateMode          = $gateMode
        gateInitialState  = 'closed'
        stopBeforeOpenMs  = 3000
        delayAfterOpenMs  = 1400
    }
    queueConfig       = @{
        mode                  = 'run_all'
        gapBetweenVehiclesMs  = 1500
        loop                  = $false
    }
    speedPreset       = 'slow'
}

Write-Host "Sending plate '$plate' (type=$VehicleType, color=$VehicleColor, direction=$Direction, placement=$DetectorPlacement, gateMode=$gateMode) to display $DisplayId ..."
$simulateResp = Invoke-Api -Method Post -Path "/api/remote/displays/$DisplayId/simulate" -Body $body
Write-Host "Command queued: $($simulateResp.commandId)"

if ($gateMode -eq 'wait_for_signal') {
    Write-Host ''
    Write-Host 'Gate is set to wait_for_signal — it will stay closed until you send open-gate.'
    Write-Host 'NOTE: the API has no live simulation-phase feed, so watch the Display/Camera'
    Write-Host 'Mode screen yourself and only continue once the vehicle is visibly stopped'
    Write-Host 'at the gate with the plate readable.'
    Write-Host ''
    Read-Host 'Press Enter to send the open-gate command (or Ctrl+C to abort without opening)'

    Write-Host 'Sending open-gate command...'
    $openResp = Invoke-Api -Method Post -Path "/api/remote/displays/$DisplayId/open-gate"
    Write-Host "Open-gate command queued: $($openResp.commandId)"
}

Write-Host ''
Write-Host 'Done.' -ForegroundColor Green
