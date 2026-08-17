<#
.SYNOPSIS
  Pairs this PC as a Plate Runner Controller against a running backend.

.DESCRIPTION
  Walks the full controller pairing handshake against the Plate Runner
  API (see docs/PAIRING_SPEC.md / docs/BACKEND_API_SPEC.md):
    1. POST /api/controllers/pair                        (submit the code)
    2. GET  /api/controllers/pairing-requests/:id         (poll until the Display approves)
    3. POST /api/controllers/pairing-requests/:id/finalize (exchange for a controllerToken)

  The pairing CODE itself must be generated on the DISPLAY's own screen
  first (Display Mode -> Pairing -> Generate Pairing Code) and typed in
  here. This script does not (and cannot) generate that code itself.

  Called by pair-controller.bat, which just prompts for the parameters
  below and hands off to this script — run this directly if you'd rather
  skip the prompts.

.EXAMPLE
  .\pair-controller.ps1 -ApiBaseUrl "https://plate-runner-server-production.up.railway.app" `
                         -ApiKey "xxxxxxxx" -ControllerName "Front Desk PC" -PairingCode "482913"
#>
param(
    [Parameter(Mandatory = $true)] [string] $ApiBaseUrl,
    [Parameter(Mandatory = $true)] [string] $ApiKey,
    [Parameter(Mandatory = $true)] [string] $ControllerName,
    [Parameter(Mandatory = $true)] [string] $PairingCode,
    [int] $PollIntervalSeconds = 2,
    [int] $MaxPollAttempts = 180  # 180 x 2s = 6 minutes — a bit longer than the code's own 5-minute TTL
)

$ErrorActionPreference = 'Stop'
$ApiBaseUrl = $ApiBaseUrl.TrimEnd('/')
$headers = @{ 'x-api-key' = $ApiKey; 'Content-Type' = 'application/json' }

function Fail([string]$Message) {
    Write-Host ''
    Write-Host "ERROR: $Message" -ForegroundColor Red
    exit 1
}

function Invoke-Api {
    param([string]$Method, [string]$Path, [hashtable]$Body)
    try {
        if ($Body) {
            $json = $Body | ConvertTo-Json
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

# ── Step 1: submit the pairing code ─────────────────────────────────────────
Write-Host "Requesting pairing against $ApiBaseUrl ..."
$pairResp = Invoke-Api -Method Post -Path '/api/controllers/pair' -Body @{
    controllerName = $ControllerName
    code           = $PairingCode
}
if (-not $pairResp.ok) { Fail "Pairing request rejected - $($pairResp.error)" }

$reqId       = $pairResp.pairingRequestId
$displayId   = $pairResp.displayId
$displayName = $pairResp.displayName

Write-Host ''
Write-Host "Pairing request created for display '$displayName' ($displayId)."
Write-Host "Expires at: $($pairResp.expiresAt)"
Write-Host ''
Write-Host 'Waiting for the Display to approve this request on its own screen...'

# ── Step 2: poll until the Display approves/rejects/it expires ─────────────
$status = 'approval_pending'
$attempts = 0
while ($status -eq 'approval_pending') {
    if ($attempts -ge $MaxPollAttempts) {
        Fail 'Timed out waiting for approval. Ask the Display to generate a fresh code and try again.'
    }
    Start-Sleep -Seconds $PollIntervalSeconds
    $attempts++
    $poll = Invoke-Api -Method Get -Path "/api/controllers/pairing-requests/$reqId"
    $status = $poll.status
    Write-Host "  [$attempts] status: $status"
}

if ($status -ne 'approved') {
    Fail "Pairing did not complete (final status: $status). Ask for a fresh code and try again."
}

# ── Step 3: finalize — this is the ONLY moment the plaintext token is shown ─
Write-Host ''
Write-Host 'Approved! Finalizing...'
$final = Invoke-Api -Method Post -Path "/api/controllers/pairing-requests/$reqId/finalize"
if (-not $final.ok) { Fail "Finalize rejected - $($final.error)" }

Write-Host ''
Write-Host '=== Pairing complete ===' -ForegroundColor Green
Write-Host "Display Name:     $displayName"
Write-Host "Display ID:       $($final.displayId)"
Write-Host "Controller ID:    $($final.controllerId)"
Write-Host "Controller Token: $($final.controllerToken)"
Write-Host ''
Write-Host 'IMPORTANT: save the Controller Token now - it is shown only this once.' -ForegroundColor Yellow
Write-Host 'Treat it like a password: whoever holds it can send commands to this display.'

$resultPath = Join-Path $PSScriptRoot 'pairing-result.json'
[ordered]@{
    displayId       = $final.displayId
    displayName     = $displayName
    controllerId    = $final.controllerId
    controllerToken = $final.controllerToken
    apiBaseUrl      = $ApiBaseUrl
    pairedAt        = (Get-Date).ToString('o')
} | ConvertTo-Json | Out-File -FilePath $resultPath -Encoding utf8

Write-Host ''
Write-Host "Also saved to: $resultPath"
Write-Host "(delete that file once you've copied the token somewhere safe - it's a secret, same as an API key)"
