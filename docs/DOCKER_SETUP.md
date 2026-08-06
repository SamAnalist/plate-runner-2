# Docker Setup

Packages `apps/server` and `apps/web` as two containers, wired via
`docker-compose.yml` at the repo root. See
[OPERATIONS_GUIDE.md](OPERATIONS_GUIDE.md) for the broader day-to-day
operations picture (pnpm vs. Docker, backups, storage resets, Screen
Saver, troubleshooting).

## Services

| Service | Image base | Host port | Container port |
|---|---|---|---|
| `plate-runner-server` | `node:22-bookworm-slim` | `8787` | `8787` |
| `plate-runner-web` | `nginx:alpine` (multi-stage build from `node:22-bookworm-slim`) | `8080` | `80` |

`node:22-bookworm-slim` (glibc, not alpine) is used for both build stages —
it minimizes native-module friction for `better-sqlite3`'s prebuilt
binaries, and matches the pnpm version required (see "pnpm/Node version
pinning" below).

## Environment variables

Same four as running locally (see [BACKEND_API_SPEC.md](BACKEND_API_SPEC.md)),
passed through `docker-compose.yml` to `plate-runner-server`. See also
`.env.example` at the repo root.

| Variable | Compose default |
|---|---|
| `PLATE_RUNNER_API_KEY` | `dev-local-key` (override via a `.env` file or `PLATE_RUNNER_API_KEY=... docker compose up`) |
| `PLATE_RUNNER_SERVER_PORT` | `8787` (fixed in compose) |
| `PLATE_RUNNER_STORAGE_PATH` | `/data` (fixed in compose, backed by the named volume below) |
| `PLATE_RUNNER_CORS_ORIGINS` | `http://localhost:5173,http://localhost:8080` (Phase 5 — matches the compose web/dev ports by default) |

## Persistence

`plate-runner-server`'s `/data` is a named Docker volume
(`plate-runner-data`), so SQLite data survives `docker compose down` /
`docker compose up` and container restarts — only `docker compose down -v`
discards it. This covers every table, including the Phase 5 ones
(`display_devices`, `pairing_sessions`, `device_pairings`) — verified by
registering a display and pairing a controller, then `docker compose
restart plate-runner-server` and confirming the pairing was still listed
afterward.

## Running it

```bash
docker compose up --build
# web:    http://localhost:8080
# server: http://localhost:8787
```

Or without Docker: `pnpm dev` (runs `dev:web` + `dev:server` concurrently),
`pnpm dev:web`, `pnpm dev:server`, `pnpm server:start` (production-mode
server only, no watch).

## LAN Access (real two-computer testing)

Both `docker compose`'s port mappings (`8787:8787`, `8080:80`) and the
`tsx`-run backend (`fastify.listen({ host: '0.0.0.0' })`, unconditional —
not configurable, since there's no reason for it to ever be narrower on a
local/LAN box) already bind to **every** network interface, not just
`localhost` — so a second computer on the same network can already reach
either setup at `http://<this-machine's-LAN-IP>:8787` / `:8080` with no
code changes. Starting the backend (Docker or `tsx`) prints its detected
LAN IP(s) directly to the console on startup, e.g.:

```
plate-runner-server listening on http://localhost:8787 (storage: sqlite)
  also reachable from other devices on this network at: http://192.168.1.50:8787
```

The one thing that **does** need to be set explicitly for a second machine
to work is `PLATE_RUNNER_CORS_ORIGINS` — the default only allows
`localhost:5173`/`:8080`, so a browser opened on the *second* computer
(pointed at either machine's frontend) needs its actual origin added, e.g.:

```bash
PLATE_RUNNER_CORS_ORIGINS=http://localhost:5173,http://localhost:8080,http://192.168.1.50:5173,http://192.168.1.50:8080 \
  docker compose up --build
```

See `.env.example` and
[MANUAL_TESTING_GUIDE.md](MANUAL_TESTING_GUIDE.md)'s "Real LAN Testing: Two
Computers" section for the full walkthrough — including what CORS actually
does and doesn't block here (a missing origin doesn't stop the *backend*
from processing the request; it stops the *browser* from letting frontend
JS read the response, which is what makes Test Connection/pairing/etc. look
like they're failing when it's really a CORS misconfiguration).

## pnpm/Node version pinning

Root `package.json` pins `"packageManager": "pnpm@11.9.0"`. Without this,
`corepack enable` inside the image resolves the *latest* pnpm at build time
(11.20.0 during this phase), which requires Node ≥ 22.13 — that broke the
build under a `node:20` base image with a cryptic
`ERR_UNKNOWN_BUILTIN_MODULE: node:sqlite` error (pnpm itself failing to
start, not anything in this project). Fixed by pinning `packageManager` and
using `node:22-bookworm-slim` as the base for both Dockerfiles, so the
image's corepack-resolved pnpm version always matches what's locally
verified against this lockfile.

## Verified

`docker compose up --build` was run end-to-end during this phase:

- Both images build cleanly, including `better-sqlite3`'s native postinstall
  step (resolved via a prebuilt binary — no compiler toolchain needed in the
  image).
- `GET /health` → `200`, `GET /api/status` without a key → `401`, with the
  key → `200`, `storage.type: "sqlite"`, `storage.ok: true`.
- `http://localhost:8080` serves the built frontend.
- A command created via `POST /api/simulate` survived `docker compose
  restart plate-runner-server` (still `pending` afterward) — confirms the
  named-volume persistence works, not just same-process persistence.
- The API key does not appear anywhere in `docker logs plate-runner-server`.

## Known limitations

- No HTTPS / reverse proxy — this is a local/LAN setup, not internet-facing.
  See [SECURITY_NOTES.md](SECURITY_NOTES.md).
- `plate-runner-web`'s nginx config is the image default (no API reverse
  proxy) — the frontend talks to `plate-runner-server` directly via the
  configurable Local API base URL, not through nginx.
- No dedicated `.env` file support in `docker-compose.yml` beyond Compose's
  own default `.env` file lookup — copy `.env.example` to `.env` at the repo
  root, or set overrides inline (`PLATE_RUNNER_API_KEY=... docker compose up`).
