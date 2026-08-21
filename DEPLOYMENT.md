# Deployment

Single entry point for running and deploying Plate Runner. This is a
project-handoff document — self-contained enough to actually deploy from,
but the deep dives (security posture, staging smoke test, Docker image
internals) stay in `docs/` and are linked below rather than duplicated.

## Architecture at a glance

Monorepo, two deployable services, one shared package:

| Service | Path | Stack | Purpose |
|---|---|---|---|
| `plate-runner-server` | `apps/server` | Fastify + TypeScript (`tsx`, no build step) + SQLite (`better-sqlite3`) | API, command queue, pairing, storage |
| `plate-runner-web` | `apps/web` | React + TypeScript + Vite, built static, served by nginx | The simulator UI |
| — | `packages/shared` | TypeScript, no build step (consumed as raw source by both) | Shared types, validation, plate rules |

The frontend's backend URL and API key are **runtime-configured** in the
app itself (Settings → API), not baked in at build time — one `plate-runner-web`
build works against any `plate-runner-server` instance. There is no
build-time `VITE_*` env var for this today (see "Optional: a default API
Base URL" below if you want to change that).

---

## 1. Local development

```bash
pnpm install
pnpm dev            # web (http://localhost:5173) + server (http://localhost:8787) together
pnpm dev:web         # frontend only
pnpm dev:server      # backend only
```

Backend defaults with no env vars set: port `8787`, API key `dev-local-key`,
SQLite at `./data` (relative to `apps/server`). Full local-dev reference,
including LAN setup for testing from a second device:
[docs/OPERATIONS_GUIDE.md](docs/OPERATIONS_GUIDE.md).

---

## 2. Local Docker (production-like, self-contained)

```bash
docker compose up --build
# web:    http://localhost:8080
# server: http://localhost:8787
```

- `apps/server/Dockerfile` — `node:22-bookworm-slim`, no build stage (runs
  via `tsx`, same as local dev), `better-sqlite3` friendly (glibc, not
  alpine).
- `apps/web/Dockerfile` — multi-stage: `pnpm --filter web build` in a
  Node build stage, then served statically by `nginx:alpine`
  (`apps/web/nginx.conf` sets baseline security headers; `connect-src *`
  in its CSP is intentional — see that file's header comment).
- `docker-compose.yml` wires a named volume (`plate-runner-data` →
  `/data`) for the server's SQLite file, so data survives `docker compose
  down`/`up` (not `docker compose down -v`, which does remove it).
- Both containers bind `0.0.0.0`, so a second device on the same LAN can
  already reach either one — the only thing you may need to set
  explicitly for that is `PLATE_RUNNER_CORS_ORIGINS` (see below).

Image/layer details: [docs/DOCKER_SETUP.md](docs/DOCKER_SETUP.md).

---

## 3. Production deployment (Railway)

Deployed today as two Railway services from this one repo (project
`plate-runner-2`), each built from its own Dockerfile via Railway's
per-service root-directory + Dockerfile-path settings — **no
`railway.json`** (a deliberate choice; see
[docs/RAILWAY_DEPLOYMENT_PLAN.md](docs/RAILWAY_DEPLOYMENT_PLAN.md) for why).

| Railway service | Dockerfile | Build/start |
|---|---|---|
| `plate-runner-server` | `apps/server/Dockerfile` | Dockerfile `CMD` — no extra config needed |
| `plate-runner-web` | `apps/web/Dockerfile` | Dockerfile multi-stage build — no extra config needed |

Railway builds both from the repo root context (`context: .`, same as
Docker Compose locally), so no Dockerfile `COPY` path changes are needed
between local and Railway.

### Deploy order

1. Create/deploy `plate-runner-web` first (or note its Railway-generated
   domain in advance — you need it for step 2).
2. Create `plate-runner-server`, attach a **Railway Volume**, set its env
   vars (table below), deploy.
3. Set `plate-runner-server`'s `PLATE_RUNNER_CORS_ORIGINS` to
   `plate-runner-web`'s exact public origin (scheme + host, no path, no
   trailing slash). Redeploy `plate-runner-server` — CORS origins are read
   once at startup, not hot-reloaded.
4. If you attach a custom domain to `plate-runner-web` later, add it to
   `PLATE_RUNNER_CORS_ORIGINS` as a second comma-separated entry and
   redeploy `plate-runner-server` again.

### Volume (required)

Attach a Railway Volume to `plate-runner-server`, mounted at the same path
as `PLATE_RUNNER_STORAGE_PATH` (e.g. `/data`). **Without this, the SQLite
file lives on the container's ephemeral filesystem and all data — displays,
pairings, plate lists synced via API, execution history — is lost on every
redeploy or restart.** `apps/server/src/config.ts` prints a startup warning
if `PLATE_RUNNER_ENV=production` and `PLATE_RUNNER_STORAGE_PATH` is unset.

### Private networking doesn't help here

Railway's internal service-to-service DNS doesn't apply to the
browser→API leg — the browser itself calls whatever API Base URL is
configured in Settings, so that URL must be **publicly reachable**
regardless of whether the two services can also reach each other
privately. No BFF/proxy layer exists to change this (deliberate — see
`docs/RAILWAY_DEPLOYMENT_PLAN.md`'s "Private networking" section for the
tradeoff reasoning).

---

## 4. Environment variables

### `plate-runner-server`

| Variable | Required in production? | Default | Notes |
|---|---|---|---|
| `PLATE_RUNNER_ENV` | Yes — set to `production` | unset | Gates ALL hardening below. Deliberately independent of `NODE_ENV` (the Dockerfile sets `NODE_ENV=production` unconditionally for unrelated Node-ecosystem reasons). |
| `PLATE_RUNNER_API_KEY` | Yes | `dev-local-key` (rejected in production) | ≥32 chars, must not equal the dev default. Generate: `openssl rand -hex 32`. Sent as `x-api-key` on every `/api/*` request. |
| `PLATE_RUNNER_CORS_ORIGINS` | Yes | `http://localhost:5173,http://localhost:8080` (no fallback in production — server refuses to start) | Comma-separated exact origins (scheme+host, no path/trailing slash) the frontend is served from. |
| `PLATE_RUNNER_STORAGE_PATH` | Strongly recommended | `./data` | SQLite file location. Point at a mounted persistent Volume in any non-local deployment. |
| `PORT` | Set by Railway automatically — do not set yourself | — | Read first; falls back to `PLATE_RUNNER_SERVER_PORT`, then `8787`, only if absent. A prior bug had the app ignore Railway's injected `PORT` entirely — fixed, but don't override it manually on Railway. |
| `PLATE_RUNNER_SERVER_PORT` | No | `8787` | Local/non-Railway port override. |
| `PLATE_RUNNER_PAIRING_TOKEN_TTL_DAYS` | No | unset = controller tokens never expire | Recommended 30–90 for a public deployment. Current production value: `30`. |
| `PLATE_RUNNER_DISPLAY_SECRET_TTL_DAYS` | No | unset = display secrets never expire | Same 30–90 day recommendation; only applies to newly registered/rotated secrets, never retroactively. |
| `PLATE_RUNNER_BODY_LIMIT_BYTES` | No | `1000000` | Request body size cap. |
| `PLATE_RUNNER_RATE_LIMIT_GENERAL_PER_MIN` | No | `100` | General `/api/*` rate limit. |
| `PLATE_RUNNER_RATE_LIMIT_REMOTE_PER_MIN` | No | `30` | Stricter limit for `/api/remote/*` (controller commands). |
| `PLATE_RUNNER_RATE_LIMIT_PAIRING_PER_MIN` | No | `10` | Stricter limit for pairing endpoints. |

Templates: `.env.example` (local dev), `.env.production.example` (generic
hardened deploy), `.env.railway.example` (Railway-specific, with the
exact comments above) — all at the repo root, no real secrets in any of
them.

### `plate-runner-web`

**No required environment variables.** The API Base URL and API key are
set at runtime by whoever opens the app (Settings → API), not baked in at
build time.

**Optional: a default API Base URL.** If you'd rather ship a sensible
pre-filled backend URL so operators don't have to type it by hand on
first load, that would mean adding a `VITE_DEFAULT_API_BASE_URL` build-time
variable and wiring it into `useApiCommandListener`'s initial state — not
implemented today (a product decision, not a technical blocker). If you
add this later, document it in `docs/RAILWAY_DEPLOYMENT_PLAN.md` and this
file.

---

## 5. Generating and rotating the API key

```bash
openssl rand -hex 32
# or, without openssl:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the result directly into Railway's Variables tab (or your `.env`)
for `PLATE_RUNNER_API_KEY` — never commit it, never paste it into any doc
in this repo.

**To rotate:** generate a new key the same way, update
`PLATE_RUNNER_API_KEY`, redeploy `plate-runner-server` (env var changes
require a redeploy — same as CORS). **The old key stops working the
instant the new deploy is live — there is no overlap window.** Every
client (Display Mode, Controller Mode, any external integration, anyone's
local Settings → API config, and any `pairing-result.json`-driven CLI
script — see `docs/CONTROLLER_CLI_TOOLS.md`) needs the new key before its
next request or it starts getting `401`s. Rotate on a suspected leak, or
on a routine schedule if this deployment's policy calls for one — there's
no automated reminder for this today.

---

## 6. Verifying a deployment

- `GET /health` on `plate-runner-server` — unauthenticated, returns
  `{ ok: true, service, version, time }`. Use this as the Railway health
  check / first smoke test.
- `GET /api/status` (needs `x-api-key`) — storage type/health, pending
  command counts.
- Full 25-step staging smoke test (both services, the Volume, CORS, the
  full Display/Controller pairing + remote-control flow, secret
  rotation/revocation, a restart to confirm Volume persistence, and a
  log/backup scan for leaked secrets):
  [docs/RAILWAY_STAGING_SMOKE_TEST.md](docs/RAILWAY_STAGING_SMOKE_TEST.md).

---

## 7. Rollback

Railway keeps prior deployments/images per service. If a deploy
regresses: redeploy the last known-good deployment for the affected
service from Railway's dashboard — reuses the previously-built image, no
rebuild, typically near-instant. The Volume is a separate persistent
resource from the container image, so a rollback doesn't undo any data
changes made under the newer version — only which binary is running.

---

## 8. Pre-deploy checklist

- [ ] `PLATE_RUNNER_API_KEY` generated fresh (`openssl rand -hex 32`),
      set only in Railway's Variables tab / a real (gitignored) `.env` —
      never committed.
- [ ] `PLATE_RUNNER_ENV=production` set on `plate-runner-server`.
- [ ] `PLATE_RUNNER_CORS_ORIGINS` set to the exact `plate-runner-web`
      origin(s) — the server refuses to start if this is missing in
      production; confirm that's actually true before relying on it.
- [ ] Railway Volume attached to `plate-runner-server`,
      `PLATE_RUNNER_STORAGE_PATH` pointed at its mount path.
- [ ] `PLATE_RUNNER_PAIRING_TOKEN_TTL_DAYS` / `PLATE_RUNNER_DISPLAY_SECRET_TTL_DAYS`
      set if this deployment should expire controller tokens/display
      secrets (recommended beyond a short-lived demo).
- [ ] Read [docs/SECURITY_AUDIT_RAILWAY_READINESS.md](docs/SECURITY_AUDIT_RAILWAY_READINESS.md) —
      confirm none of its "Known Risks" are unacceptable for this
      deployment's actual use case.
- [ ] Work through [docs/RAILWAY_SECURITY_CHECKLIST.md](docs/RAILWAY_SECURITY_CHECKLIST.md)
      (superset of this list — secrets hygiene, domain documentation).
- [ ] After deploying, run [docs/RAILWAY_STAGING_SMOKE_TEST.md](docs/RAILWAY_STAGING_SMOKE_TEST.md)
      against the live deployment before calling it done.

---

## 9. Storage & data model reference

- **Backend**: SQLite at `PLATE_RUNNER_STORAGE_PATH` — the only durable,
  cross-device store (displays, pairings, remote-created commands,
  plate-list-run history created via API).
- **Frontend**: everything else (Plate Lists, Scheduler entries,
  Execution History, Display registration + secret, paired-controller
  tokens, app preferences) lives in the browser's `localStorage`, scoped
  per-origin — see [docs/OPERATIONS_GUIDE.md](docs/OPERATIONS_GUIDE.md)'s
  "Storage paths" table for the exact keys, and "Backups / export" for
  the built-in JSON export/import (Settings → API → Local Backup — never
  includes the API key, controller tokens, display secrets, or pairing
  codes).

---

## 10. Desktop app (Windows executable)

Beyond the two web services above, `apps/web` can also be shipped as a
native desktop app — most importantly a Windows `.exe`/`.msi` installer —
via Tauri (`apps/web/src-tauri`). This is a **distribution channel for
the frontend only**, not a replacement for `plate-runner-server`: the
desktop app still talks to a backend over the network exactly like the
browser version, configured the same way (Settings → API).

```bash
pnpm desktop:dev     # local dev, opens a native window
pnpm desktop:build   # builds an installer for whatever OS you run this on
```

Building an actual **Windows** installer from a non-Windows machine
requires CI — cross-compiling Tauri's Windows bundler is unreliable.
[.github/workflows/desktop-build.yml](.github/workflows/desktop-build.yml)
builds it on a real `windows-latest` GitHub Actions runner, **automatically
on every relevant push to `main`** (updating a rolling `desktop-latest`
GitHub Release in place), on manual trigger, or by pushing a `desktop-v*`
tag (cuts a separate, versioned draft Release instead).

The web app itself has a **"Download for Windows" button** (Settings →
Desktop App) linking to the rolling release's GitHub page — always the
latest build, no manual step to update the link. It links to the release
*page* rather than the raw file on purpose, so it keeps working
unchanged whether the repo is public or (as planned) moved into a
private org — GitHub handles the login prompt itself when needed.

Full details, known limitations (unsigned installer, placeholder icons,
no auto-update, no per-build version/changelog on the rolling release):
[docs/DESKTOP_APP.md](docs/DESKTOP_APP.md).

---

## 11. Related docs

This file is the deployment entry point; these go deeper on one aspect
each rather than being duplicated here:

| Doc | Covers |
|---|---|
| [docs/OPERATIONS_GUIDE.md](docs/OPERATIONS_GUIDE.md) | Day-to-day running/config reference, troubleshooting table |
| [docs/DOCKER_SETUP.md](docs/DOCKER_SETUP.md) | Docker image/layer internals |
| [docs/RAILWAY_DEPLOYMENT_PLAN.md](docs/RAILWAY_DEPLOYMENT_PLAN.md) | The original Railway service-design decisions and reasoning |
| [docs/SECURITY_AUDIT_RAILWAY_READINESS.md](docs/SECURITY_AUDIT_RAILWAY_READINESS.md) | Current security posture, known risks |
| [docs/RAILWAY_SECURITY_CHECKLIST.md](docs/RAILWAY_SECURITY_CHECKLIST.md) | Full pre-deploy checklist |
| [docs/RAILWAY_STAGING_SMOKE_TEST.md](docs/RAILWAY_STAGING_SMOKE_TEST.md) | 25-step post-deploy verification script |
| [docs/SECURITY_NOTES.md](docs/SECURITY_NOTES.md) | Full security model (secrets, tokens, what's never logged/rendered) |
| [docs/DESKTOP_APP.md](docs/DESKTOP_APP.md) | Windows desktop app (Tauri) — local dev/build, CI, known limitations |
| [docs/CONTROLLER_CLI_TOOLS.md](docs/CONTROLLER_CLI_TOOLS.md) | CLI scripts for pairing/sending commands against a deployed backend |
| [RAILWAY_API_USAGE.md](RAILWAY_API_USAGE.md) | Practical curl-based API usage examples against a live deployment |
