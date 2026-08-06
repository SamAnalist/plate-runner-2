# Simulation Command API Spec

The backend does **not** push anything to the frontend (no WebSocket this
phase — see [BACKEND_API_SPEC.md](BACKEND_API_SPEC.md)). Instead, every
external action goes through a **command queue**: the API creates a
`SimulationCommand` row, and the frontend's `useApiCommandListener` hook
polls, claims, executes, and reports back. This is what lets an external
script "control" the simulation without any push transport.

## `SimulationCommand` shape

```ts
type SimulationCommandType =
  | 'run_plate' | 'run_queue' | 'run_list'
  | 'pause' | 'resume' | 'stop' | 'skip_current' | 'open_gate' | 'set_config';

type SimulationCommandStatus = 'pending' | 'claimed' | 'completed' | 'failed' | 'cancelled';

interface SimulationCommand {
  id: string;
  type: SimulationCommandType;
  payload: unknown;
  status: SimulationCommandStatus;
  createdAt: string;
  updatedAt: string;
  claimedAt?: string;
  completedAt?: string;
  error?: string;
}
```

Defined in `packages/shared/src/types/simulationCommand.ts`, exported from
`@plate-runner/shared` — used identically by the backend (creates/stores) and
the frontend (polls/executes).

## Lifecycle

```
pending → claimed → completed
                   → failed (error: string)
pending → cancelled   (reserved — no endpoint exposes this yet)
```

- **`pending`**: created by an `/api/simulate*`, `/api/simulation/*`, or
  `/api/lists/:id/run` call (or directly via `POST /api/simulation/commands`).
- **`claimed`**: a consumer (normally the frontend listener) has taken
  ownership. `POST /api/simulation/commands/:id/claim` only succeeds
  (`200`) if the command is currently `pending`; otherwise `409`.
- **`completed`** / **`failed`**: the claimant reports back via
  `POST .../:id/complete` or `POST .../:id/fail` (body `{ error: string }`).
  Both require the command to currently be `claimed`; otherwise `409`.
- **`cancelled`**: reserved for a future "cancel a pending command before
  it's claimed" endpoint — not implemented this phase.

`GET /api/simulation/commands/:id` returns `404` for an unknown id, `409`
(via the same status-code mapping the claim/complete/fail routes use) for
state-conflict cases raised elsewhere.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/simulation/commands` | Generic creation — body `{ type, payload }`, `type` must be one of `SIMULATION_COMMAND_TYPES`. |
| `GET` | `/api/simulation/commands/pending` | List all `pending` commands, oldest first. |
| `POST` | `/api/simulation/commands/:id/claim` | `pending → claimed`. `409` if not currently `pending`. |
| `POST` | `/api/simulation/commands/:id/complete` | `claimed → completed`. `409` if not currently `claimed`. |
| `POST` | `/api/simulation/commands/:id/fail` | `claimed → failed`, body `{ error }`. `409` if not currently `claimed`. |
| `GET` | `/api/simulation/commands/:id` | Fetch one command by id. `404` if unknown. |

## The poll → claim → execute → report loop (frontend side)

Implemented in `apps/web/src/features/api/useApiCommandListener.ts`:

1. Every 1.5s (`POLL_MS`), `GET /api/simulation/commands/pending`.
2. If any exist, claim the **first** one (`POST .../:id/claim`). If the claim
   fails (already taken, network error), skip this tick — no local action.
3. Dispatch by `type`:
   - `run_plate` / `run_queue` / `run_list`: if the local plate queue is
     already active (`running`, `paused`, `waiting_for_signal`, or
     `waiting_for_next`), **fail immediately with `error: 'local_queue_busy'`**
     — the command was already claimed, so this is explicit feedback to the
     API caller rather than leaving it stuck pending. Otherwise, build a
     `PlateList`-shaped snapshot from the payload and run it via
     `usePlateLists.runListSnapshot(list, 'api_command')`, then report `completed`.
   - `pause` / `resume` / `stop` / `skip_current` / `open_gate`: call the
     matching local control function unconditionally (these are already
     idempotent/no-op-safe locally — pausing an already-paused queue is not
     an error), then report `completed`.
   - `set_config`: not implemented this phase. Claimed, then immediately
     failed with `error: 'not_implemented'` — the payload shape is reserved
     but unspecified.
4. Regardless of outcome, `pendingCount` and `connectionStatus` are updated
   from the poll response so the UI reflects the queue depth and auth state
   live.

Only **one** command is processed per poll tick, by design — this keeps the
"is the local queue busy" check simple and avoids claiming a batch of
commands the frontend can't actually act on yet.

## Empty JSON body

Every POST above can legitimately have no request body (`claim`, `complete`
with no error, the control endpoints). Fastify's default JSON body parser
rejects `Content-Type: application/json` combined with an empty body
(`FST_ERR_CTP_EMPTY_JSON_BODY`) — `fetch()` always sets that header even
when no body is passed. Fixed on both ends: the frontend always sends `'{}'`
on bodiless POSTs, and the server's JSON content-type parser
(`apps/server/src/index.ts`) treats an empty body as `{}` instead of
rejecting it, so any external caller (curl, a test script, `fetch`) hits the
same leniency without needing to know this quirk.
