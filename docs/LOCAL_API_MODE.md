# Local API Mode (Frontend)

How to enable the frontend's Local API listener so an external script can
drive the running simulation through `apps/server`.

This is the **Local** usage mode specifically — one computer both running
and controlling the simulation. Macro Phase 5 added two more modes,
**Display** and **Controller**, for controlling a *different* computer's
simulation over the same backend. See
[REMOTE_MODE_SPEC.md](REMOTE_MODE_SPEC.md) for those; everything below is
unchanged Local Mode behavior.

## Enabling it

1. Start the backend: `pnpm dev:server` (or `pnpm dev` to run both web +
   server together). Default: `http://localhost:8787`, API key
   `dev-local-key` unless `PLATE_RUNNER_API_KEY` is set.
2. In the app, open the **Local API** panel in the control sidebar.
3. Set **API Base URL** (default `http://localhost:8787`) and **API Key**
   (default `dev-local-key`) if you changed either from the default.
4. Click **Test Connection** — the badge shows `connected` / `unauthorized` /
   `error` / `disconnected`.
5. Click **Listen for API Commands** to start polling (every 1.5s). The
   panel shows a live pending-command count while enabled.

The listener is instantiated in `App.tsx` (not inside the control panel), so
it keeps polling in **Camera Mode** and **Fullscreen** even though the panel
itself isn't rendered there — a command sent while the operator is in Camera
Mode still gets claimed and executed.

## Behavior when the local queue is busy

If a `run_plate` / `run_queue` / `run_list` command arrives while a queue is
already running locally, the listener **claims it, then immediately fails it
with `error: 'local_queue_busy'`** — it does not leave it pending or try to
queue it up silently. This gives an API caller (a CI script, say) a fast,
explicit signal instead of a hang. `pause`, `resume`, `stop`, `skip_current`,
and `open_gate` are allowed to execute even while a queue is active — they're
control operations on that same active run, not new runs.

## Local validation

The frontend re-validates the command payload before executing it (reusing
the same `@plate-runner/shared` validators the backend already applied) —
this is defense-in-depth, not a substitute for backend validation, since the
backend is the one actually creating the command in the first place.

## Limitations

- Only one command is processed per 1.5s poll tick.
- `set_config` commands are claimed and immediately failed with
  `not_implemented` — no convenience endpoint or execution path yet.
- No push transport — if the tab is closed or the listener is toggled off,
  commands simply accumulate as `pending` until a listener resumes polling.
- The frontend's execution history (`useExecutionHistory`, local-only) is
  **not** synced with the backend's command history
  (`GET /api/commands`) — they're two independent logs of the same
  underlying runs. See [EXECUTION_HISTORY_SPEC.md](EXECUTION_HISTORY_SPEC.md).

## curl walkthrough

```bash
# Health (no auth)
curl http://localhost:8787/health

# Status (requires key)
curl http://localhost:8787/api/status -H "x-api-key: dev-local-key"

# Run a single plate
curl -X POST http://localhost:8787/api/simulate \
  -H "x-api-key: dev-local-key" -H "Content-Type: application/json" \
  -d '{"plate":"ABC123","direction":"incoming","detectorPlacement":"center_front","vehicleColor":"blue","gateConfig":{"gateMode":"auto_open","gateInitialState":"closed","stopBeforeOpenMs":800,"delayAfterOpenMs":400},"queueConfig":{"mode":"run_all","gapBetweenVehiclesMs":500,"loop":false}}'

# Pause the running queue (no body needed)
curl -X POST http://localhost:8787/api/simulation/pause \
  -H "x-api-key: dev-local-key" -H "Content-Type: application/json"
```

With the frontend listener enabled, the vehicle starts running within one
poll cycle (≤1.5s) of the `POST /api/simulate` call.
