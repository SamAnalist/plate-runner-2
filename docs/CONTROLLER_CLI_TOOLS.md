# Controller CLI Tools

Command-line scripts to pair a machine as a Plate Runner Controller and send
commands to a paired Display, without opening the web UI. Useful for CI
pipelines and quick manual testing from a terminal.

All scripts live under `scripts/`, split by OS:

```txt
scripts/
  macos/
    pair-controller.sh
    send-random-plate.sh
  windows/
    pair-controller.bat
    pair-controller.ps1
    send-random-plate.bat
    send-random-plate.ps1
```

| Purpose | Windows | macOS/Linux |
|---|---|---|
| Pair this machine as a Controller | `scripts/windows/pair-controller.bat` (+ `.ps1`) | `scripts/macos/pair-controller.sh` |
| Send a random plate (optionally waiting for a gate signal) | `scripts/windows/send-random-plate.bat` (+ `.ps1`) | `scripts/macos/send-random-plate.sh` |

Every script talks directly to the backend API described in
[BACKEND_API_SPEC.md](BACKEND_API_SPEC.md), [PAIRING_SPEC.md](PAIRING_SPEC.md)
and [REMOTE_COMMANDS_SPEC.md](REMOTE_COMMANDS_SPEC.md). `pairing-result.json`
is always written to and read from the **project root** (not the `scripts/`
subfolder), regardless of which OS's script wrote it — the scripts resolve
this path relative to their own location.

## Requirements

- **macOS/Linux**: `curl` (preinstalled on macOS) and `jq` (`brew install jq`).
- **Windows**: PowerShell (preinstalled) — the `.bat` files just prompt for
  parameters and hand off to the matching `.ps1`; run the `.ps1` directly if
  you'd rather skip the prompts.

## 1. Pairing: `pair-controller.sh` / `pair-controller.bat`+`.ps1`

Walks the full controller pairing handshake:

1. `POST /api/controllers/pair` — submit the pairing code generated on the
   Display's own screen (Display Mode → Pairing → Generate Pairing Code).
   Codes expire after 5 minutes.
2. `GET /api/controllers/pairing-requests/:id` — polls every 2s (up to 6
   minutes) until the Display operator approves the request on the Display's
   screen.
3. `POST /api/controllers/pairing-requests/:id/finalize` — exchanges the
   approved request for a `controllerToken`.

### Usage

```bash
./scripts/macos/pair-controller.sh
```

Or non-interactively:

```bash
./scripts/macos/pair-controller.sh -u https://your-backend.example.com -k YOUR_API_KEY \
  -n "CI Runner" -c 123456
```

On Windows, double-click `scripts\windows\pair-controller.bat` (prompts for
everything) or run the PowerShell script directly:

```powershell
.\scripts\windows\pair-controller.ps1 -ApiBaseUrl "https://your-backend.example.com" `
  -ApiKey "YOUR_API_KEY" -ControllerName "CI Runner" -PairingCode "123456"
```

Flags/params: API base URL, API key, controller name, pairing code. Omitted
bash flags are prompted for interactively; the PowerShell params are all
`Mandatory` (the `.bat` wrapper prompts for them first).

### Output

On success, prints the `controllerToken` **once** (the backend never returns
it again) and saves it to `pairing-result.json` **at the project root**:

```json
{
  "displayId": "...",
  "displayName": "...",
  "controllerId": "...",
  "controllerToken": "...",
  "apiBaseUrl": "...",
  "apiKey": "...",
  "pairedAt": "2026-08-17T12:58:25Z"
}
```

`send-random-plate.*` reads this file automatically. Treat
`pairing-result.json` like a credentials file — it contains live secrets.
It's already covered by repo `.gitignore` conventions for secrets; double
check before committing anything from this directory.

### Does the `controllerToken` expire?

**It depends on the backend deployment's config — check
`PLATE_RUNNER_PAIRING_TOKEN_TTL_DAYS` before assuming either way.**
Confirmed in `apps/server/src/services/pairingService.ts` and
`apps/server/src/security/controllerAuth.ts`:

- The token is a 256-bit random value, stored server-side only as a SHA-256
  hash (`apps/server/src/security/tokens.ts`).
- An expiry (`expiresAt`) is only set if the backend operator sets the env
  var `PLATE_RUNNER_PAIRING_TOKEN_TTL_DAYS` (in **days**). Unset → the token
  never expires on its own. **Our production Railway deployment
  (`plate-runner-2` / `plate-runner-server`) has this set to `30`** — so
  on that backend, every `controllerToken` expires 30 days after pairing
  and needs a fresh `pair-controller.*` run after that.
- The only other way it stops working is explicit **revocation**: the
  Controller calling `POST /api/remote/displays/:displayId/unpair`, or the
  Display revoking it from its "Paired Controllers" list.

For CI use: with a 30-day TTL, treat it like a rotated secret — store it as
a pipeline variable but re-pair (and update the stored value) at least
every 30 days, or the pipeline will start failing with `401
token_expired`. Still treat it as a credential either way: if a pipeline or
machine holding it is compromised, revoke it from the Display immediately
rather than waiting out the TTL.

## 2. Sending a plate: `send-random-plate.sh` / `send-random-plate.bat`+`.ps1`

Generates:

- a random plate (uppercase `A-Z0-9`, 6–8 chars by default unless `-l` is
  given, same character rule as `packages/shared/src/validators/plate.ts`),
- a random vehicle color (`blue`/`red`/`gray`, unless `-c` is given),
- a random vehicle type (`sedan`/`suv`, unless `-y` is given — see
  [VEHICLE_COLOR_VARIANTS.md](VEHICLE_COLOR_VARIANTS.md) for what each type
  actually renders as),

and sends it to a paired Display via `POST /api/remote/displays/:displayId/simulate`.
Every request sends **both** `x-api-key` and `x-controller-token` —
`/api/remote/*` requires both, see [PAIRING_SPEC.md](PAIRING_SPEC.md)'s
"Controller auth on every remote request" section.

It asks whether the gate should **wait for signal**:

- **No (default / auto_open)** — vehicle approaches, gate opens
  automatically, run completes on its own. Script sends one request and
  exits.
- **Yes (wait_for_signal)** — vehicle approaches and stops, gate stays
  closed, plate stays visible. The script then **blocks and waits for you
  to press Enter** before sending `POST /api/remote/displays/:displayId/open-gate`.

### Why it waits for Enter instead of polling

The backend is a fire-and-forget command queue (Display polls for commands
and executes them locally) — there is no API endpoint that reports live
simulation phase (e.g. "vehicle now stopped at gate"). So there's no way to
programmatically detect the exact moment the plate is stopped and readable.
Instead, the script relies on you watching the Display/Camera Mode screen
and pressing Enter once it's actually ready. This matches CLAUDE.md's
current design for `wait_for_signal`: "the signal can be a local UI
button" — this script is effectively that button, from a terminal.

### Usage

```bash
./scripts/macos/send-random-plate.sh
```

It will read `apiBaseUrl`, `apiKey`, `controllerToken` and `displayId` from
`pairing-result.json` at the project root automatically if present (re-run
`pair-controller.sh` if your existing `pairing-result.json` predates the
`apiKey` field — it'll just prompt for the API key once otherwise). Or
fully non-interactive:

```bash
./scripts/macos/send-random-plate.sh \
  -u https://your-backend.example.com \
  -k YOUR_API_KEY \
  -t YOUR_CONTROLLER_TOKEN \
  -d YOUR_DISPLAY_ID \
  -w yes \
  -l 7 -D incoming -p center_front -c blue -y suv
```

On Windows:

```powershell
.\scripts\windows\send-random-plate.ps1 -ApiBaseUrl "https://your-backend.example.com" `
  -ApiKey "YOUR_API_KEY" -ControllerToken "YOUR_CONTROLLER_TOKEN" -DisplayId "YOUR_DISPLAY_ID" `
  -WaitForSignal -VehicleColor blue -VehicleType suv
```

Flags (bash) / params (PowerShell):

| Bash flag | PS param | Meaning | Default |
|---|---|---|---|
| `-u` | `-ApiBaseUrl` | API base URL | from `pairing-result.json` |
| `-k` | `-ApiKey` | API key | from `pairing-result.json` |
| `-t` | `-ControllerToken` | Controller token | from `pairing-result.json` |
| `-d` | `-DisplayId` | Display ID | from `pairing-result.json` |
| `-w yes\|no` | `-WaitForSignal` (switch) | Skip the interactive wait_for_signal prompt | prompt |
| `-l` | `-PlateLength` | Random plate length (1–12) | random, 6–8 |
| `-D` | `-Direction` | Direction: `incoming` \| `away` | `incoming` |
| `-p` | `-DetectorPlacement` | Detector placement (must match direction) | `center_front` |
| `-c` | `-VehicleColor` | Vehicle color: `blue` \| `red` \| `gray` | random |
| `-y` | `-VehicleType` | Vehicle type: `sedan` \| `suv` | random |

Detector placement must match direction, same rule as the app:
`incoming` → `driver_front` / `center_front` / `passenger_front`;
`away` → `driver_back` / `center_back` / `passenger_back`.

### CI pipeline use

The API base URL/key/controller token/display ID can all be stored as
pipeline secrets/variables and the script run fully non-interactively
(`-w no` on bash, omitting `-WaitForSignal` on PowerShell) for an
`auto_open` smoke test (no human needed to press Enter). The wait-for-signal
path requires an interactive terminal or a human watching the Display, so
avoid it in unattended CI runs. Remember the 30-day TTL on the current
production backend (see above) — the pipeline's stored `controllerToken`
will need refreshing periodically, it isn't a "set once and forget" secret
there.

## Known Limitations

- No live simulation-phase API — `wait_for_signal` runs require a human to
  judge when the vehicle is actually stopped and press Enter.
- Scripts assume one Display per pairing; multi-display fan-out would need
  a wrapper loop over multiple `pairing-result.json`-equivalents.
- The Windows `send-random-plate.ps1` requires PowerShell's `Invoke-RestMethod`
  (built into Windows PowerShell 5.1+ / PowerShell 7+) — no extra install
  needed, but very old Windows versions may need a PowerShell update.
