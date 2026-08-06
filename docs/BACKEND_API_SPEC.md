# Backend API Spec (Macro Phase 4 — Local Backend + API + Docker)

Local Node.js/Fastify backend (`apps/server`) exposing a REST API for external
scripts/tools (GitHub Actions, test harnesses, curl) to drive Plate Runner.
It's a local command-queue API the frontend polls (see
[LOCAL_API_MODE.md](LOCAL_API_MODE.md)) to actually execute anything.

**Macro Phase 5 (Remote Display Mode + Pairing)** added display/controller
device registration, pairing, and `displayId`-scoped remote command routes
on top of this same backend — see [REMOTE_MODE_SPEC.md](REMOTE_MODE_SPEC.md),
[PAIRING_SPEC.md](PAIRING_SPEC.md), and
[REMOTE_COMMANDS_SPEC.md](REMOTE_COMMANDS_SPEC.md). Everything below this
point describes the original local-only surface, which is unchanged.

## Runtime

`apps/server` runs via `tsx` (esbuild-based TS runner), both in dev
(`tsx watch`) and production (`tsx src/index.ts`) — same trade-off Vite
already makes for the frontend: `packages/shared`'s `package.json` points
`main`/`types` at raw `.ts` source, so introducing a compile step for the
backend just to consume it would be extra tooling for no real benefit at
local scale. Easily revisited (`tsc` build stage + `node dist/index.js`)
before any real production deployment.

## Environment variables

| Variable | Default | Notes |
|---|---|---|
| `PLATE_RUNNER_API_KEY` | `dev-local-key` | Logs a loud `console.warn` on startup if unset — louder wording when `NODE_ENV=production`. |
| `PLATE_RUNNER_SERVER_PORT` | `8787` | |
| `PLATE_RUNNER_STORAGE_PATH` | `./data` | Created if missing. SQLite file lives at `<path>/plate-runner.sqlite3`. |
| `PLATE_RUNNER_CORS_ORIGINS` | `http://localhost:5173,http://localhost:8080` | Comma-separated allowlist. Unset falls back to the default with a `console.warn` (Phase 5). |

## API security

- Every route under `/api/*` requires the API key, via `x-api-key: <key>` **or**
  `Authorization: Bearer <key>`. Missing/mismatched key → `401 { ok: false, error: 'unauthorized' }`.
- `GET /health` is the one unauthenticated route — registered directly on the
  root Fastify instance, outside the `/api`-scoped auth hook (a Fastify
  plugin-encapsulation boundary, not a per-route exception list).
- Rate limiting via `@fastify/rate-limit`, 100 req/min per IP, scoped to `/api/*`.
  Basic/best-effort, not hardened — see [SECURITY_NOTES.md](SECURITY_NOTES.md).
- CORS is permissive (`origin: true`) — a deliberate local-only relaxation,
  flagged in SECURITY_NOTES.md as something to tighten before any non-localhost
  exposure.
- All plate/enum/body validation reuses `@plate-runner/shared`'s validators
  (`validatePlate`, `VEHICLE_COLORS`, `DIRECTIONS`, `DETECTOR_PLACEMENTS`,
  `GATE_MODES`, `GATE_INITIAL_STATES`, `PLATE_QUEUE_MODES`, `MAX_QUEUE_SIZE`,
  `MAX_PLATE_LIST_PLATES`) — identical rules to the frontend, never
  reimplemented. Invalid input → `400 { ok: false, error }`.
- Plate text is never rendered as HTML anywhere in this stack (see
  `docs/SECURITY_SPEC.md` §2) — the backend only stores/forwards it as JSON.

## Storage

`better-sqlite3` (synchronous native driver, WAL mode), no ORM — raw prepared
statements in `apps/server/src/storage/{db,commandsRepo,listsRepo}.ts`.
Installed cleanly via a prebuilt binary in this environment (no native
compile step, no JSON fallback needed). Two tables:

- `simulation_commands` — `id, type, payload (JSON text), status, createdAt, updatedAt, claimedAt, completedAt, error`, indexed on `status`/`createdAt`.
- `plate_lists` — `id, name, description, plates (JSON text), simulationDefaults (JSON text), createdAt, updatedAt, version`.

`initStorage()` never throws: if the SQLite file can't be opened (missing
permissions, corrupted file, unwritable path), it logs a clear error and
falls back to an in-memory (`:memory:`) database rather than crashing —
mirrors the frontend's established localStorage-corruption-recovery
philosophy. `GET /api/status` reports which mode is active
(`storage: { type: 'sqlite', ok: true|false }`).

## Logging

Request logging (`onResponse` hook) emits exactly:
`{ timestamp, method, path, statusCode, ip, userAgent, requestId }`.

The Fastify logger's `req` serializer is overridden to only ever surface
`{method, url, hostname, remoteAddress}` — this structurally guarantees the
API key (sent as a header) can never end up in a log line, rather than
relying on remembering to redact it. Command creation additionally logs
`{ commandId, type, sourceIp, createdAt }`.

## Endpoints

All bodies/responses are JSON. A POST with no body still needs
`Content-Type: application/json` to be sent safely — Fastify's JSON parser
is configured to treat an empty body as `{}` rather than rejecting it (see
"Empty JSON body" note in [LOCAL_API_MODE.md](LOCAL_API_MODE.md)).

### `GET /health` — unauthenticated

```json
{ "ok": true, "service": "plate-runner-server", "version": "0.1.0", "time": "2026-08-06T00:00:00.000Z" }
```

### `GET /api/status`

```json
{
  "ok": true,
  "serverTime": "2026-08-06T00:00:00.000Z",
  "storage": { "type": "sqlite", "ok": true },
  "commands": { "pending": 0, "claimed": 0, "completedLastHour": 3, "failedLastHour": 0 }
}
```

### `POST /api/simulate` — run a single plate

Body: `{ plate, direction, detectorPlacement, vehicleColor, gateConfig, queueConfig }`
(same shapes as `SimulationConfig`/`GateConfig`/`PlateQueueConfig` in
`@plate-runner/shared`). Creates a `run_plate` command.

```json
{ "ok": true, "commandId": "…", "status": "pending" }
```

### `POST /api/simulate/queue` — run several plates

Body: `{ plates: string[], direction, detectorPlacement, vehicleColor, gateConfig, queueConfig }`
(`plates.length` ≤ `MAX_QUEUE_SIZE`, each validated). Creates a `run_queue` command.

### `POST /api/simulation/{pause,resume,stop,skip-current,open-gate}`

Each creates the correspondingly-typed command (`pause`, `resume`, `stop`,
`skip_current`, `open_gate`) with an empty payload. Response: `{ ok: true, commandId }`.

### Generic command CRUD — see [API_COMMANDS_SPEC.md](API_COMMANDS_SPEC.md)

`POST /api/simulation/commands`, `GET /api/simulation/commands/pending`,
`POST /api/simulation/commands/:id/{claim,complete,fail}`,
`GET /api/simulation/commands/:id`.

### Command history

- `GET /api/commands` — supports `?status=` / `?limit=`.
- `GET /api/commands/:id`.
- `GET /api/history` — alias of `GET /api/commands`; no separate history
  storage concept, the commands table *is* the history.

### Plate Lists — see also [PLATE_LISTS_SPEC.md](PLATE_LISTS_SPEC.md)

- `GET /api/lists`, `POST /api/lists` (`201` on create).
- `GET /api/lists/:id`, `PUT /api/lists/:id`, `DELETE /api/lists/:id`.
- `POST /api/lists/:id/run` — creates a `run_list` command whose payload
  embeds the **full list snapshot** at the time of the call (not just the id),
  so a concurrent edit/delete of the list can't race the eventual execution.

### Display, pairing, and remote routes (Phase 5)

`POST /api/displays/register`, display-secret-authenticated
`/api/displays/:displayId/*` (heartbeat, pairing-code, pairings, revoke,
commands), `POST /api/controllers/pair`, and controller-token-authenticated
`/api/remote/displays/:displayId/*` — see
[PAIRING_SPEC.md](PAIRING_SPEC.md) and
[REMOTE_COMMANDS_SPEC.md](REMOTE_COMMANDS_SPEC.md) for the full reference.

## Files

`apps/server/src/{index.ts, config.ts}`, `src/routes/*.ts`, `src/services/*.ts`,
`src/storage/*.ts`, `src/security/*.ts`, `src/logging/requestLogger.ts`.
`packages/shared/src/types/simulationCommand.ts` for the shared command types.
