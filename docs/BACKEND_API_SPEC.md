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
| `PLATE_RUNNER_ENV` | (unset) | Set to `production` to enable hard production validation — see below. Independent of `NODE_ENV`. |
| `PLATE_RUNNER_API_KEY` | `dev-local-key` | In development: logs a `console.warn` if unset. **When `PLATE_RUNNER_ENV=production`: required, must be ≥32 chars, must not be `dev-local-key` — startup aborts otherwise.** |
| `PLATE_RUNNER_SERVER_PORT` | `8787` | Only used if the `PORT` env var (Railway's convention) is absent. |
| `PLATE_RUNNER_STORAGE_PATH` | `./data` | Created if missing. SQLite file lives at `<path>/plate-runner.sqlite3`. Warns loudly in production if left at the default (likely means no persistent volume was configured). |
| `PLATE_RUNNER_CORS_ORIGINS` | `http://localhost:5173,http://localhost:8080` | Comma-separated allowlist. In development, unset falls back to the default with a `console.warn`. **In production, unset aborts startup — no fallback.** |
| `PLATE_RUNNER_BODY_LIMIT_BYTES` | `1000000` | Fastify's global request body size cap. |
| `PLATE_RUNNER_PAIRING_TOKEN_TTL_DAYS` | (unset = never expires) | Optional controller-token TTL — see [PAIRING_SPEC.md](PAIRING_SPEC.md). |
| `PLATE_RUNNER_DISPLAY_SECRET_TTL_DAYS` | (unset = never expires) | Optional display-secret TTL, applied to new/rotated secrets only (not retroactive) — see [SECURITY_NOTES.md](SECURITY_NOTES.md)'s "Display secret lifecycle" section. |
| `PLATE_RUNNER_RATE_LIMIT_GENERAL_PER_MIN` | `100` | Global `/api/*` rate limit. |
| `PLATE_RUNNER_RATE_LIMIT_REMOTE_PER_MIN` | `30` | `/api/remote/*` rate limit. |
| `PLATE_RUNNER_RATE_LIMIT_PAIRING_PER_MIN` | `10` | Pairing-code/pair/register rate limit. |

See [SECURITY_AUDIT_RAILWAY_READINESS.md](SECURITY_AUDIT_RAILWAY_READINESS.md)
and [RAILWAY_DEPLOYMENT_PLAN.md](RAILWAY_DEPLOYMENT_PLAN.md) for the full
production/deployment picture.

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

Body: `{ plate, direction, detectorPlacement, vehicleColor, gateConfig, queueConfig, speedPreset? }`
(same shapes as `SimulationConfig`/`GateConfig`/`PlateQueueConfig` in
`@plate-runner/shared`). Creates a `run_plate` command.

```json
{ "ok": true, "commandId": "…", "status": "pending" }
```

### `POST /api/simulate/queue` — run several plates

Body: `{ plates: string[], direction, detectorPlacement, vehicleColor, gateConfig, queueConfig, speedPreset? }`
(`plates.length` ≤ `MAX_QUEUE_SIZE`, each validated). Creates a `run_queue` command.

### `speedPreset` (optional, on `/api/simulate`, `/api/simulate/queue`, and their `/api/remote/displays/:displayId/*` equivalents)

`"slow" | "regular" | "fast"` — sets all four `SpeedPhases` fields (initial/
stopping/afterStop/final, both directions) to a uniform value: slow=1,
regular=5, fast=10. Omitted → defaults to `"slow"` (favors camera
readability for unattended/automated callers). `"advanced"` is not accepted
here — it's a UI-only state for hand-tuning each phase individually and has
no API-exposed equivalent.

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

### Display, pairing, and remote routes (Phase 5 / 5.1)

`POST /api/displays/register`, display-secret-authenticated
`/api/displays/:displayId/*` (heartbeat, pairing-code, pairings, revoke,
commands, **pairing-requests + approve/reject — Phase 5.1**),
`POST /api/controllers/pair` (creates a pairing *request* as of Phase 5.1,
no longer returns a token directly), `GET
/api/controllers/pairing-requests/:id` and `POST .../finalize` (Phase
5.1), and controller-token-authenticated
`/api/remote/displays/:displayId/*` — see
[PAIRING_SPEC.md](PAIRING_SPEC.md) and
[REMOTE_COMMANDS_SPEC.md](REMOTE_COMMANDS_SPEC.md) for the full reference.

### Display secret lifecycle (Display Secret Lifecycle Hardening)

All three are display-secret-authenticated (`x-display-secret` /
`Authorization: Bearer`, same as the rest of `/api/displays/:displayId/*`).
See [SECURITY_NOTES.md](SECURITY_NOTES.md)'s "Display secret lifecycle"
section and [PAIRING_SPEC.md](PAIRING_SPEC.md)'s cascade-on-revoke section
for the full design.

#### `GET /api/displays/:displayId` — safe metadata

Returns display metadata, never `secretHash`:

```json
{
  "ok": true,
  "displayId": "…",
  "name": "…",
  "secretExpiresAt": null,
  "secretLastUsedAt": "2026-08-06T00:00:00.000Z",
  "revokedAt": null
}
```

#### `POST /api/displays/:displayId/rotate-secret`

Generates a new secret, invalidates the old one immediately, returns the
new plaintext value once:

```json
{
  "ok": true,
  "displayId": "…",
  "displaySecret": "<new plaintext, shown once>",
  "secretExpiresAt": null
}
```

#### `POST /api/displays/:displayId/revoke`

Revokes the display and cascades: revokes all of its `device_pairings`,
cancels any live `pairing_sessions`.

```json
{ "ok": true, "displayId": "…", "revokedAt": "2026-08-06T00:00:00.000Z" }
```

## Files

`apps/server/src/{index.ts, config.ts}`, `src/routes/*.ts`, `src/services/*.ts`,
`src/storage/*.ts`, `src/security/*.ts`, `src/logging/requestLogger.ts`.
`packages/shared/src/types/simulationCommand.ts` for the shared command types.
