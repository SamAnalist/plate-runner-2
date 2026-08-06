# Docker Setup

Packages `apps/server` and `apps/web` as two containers, wired via
`docker-compose.yml` at the repo root.

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

Same three as running locally (see [BACKEND_API_SPEC.md](BACKEND_API_SPEC.md)),
passed through `docker-compose.yml` to `plate-runner-server`:

| Variable | Compose default |
|---|---|
| `PLATE_RUNNER_API_KEY` | `dev-local-key` (override via a `.env` file or `PLATE_RUNNER_API_KEY=... docker compose up`) |
| `PLATE_RUNNER_SERVER_PORT` | `8787` (fixed in compose) |
| `PLATE_RUNNER_STORAGE_PATH` | `/data` (fixed in compose, backed by the named volume below) |

## Persistence

`plate-runner-server`'s `/data` is a named Docker volume
(`plate-runner-data`), so SQLite data survives `docker compose down` /
`docker compose up` and container restarts — only `docker compose down -v`
discards it.

## Running it

```bash
docker compose up --build
# web:    http://localhost:8080
# server: http://localhost:8787
```

Or without Docker: `pnpm dev` (runs `dev:web` + `dev:server` concurrently),
`pnpm dev:web`, `pnpm dev:server`, `pnpm server:start` (production-mode
server only, no watch).

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
- No `.env.example` file yet — env var overrides must be set manually
  (`PLATE_RUNNER_API_KEY=... docker compose up` or a self-authored `.env`).
