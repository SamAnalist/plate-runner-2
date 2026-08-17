# Controller CLI Tools

Command-line scripts to pair a machine as a Plate Runner Controller and send
commands to a paired Display, without opening the web UI. Useful for CI
pipelines and quick manual testing from a terminal.

Two script pairs are provided, one for Windows and one for macOS/Linux:

| Purpose | Windows | macOS/Linux |
|---|---|---|
| Pair this machine as a Controller | `pair-controller.bat` + `pair-controller.ps1` | `pair-controller.sh` |
| Send a random plate (optionally waiting for a gate signal) | — | `send-random-plate.sh` |

All scripts live in the project root and talk directly to the backend API
described in [BACKEND_API_SPEC.md](BACKEND_API_SPEC.md), [PAIRING_SPEC.md](PAIRING_SPEC.md)
and [REMOTE_COMMANDS_SPEC.md](REMOTE_COMMANDS_SPEC.md).

## Requirements (macOS/Linux)

- `curl` (preinstalled on macOS)
- `jq` — install with `brew install jq`

## 1. Pairing: `pair-controller.sh`

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
./pair-controller.sh
```

Or non-interactively:

```bash
./pair-controller.sh -u https://your-backend.example.com -k YOUR_API_KEY \
  -n "CI Runner" -c 123456
```

Flags: `-u` API base URL, `-k` API key, `-n` controller name, `-c` pairing
code. Omitted flags are prompted for interactively.

### Output

On success, prints the `controllerToken` **once** (the backend never returns
it again) and saves it to `pairing-result.json` in the project root:

```json
{
  "displayId": "...",
  "displayName": "...",
  "controllerId": "...",
  "controllerToken": "...",
  "apiBaseUrl": "...",
  "pairedAt": "2026-08-17T12:58:25Z"
}
```

`send-random-plate.sh` reads this file automatically. Treat
`pairing-result.json` like a credentials file — it contains a live secret.
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
  and needs a fresh `pair-controller.sh` run after that.
- The only other way it stops working is explicit **revocation**: the
  Controller calling `POST /api/remote/displays/:displayId/unpair`, or the
  Display revoking it from its "Paired Controllers" list.

For CI use: with a 30-day TTL, treat it like a rotated secret — store it as
a pipeline variable but re-pair (and update the stored value) at least
every 30 days, or the pipeline will start failing with `401
token_expired`. Still treat it as a credential either way: if a pipeline or
machine holding it is compromised, revoke it from the Display immediately
rather than waiting out the TTL.

## 2. Sending a plate: `send-random-plate.sh`

Generates a random plate (uppercase `A-Z0-9`, 1–12 chars, no separators —
same rule as `packages/shared/src/validators/plate.ts`) and a random
vehicle color (`blue`/`red`/`gray`, unless `-c` is given), and sends it to
a paired Display via `POST /api/remote/displays/:displayId/simulate`. Every
request sends **both** `x-api-key` and `x-controller-token` — `/api/remote/*`
requires both, see [PAIRING_SPEC.md](PAIRING_SPEC.md)'s "Controller auth on
every remote request" section.

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
./send-random-plate.sh
```

It will read `apiBaseUrl`, `apiKey`, `controllerToken` and `displayId` from
`pairing-result.json` automatically if present (re-run `pair-controller.sh`
if your existing `pairing-result.json` predates the `apiKey` field — it'll
just prompt for the API key once otherwise). Or fully non-interactive:

```bash
./send-random-plate.sh \
  -u https://your-backend.example.com \
  -k YOUR_API_KEY \
  -t YOUR_CONTROLLER_TOKEN \
  -d YOUR_DISPLAY_ID \
  -w yes \
  -l 7 -D incoming -p center_front -c blue
```

Flags:

| Flag | Meaning | Default |
|---|---|---|
| `-u` | API base URL | from `pairing-result.json` |
| `-k` | API key | from `pairing-result.json` |
| `-t` | Controller token | from `pairing-result.json` |
| `-d` | Display ID | from `pairing-result.json` |
| `-w` | `yes`/`no` — skip the interactive wait_for_signal prompt | prompt |
| `-l` | Random plate length (1–12) | `7` |
| `-D` | Direction: `incoming` \| `away` | `incoming` |
| `-p` | Detector placement (must match direction) | `center_front` |
| `-c` | Vehicle color: `blue` \| `red` \| `gray` | random |

Detector placement must match direction, same rule as the app:
`incoming` → `driver_front` / `center_front` / `passenger_front`;
`away` → `driver_back` / `center_back` / `passenger_back`.

### CI pipeline use

`-k`/`-t`/`-d`/`-u` can all be stored as pipeline secrets/variables and the
script run fully non-interactively with `-w no` for an `auto_open` smoke
test (no human needed to press Enter). `-w yes` requires an interactive
terminal or a human watching the Display, so avoid it in unattended CI
runs. Remember the 30-day TTL on the current production backend (see
above) — the pipeline's stored `controllerToken` will need refreshing
periodically, it isn't a "set once and forget" secret there.

## Known Limitations

- No live simulation-phase API — `wait_for_signal` runs require a human to
  judge when the vehicle is actually stopped and press Enter.
- `send-random-plate.sh` is macOS/Linux (bash) only; no Windows equivalent
  exists yet.
- Scripts assume one Display per pairing; multi-display fan-out would need
  a wrapper loop over multiple `pairing-result.json`-equivalents.
