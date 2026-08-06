# Remote Mode Spec (Macro Phase 5 — Remote Display Mode + Pairing + Remote Control)

Local/LAN/self-hosted remote control — one computer running Plate Runner as
a **Display**, another running it as a **Controller**, pairing via a 6-digit
code, no cloud, no user accounts. Not built this phase: cloud deployment,
users/email/password, billing, multi-tenant hosting, new render scenes,
visual calibration, real ANPR/AI. See [PAIRING_SPEC.md](PAIRING_SPEC.md) and
[REMOTE_COMMANDS_SPEC.md](REMOTE_COMMANDS_SPEC.md) for the mechanics; this
document covers the three usage modes and how they fit together.

## Usage modes

The frontend has a mode switcher in its header (hidden in Fullscreen/Camera,
same as the rest of the app's chrome):

### Local

Unchanged from every prior phase — the same computer both controls and
displays the simulation. Nothing about this mode changed in Phase 5; it's
the default and the one every existing doc/QA scenario already covers.

### Display

This computer shows the simulation and listens for remote commands.

1. **Register** — `POST /api/displays/register` creates a `display_devices`
   row and returns a `displaySecret` (persisted to this browser's
   `localStorage` so a reload doesn't require re-registering).
2. **Generate a pairing code** — a 6-digit code, 5-minute TTL, shown large
   with a live countdown. Regenerating cancels the prior pending code.
3. **Approve or reject incoming pairing requests** (Phase 5.1) — a
   "Pairing Requests" card, polled every 2s, shows each controller waiting
   on a decision (name, requested-at, expires-in). Nothing is granted
   automatically; see [PAIRING_SPEC.md](PAIRING_SPEC.md) for the full
   request/approve/finalize flow.
4. **Enable the listener** — polls `GET
   /api/displays/:displayId/commands/pending` every 1.5s (same cadence as
   Local Mode's Local API listener), executing whatever it finds through the
   same dispatch core (`run_plate`, `run_queue`, `run_list`, `pause`,
   `resume`, `stop`, `skip_current`, `open_gate`, `set_config`).
5. Camera Mode / Fullscreen work exactly as before — the Display panel
   (including the pairing-requests card) is hidden, but both the command
   listener and the pairing-request polling (instantiated at the `App.tsx`
   level, not inside the panel) keep running.
6. **Paired controllers** are listed with a Revoke button.

### Controller

This computer sends commands to one or more paired displays. No large
simulation view (per spec — a controller doesn't need to render a scene at
all); the panel takes the full width instead.

1. **Request pairing** with a display using its 6-digit code, then wait
   for the display to approve or reject — the UI shows "Waiting for
   display approval…", then either finalizes automatically (and stores a
   `controllerToken` per-display in this browser's `localStorage`,
   `platerunner_controller_pairings` — one controller can pair with
   multiple displays) or shows why it didn't (rejected/expired/error), with
   a way to retry. See [PAIRING_SPEC.md](PAIRING_SPEC.md) for the full
   state machine.
2. Select a paired display as the **target** (click its row).
3. Send a single plate, a queue (pasted/typed, same parser as Local Mode's
   queue input), a locally-stored Plate List's snapshot, or a control
   command (pause/resume/stop/skip/open-gate) — each is a single fire-and-
   forget POST to `/api/remote/displays/:displayId/*`; the target display's
   own listener does the actual work.

## Data flow

```
Controller                    Backend (SQLite)                    Display
-----------                   -----------------                   -------
POST .../simulate  ─────────► SimulationCommand{displayId, ─────►  polls .../commands/pending
                               source:'remote_controller'}         (only sees its own displayId)
                                                                    claims, executes locally,
                                                                    reports completed/failed  ◄──
```

No WebSocket, no push — this is the exact same command-queue model
introduced in Macro Phase 4 for the Local API, just with a `displayId` now
scoping which commands a given listener sees (`commandsRepo.listPending()`
branches between `displayId IS NULL` for local/global and `displayId = ?`
for a specific display, at the SQL level — not just a UI filter).

## Compatibility

Local Mode, the Phase 4 Local API listener, Plate Lists, Scheduler,
Execution History, and Docker are all untouched by this phase — Remote Mode
is purely additive (new tables, new routes, new optional hook props, new UI
branches). See `docs/PROGRESS.md`'s Phase 5 entry for the specific
regression checks run.
