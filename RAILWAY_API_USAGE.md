# Plate Runner — Production API Usage (Railway)

Practical, copy-pasteable reference for sending commands to the deployed (non-local) Plate Runner instance.

- **Frontend (Display):** `https://plate-runner-web-production.up.railway.app/`
- **Backend API:** `https://plate-runner-server-production.up.railway.app/`

All endpoints below use the backend API base URL. Never commit real API keys, display secrets, or controller tokens to this repo — the values below are placeholders.

```bash
API="https://plate-runner-server-production.up.railway.app"
KEY="<YOUR_API_KEY>"
```

---

## 1. Auth model

| Header | Used by | Scope |
|---|---|---|
| `x-api-key` | every `/api/*` route | Global — required on all API calls |
| `x-display-secret` | `/api/displays/:displayId/*` | Scoped to one display (returned once at registration) |
| `x-controller-token` | `/api/remote/displays/:displayId/*` | Scoped to one controller↔display pairing (returned once at pairing finalize) |

`Authorization: Bearer <value>` is also accepted as a fallback for any of the three.

**`x-api-key` is required on every single `/api/*` call, always — including `/api/displays/*` and `/api/remote/*` routes.** Those two add a *second*, scoped header on top of it; they never replace it. Forgetting `x-api-key` on a remote/display call is the most common cause of an unexplained `401 unauthorized`.

`/health` is the only unauthenticated route.

---

## 2. Health check

```bash
curl -s "$API/health"
```
No auth required. Returns `{ ok, service, version, time }`. Use this to confirm the server is up before anything else.

---

## 3. Core concepts

- **Plate:** `A-Z0-9` only, max 12 characters, no spaces/symbols, normalized to uppercase server-side. Empty is invalid.
- **Direction:** `"incoming"` | `"away"`
- **DetectorPlacement** (must match direction):
  - `incoming` → `driver_front` | `center_front` | `passenger_front`
  - `away` → `driver_back` | `center_back` | `passenger_back`
- **VehicleColor:** `"blue"` | `"red"` | `"gray"`
- **GateConfig:**
  ```json
  {
    "gateMode": "auto_open" | "wait_for_signal" | "hidden",
    "gateInitialState": "open" | "closed",
    "stopBeforeOpenMs": 1500,
    "delayAfterOpenMs": 800
  }
  ```
- **QueueConfig** (only for queue/list runs):
  ```json
  { "gapBetweenVehiclesMs": 1500, "mode": "run_all" | "manual_next", "loop": false }
  ```
- **speedPreset** (optional, on `/simulate`, `/simulate/queue`, and their `/remote/displays/:displayId/*` equivalents): `"slow" | "regular" | "fast"`. Sets every speed phase (initial/stopping/afterStop/final, both directions) uniformly — slow=1, regular=5, fast=10. **Omitted → defaults to `"slow"`.** `"advanced"` is a Display-UI-only concept (per-phase manual tuning) and is rejected if sent here.

Routes never execute the simulation directly — they create a `SimulationCommand` that the target Display's browser tab picks up on its next poll (usually within ~1s).

---

## 4. Local/global commands — `/api/simulate*`, `/api/simulation/*`

These target whichever Display is polling the **local/global** queue (no `displayId` — used when you're not doing remote multi-display pairing). Requires `x-api-key` only.

### Run a single plate
```bash
curl -s -X POST "$API/api/simulate" \
  -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{
    "plate": "ABC123",
    "direction": "incoming",
    "detectorPlacement": "center_front",
    "vehicleColor": "blue",
    "gateConfig": { "gateMode": "wait_for_signal", "gateInitialState": "closed", "stopBeforeOpenMs": 1500, "delayAfterOpenMs": 800 },
    "queueConfig": { "gapBetweenVehiclesMs": 1500, "mode": "run_all", "loop": false },
    "speedPreset": "regular"
  }'
```

### Run a queue of plates
```bash
curl -s -X POST "$API/api/simulate/queue" \
  -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{
    "plates": ["ABC123", "XYZ789"],
    "direction": "away",
    "detectorPlacement": "center_back",
    "vehicleColor": "red",
    "gateConfig": { "gateMode": "auto_open", "gateInitialState": "closed", "stopBeforeOpenMs": 1500, "delayAfterOpenMs": 800 },
    "queueConfig": { "gapBetweenVehiclesMs": 1500, "mode": "run_all", "loop": false },
    "speedPreset": "fast"
  }'
```

### Simulation control (no body)
```bash
curl -s -X POST "$API/api/simulation/pause"        -H "x-api-key: $KEY"
curl -s -X POST "$API/api/simulation/resume"        -H "x-api-key: $KEY"
curl -s -X POST "$API/api/simulation/stop"          -H "x-api-key: $KEY"
curl -s -X POST "$API/api/simulation/skip-current"  -H "x-api-key: $KEY"
curl -s -X POST "$API/api/simulation/open-gate"     -H "x-api-key: $KEY"
```

---

## 5. Remote (per-display) commands — `/api/remote/displays/:displayId/*`

Use this set when automating a **specific paired Display** from a Controller (e.g. CI, an external system). **Requires BOTH headers together** — `x-api-key` (every `/api/*` route checks this first, globally) *and* `x-controller-token` from a finalized pairing (see §6). Sending only one of the two returns `401 unauthorized`.

```bash
DISPLAY_ID="<DISPLAY_ID>"
TOKEN="<CONTROLLER_TOKEN>"
```

### Send a plate to that display
```bash
curl -s -X POST "$API/api/remote/displays/$DISPLAY_ID/simulate" \
  -H "x-api-key: $KEY" -H "x-controller-token: $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "plate": "ABC123",
    "direction": "incoming",
    "detectorPlacement": "driver_front",
    "vehicleColor": "gray",
    "gateConfig": { "gateMode": "wait_for_signal", "gateInitialState": "closed", "stopBeforeOpenMs": 1500, "delayAfterOpenMs": 800 },
    "queueConfig": { "gapBetweenVehiclesMs": 1500, "mode": "run_all", "loop": false },
    "speedPreset": "slow"
  }'
```

### Send a queue of plates
```bash
curl -s -X POST "$API/api/remote/displays/$DISPLAY_ID/simulate/queue" \
  -H "x-api-key: $KEY" -H "x-controller-token: $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "plates": ["ABC123", "DEF456"],
    "direction": "away",
    "detectorPlacement": "passenger_back",
    "vehicleColor": "blue",
    "gateConfig": { "gateMode": "auto_open", "gateInitialState": "closed", "stopBeforeOpenMs": 1500, "delayAfterOpenMs": 800 },
    "queueConfig": { "gapBetweenVehiclesMs": 1500, "mode": "run_all", "loop": false }
  }'
```

### Control that display's run (no body)
```bash
curl -s -X POST "$API/api/remote/displays/$DISPLAY_ID/pause"        -H "x-api-key: $KEY" -H "x-controller-token: $TOKEN"
curl -s -X POST "$API/api/remote/displays/$DISPLAY_ID/resume"       -H "x-api-key: $KEY" -H "x-controller-token: $TOKEN"
curl -s -X POST "$API/api/remote/displays/$DISPLAY_ID/stop"         -H "x-api-key: $KEY" -H "x-controller-token: $TOKEN"
curl -s -X POST "$API/api/remote/displays/$DISPLAY_ID/skip-current" -H "x-api-key: $KEY" -H "x-controller-token: $TOKEN"
curl -s -X POST "$API/api/remote/displays/$DISPLAY_ID/open-gate"    -H "x-api-key: $KEY" -H "x-controller-token: $TOKEN"
```

### Update display config remotely
```bash
curl -s -X POST "$API/api/remote/displays/$DISPLAY_ID/set-config" \
  -H "x-api-key: $KEY" -H "x-controller-token: $TOKEN" -H "Content-Type: application/json" \
  -d '{ "...": "see SetConfigPayload — mirrors SimulationConfig fields" }'
```

### Unpair (controller removes itself from a display)
```bash
curl -s -X POST "$API/api/remote/displays/$DISPLAY_ID/unpair" -H "x-api-key: $KEY" -H "x-controller-token: $TOKEN"
```

Remote routes are rate-limited tighter than local (`PLATE_RUNNER_RATE_LIMIT_REMOTE_PER_MIN`, default 30/min).

---

## 6. Pairing a Controller to a Display

1. **Display registers** (once, or already done from the Display Mode UI):
   ```bash
   curl -s -X POST "$API/api/displays/register" \
     -H "x-api-key: $KEY" -H "Content-Type: application/json" \
     -d '{ "name": "Lobby Display" }'
   # -> { ok, displayId, displaySecret }
   ```

2. **Display requests a pairing code** (needs `x-display-secret` from step 1):
   ```bash
   curl -s -X POST "$API/api/displays/$DISPLAY_ID/pairing-code" \
     -H "x-api-key: $KEY" -H "x-display-secret: <DISPLAY_SECRET>"
   # -> { ok, pairingSessionId, code, expiresAt }
   ```

3. **Controller submits the code**:
   ```bash
   curl -s -X POST "$API/api/controllers/pair" \
     -H "x-api-key: $KEY" -H "Content-Type: application/json" \
     -d '{ "controllerName": "Ops Laptop", "code": "<CODE_FROM_STEP_2>" }'
   # -> { ok, pairingRequestId, status: "approval_pending", displayId, displayName, expiresAt }
   ```

4. **Display approves** (needs `x-display-secret`):
   ```bash
   curl -s -X POST "$API/api/displays/$DISPLAY_ID/pairing-requests/<PAIRING_REQUEST_ID>/approve" \
     -H "x-api-key: $KEY" -H "x-display-secret: <DISPLAY_SECRET>"
   ```

5. **Controller finalizes** — this is the only place the plaintext token is ever returned, save it:
   ```bash
   curl -s -X POST "$API/api/controllers/pairing-requests/<PAIRING_REQUEST_ID>/finalize" \
     -H "x-api-key: $KEY"
   # -> { ok, controllerId, displayId, pairingId, controllerToken }
   ```

Use `displayId` + `controllerToken` from here on for all `/api/remote/displays/:displayId/*` calls (§5).

---

## 7. Automation walkthrough: send a plate, wait for signal, open the gate

Scenario: an external test (e.g. GitHub Actions) sends a plate to a specific Display, the gate stays closed until the test explicitly opens it, then confirms completion.

```bash
API="https://plate-runner-server-production.up.railway.app"
KEY="<YOUR_API_KEY>"
DISPLAY_ID="<DISPLAY_ID>"
TOKEN="<CONTROLLER_TOKEN>"

# 1. Send the plate with gateMode = wait_for_signal
curl -s -X POST "$API/api/remote/displays/$DISPLAY_ID/simulate" \
  -H "x-api-key: $KEY" -H "x-controller-token: $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "plate": "TEST01",
    "direction": "incoming",
    "detectorPlacement": "center_front",
    "vehicleColor": "blue",
    "gateConfig": { "gateMode": "wait_for_signal", "gateInitialState": "closed", "stopBeforeOpenMs": 1500, "delayAfterOpenMs": 800 },
    "queueConfig": { "gapBetweenVehiclesMs": 1500, "mode": "run_all", "loop": false }
  }'
# Vehicle approaches, stops at the closed gate, plate stays readable. Simulation
# now sits in phase "waiting_for_signal" until the open-gate command below.

# 2. (Optional) Poll command history to confirm the display claimed/completed it
curl -s "$API/api/commands?status=completed&limit=5" -H "x-api-key: $KEY"

# 3. Send the open signal once your camera/OCR check has read the plate
curl -s -X POST "$API/api/remote/displays/$DISPLAY_ID/open-gate" -H "x-api-key: $KEY" -H "x-controller-token: $TOKEN"
# Gate opens, vehicle exits, run completes.
```

Same flow works on the local/global queue (no `displayId`) by swapping `/api/remote/displays/$DISPLAY_ID/...` for `/api/simulate` and `/api/simulation/open-gate`, with `x-api-key` instead of `x-controller-token`.

---

## 8. Inspecting state

```bash
# Overall status snapshot
curl -s "$API/api/status" -H "x-api-key: $KEY"

# Command history (also doubles as an audit log)
curl -s "$API/api/commands" -H "x-api-key: $KEY"
curl -s "$API/api/commands?status=pending&limit=20" -H "x-api-key: $KEY"
curl -s "$API/api/commands/<COMMAND_ID>" -H "x-api-key: $KEY"

# A display's own record + its paired controllers
curl -s "$API/api/displays/$DISPLAY_ID" -H "x-api-key: $KEY" -H "x-display-secret: <DISPLAY_SECRET>"
curl -s "$API/api/displays/$DISPLAY_ID/pairings" -H "x-api-key: $KEY" -H "x-display-secret: <DISPLAY_SECRET>"
```

`status` values for `?status=` filters: `pending`, `claimed`, `completed`, `failed` (see `SIMULATION_COMMAND_STATUSES`).

---

## 9. Notes / gotchas

- `detectorPlacement` must match `direction` (front placements for `incoming`, back placements for `away`) or the request is rejected with 400.
- Plates are validated server-side (`A-Z0-9`, ≤12 chars) — never render raw plate input as HTML anywhere downstream.
- Remote (`x-controller-token`) commands are rate-limited more strictly than local (`x-api-key`) ones.
- All secrets (`displaySecret`, `controllerToken`) are shown in plaintext exactly once at creation/finalize — store them immediately, they can't be re-fetched (only rotated/reissued).
