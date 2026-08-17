# Remote Commands Spec

How `SimulationCommand` extends to support display-scoped remote control.
See [API_COMMANDS_SPEC.md](API_COMMANDS_SPEC.md) for the base command
lifecycle (unchanged) and [PAIRING_SPEC.md](PAIRING_SPEC.md) for the auth
model this builds on.

## `SimulationCommand` additions

```ts
interface SimulationCommand {
  // ...unchanged fields from Phase 4 (id, type, payload, status, timestamps)...
  displayId?: string;             // set for remote-controller-created commands
  source: CommandSource;          // 'local_api' | 'remote_controller' | 'scheduler' | 'unknown'
  createdByControllerId?: string; // set for remote-controller-created commands
}
```

`source` defaults to `'unknown'` for the rare case of a pre-Phase-5 row
missing the column (the migration backfills it to `'unknown'` via a SQL
`DEFAULT`, never leaves it null). Every Phase-4-era local route now passes
`source: 'local_api'` explicitly.

## Two independent pending queues

`commandsRepo.listPending(displayId?)`:

- **No `displayId`** → `WHERE status = 'pending' AND displayId IS NULL` —
  this is Local Mode's queue (`GET /api/simulation/commands/pending`, used
  by `useApiCommandListener`).
- **With a `displayId`** → `WHERE status = 'pending' AND displayId = ?` —
  this is that one display's queue (`GET
  /api/displays/:displayId/commands/pending`, used by
  `useDisplayCommandListener`).

A command created via a remote route is invisible to the local/global
listener and vice versa — enforced at the SQL level, not by client-side
filtering, so there's no way for a display to accidentally claim a local
command or a local listener to accidentally claim someone else's remote
command.

## Remote routes

All under `/api/remote/displays/:displayId/*`, controller-token-
authenticated (`controllerAuth` — see PAIRING_SPEC.md) **and** API-key-
authenticated like every other `/api/*` route (the API key check runs
first, as an `onRequest` hook on the whole `/api` scope) — both headers
are required on every call, see the curl example below and PAIRING_SPEC.md's
"Controller auth on every remote request" section. Rate-limited to 30/min
(stricter than the general 100/min):

| Route | Command type | Notes |
|---|---|---|
| `POST .../simulate` | `run_plate` | Same validation as the local `/api/simulate`. |
| `POST .../simulate/queue` | `run_queue` | Same validation as local. |
| `POST .../pause` | `pause` | Empty payload. |
| `POST .../resume` | `resume` | Empty payload. |
| `POST .../stop` | `stop` | Empty payload. |
| `POST .../skip-current` | `skip_current` | Empty payload. |
| `POST .../open-gate` | `open_gate` | Empty payload. |
| `POST .../set-config` | `set_config` | New `validateSetConfigPayload` — every field optional. |

Every route calls `commandService.createCommand(type, payload, ip, {
displayId, source: 'remote_controller', createdByControllerId:
request.pairing.controllerId })` — these routes never execute anything
themselves, same principle as the local routes from Phase 4.

## Display's own command-listener endpoints

`GET /api/displays/:displayId/commands/pending`, `POST
.../commands/:id/{claim,complete,fail}` — thin, displayId-scoped wrappers
around the same `commandService` used everywhere else. `claim` additionally
checks `command.displayId === displayId` before delegating (`403` if a
display somehow guesses another display's command id) — belt-and-suspenders
on top of the fact that its own `pending` listing already only ever returns
its own commands.

## Frontend dispatch — shared core

`apps/web/src/features/api/commandExecutor.ts`'s `runLocalAction(command,
deps)` is the single dispatch switch shared by `useApiCommandListener`
(Local Mode) and `useDisplayCommandListener` (Display Mode) — claim/
complete/fail stay hook-specific (different endpoints/auth), but "what does
this command type actually *do* locally" is defined once.

### `run_plate` / `run_queue` / `run_list` — queue-busy behavior

Identical to Phase 4: if the local plate queue is already active
(`running`, `paused`, `waiting_for_signal`, `waiting_for_next`), the command
is **claimed, then immediately failed** with `error: 'local_queue_busy'` —
never left pending, giving the controller/API caller a fast, explicit
signal. `pause`/`resume`/`stop`/`skip_current`/`open_gate` are allowed to
run even while the queue is active (they act on that same active run).

### `set_config` — now genuinely implemented

Unlike Phase 4 (where it was permanently `not_implemented`), `set_config`
now applies via an optional `onSetConfig` callback threaded from `App.tsx`
(`handleConfigChange`-based partial applier). If a hook instance doesn't
wire up `onSetConfig`, the command is still claimed then failed with
`not_implemented` — this is an additive capability, not a breaking change
to hooks that don't use it. Payload fields (`direction`,
`detectorPlacement`, `vehicleColor`, `gateConfig`, `queueConfig`) are all
optional; only the fields present are changed, going through the same
direction/placement remap guard manual edits use.

## Example

```bash
# Register a display, get a pairing code, pair a controller, then:
curl -X POST http://localhost:8787/api/remote/displays/$DISPLAY_ID/simulate \
  -H "x-api-key: dev-local-key" -H "x-controller-token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plate":"REMOTE1", ...}'
# -> { "ok": true, "commandId": "...", "status": "pending" }
# Only GET /api/displays/$DISPLAY_ID/commands/pending will ever see this
# command — the global /api/simulation/commands/pending will not.
```
