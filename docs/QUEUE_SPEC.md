# Plate Queue Spec (Phase 0.4)

Local, in-browser queue for playing many plates through the existing single-vehicle
simulator sequentially. No backend, no persistence beyond the current page session.

## Parser — `apps/web/src/features/queue/plateQueueParser.ts`

```ts
function parsePlateQueueInput(input: string): {
  valid: string[];
  invalid: Array<{ raw: string; reason: string }>;
  total: number;
};
```

- Splits the raw textarea input on any run of comma, space, tab, or newline
  (`/[,\s]+/`), trims each token, and drops empty tokens.
- Each token is validated with the existing shared validator
  (`validatePlate` in `packages/shared/src/validators/plate.ts`) — the same rules
  used everywhere else in the app: A–Z / 0–9 only, ≤12 characters, not empty,
  normalized to uppercase.
- `reason` on invalid entries is the validator's own error message.
- **Duplicates are kept** (not deduplicated) — this is intentional per spec.
- `total` counts every non-empty token detected, valid or invalid.

### Design decision: space is a separator, not part of a plate

Because the spec requires space to be an accepted separator, a line typed as
`ABC 123` is parsed as **two** valid plates (`ABC`, `123`), not one invalid
plate with an embedded space. A token can still be invalid for the usual
reasons (bad characters, too long, or a stray separator producing an empty
token), just not because of a literal space — space never survives into a
token.

### Max queue size

`MAX_QUEUE_SIZE = 500` (exported from `packages/shared`). If `total` from the
parser exceeds this, the queue is **not** loaded and an error is shown; the
existing queue (if any) is left untouched.

## Types — `packages/shared/src/types/queue.ts`

```ts
type PlateQueueItemStatus =
  | 'pending' | 'running' | 'waiting_for_signal' | 'completed' | 'skipped' | 'failed';

interface PlateQueueItem { id: string; plate: string; status: PlateQueueItemStatus; error?: string; }

type PlateQueueStatus =
  | 'idle' | 'running' | 'paused' | 'waiting_for_signal' | 'waiting_for_next' | 'completed' | 'stopped';

type PlateQueueMode = 'run_all' | 'manual_next';

interface PlateQueueConfig { gapBetweenVehiclesMs: number; mode: PlateQueueMode; loop: boolean; }
```

Only entries that pass validation become `PlateQueueItem`s — invalid tokens
never enter the queue; they're only surfaced in the input preview panel.

## Queue hook — `apps/web/src/features/queue/usePlateQueue.ts`

The hook **orchestrates** the existing `useSimulation` instance; it does not
duplicate any of its motion/gate logic. Key facts that make this possible:

- `useSimulation` never reads `config.plate` — only direction, detector
  placement, gate settings, and speed phases drive the state machine. Plate
  text is rendered separately. So the queue can update `config.plate` and
  call `simulation.start()` without any risk of racing the simulator's
  internal state.
- `simulation.reset()` already gives a clean "cancel current vehicle" (resets
  phase to `idle`, vehicle position to the direction's start point, gate to
  its configured initial state) — used for Skip/Stop. No changes to
  `useSimulation` were needed.

A single `useEffect` watches `simulation.state.phase` and reacts only while
`queueStatus` is `running` or `waiting_for_signal` (so it never interferes
with a standalone manual run started outside the queue):

- phase → `waiting_for_signal`: mark the current item `waiting_for_signal`,
  set `queueStatus = 'waiting_for_signal'`.
- `queueStatus` was `waiting_for_signal` and phase leaves it (arm opening):
  mark the item `running` again, `queueStatus = 'running'`.
- phase → `done` (from a running item): mark the item `completed`. In
  `run_all` mode, schedule the next item after `gapBetweenVehiclesMs`. In
  `manual_next` mode, set `queueStatus = 'waiting_for_next'`.

## `run_all` mode

Runs every item back to back. After a vehicle completes, the queue waits
`gapBetweenVehiclesMs` then starts the next item automatically. If the gate
is `wait_for_signal`, the queue pauses at `waiting_for_signal` until the
"Send Open Signal" button (existing gate control) is pressed.

## `manual_next` mode

Runs one item, then stops at `queueStatus = 'waiting_for_next'` until the
user presses **Next Vehicle**. If the gate is `wait_for_signal`, the signal
must be sent first (the vehicle must finish the run) before `waiting_for_next`
is reached — mirrors `run_all`'s gate interaction, just without the
auto-advance.

## Loop

When the last item finishes (in either mode) and `loop` is on, all items are
reset to `pending` and the queue restarts at index 0. Loop with an empty
queue is a no-op.

## Gate interaction matrix

| Gate config                        | Queue behavior |
|-------------------------------------|----------------|
| `hidden`                            | Vehicle passes straight through to `done`; queue advances immediately (after the gap, in `run_all`). |
| Visible, `initially open`           | Same as hidden — vehicle never stops. |
| Visible, closed, `auto_open`        | Vehicle stops, waits `stopBeforeOpenMs`, arm rises automatically, vehicle resumes and completes; queue advances. `queueStatus` stays `running` throughout — no special queue state for this case. |
| Visible, closed, `wait_for_signal`  | Vehicle stops; `queueStatus` becomes `waiting_for_signal` and the item is marked `waiting_for_signal`. The existing **Send Open Signal** button (unchanged) opens the gate; once the vehicle completes, the queue resumes/advances normally. |

## Playback controls

`Run Queue`, `Pause Queue`, `Resume Queue`, `Stop Queue`, `Skip Current`,
`Next Vehicle`, `Clear Queue`, `Reset Status` — each enabled only in the
`queueStatus`es where it makes sense (see `PlateQueuePanel.tsx`'s
`can*` booleans). `Stop Queue` cancels the current vehicle and keeps item
statuses as-is; it does not clear the queue. `Clear Queue` empties the
queue entirely. `Reset Status` puts every item back to `pending` without
touching the loaded plates.

## Known limitations

- **Pause is queue-level only.** `Pause Queue` prevents the queue from
  *advancing* to the next vehicle (the inter-vehicle gap timer is cancelled),
  but it cannot pause a vehicle already mid-animation — `useSimulation`'s
  animation loop has no pause primitive today. This is a deliberate scope
  decision to avoid changing the simulation state machine in this phase.
- **`failed` status has no automatic trigger yet.** The local simulator has
  no failure path (no network calls, no external signal that can error), so
  `markCurrentFailed` exists on the hook for API completeness / future use
  but nothing in this phase sets it automatically.
- Duplicate plates in a queue are allowed and run independently, by design.
- The queue is in-memory only; refreshing the page clears it (no persistence
  in this phase, per scope).
