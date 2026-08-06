# Railway Deployment Plan

A concrete plan for deploying Plate Runner to Railway. **This document is
preparation, not a record of an actual deployment** — no Railway project
has been created or connected as part of this phase. Read
[SECURITY_AUDIT_RAILWAY_READINESS.md](SECURITY_AUDIT_RAILWAY_READINESS.md)
first; this plan assumes that audit's hardening is already in place
(it is, as of this phase).

## Services

Two Railway services from this one monorepo, each pointed at a different
build context/Dockerfile via Railway's per-service root directory and
Dockerfile path settings:

| Service | Dockerfile | Purpose |
|---|---|---|
| `plate-runner-server` | `apps/server/Dockerfile` | Fastify API + SQLite |
| `plate-runner-web` | `apps/web/Dockerfile` | Static frontend (nginx) |

Railway builds from the repo root context for both (same as
`docker-compose.yml` does locally — `context: .`), so no changes to
either Dockerfile's `COPY` paths are needed.

## Environment variables

### `plate-runner-server`

See `.env.railway.example` for the full annotated list. Required:

| Variable | Value |
|---|---|
| `PLATE_RUNNER_ENV` | `production` |
| `PLATE_RUNNER_API_KEY` | Generated via `openssl rand -hex 32`, set directly in Railway's Variables tab — never committed |
| `PLATE_RUNNER_CORS_ORIGINS` | The `plate-runner-web` service's public Railway URL (and/or custom domain) |
| `PLATE_RUNNER_STORAGE_PATH` | The mount path of an attached Railway Volume, e.g. `/data` |

`PORT` — **do not set this yourself.** Railway injects it automatically;
this app reads `process.env.PORT` first (falling back to
`PLATE_RUNNER_SERVER_PORT`, then `8787`, only if `PORT` is absent). This
was a real bug found during the security audit — the app previously only
read `PLATE_RUNNER_SERVER_PORT` and would have silently ignored Railway's
port, causing the deploy's health check to fail. Fixed in
`apps/server/src/config.ts`.

Optional (all have safe defaults):
`PLATE_RUNNER_PAIRING_TOKEN_TTL_DAYS` (recommend 30–90 for a public
deployment), `PLATE_RUNNER_BODY_LIMIT_BYTES`,
`PLATE_RUNNER_RATE_LIMIT_GENERAL_PER_MIN`,
`PLATE_RUNNER_RATE_LIMIT_REMOTE_PER_MIN`,
`PLATE_RUNNER_RATE_LIMIT_PAIRING_PER_MIN`.

### `plate-runner-web`

No required environment variables. The frontend's backend URL is set at
runtime by whoever opens the app (Settings / API → API Base URL), not
baked in at build time — this is an intentional existing design (see
`docs/APP_NAVIGATION_SPEC.md`), which is also why `apps/web/nginx.conf`'s
CSP uses a permissive `connect-src *` rather than pinning one API origin.
If you'd rather ship a sensible default so operators don't have to type
the backend URL by hand on first load, that would mean adding a
`VITE_DEFAULT_API_BASE_URL` build-time variable and wiring it into
`useApiCommandListener`'s initial state — not done in this phase (a
product change, not a security one), noted here as a future option.

## Build & start commands

Railway builds each service from its Dockerfile directly — no separate
build/start command configuration is needed beyond what's already in
each `Dockerfile`:

- `plate-runner-server`: `CMD ["pnpm", "--filter", "server", "start"]`
  (runs `tsx src/index.ts`, no separate build step — this project runs
  the backend via `tsx`, not a compiled `dist/`, matching local dev).
- `plate-runner-web`: multi-stage build (`pnpm --filter web build` in the
  build stage, then served statically by nginx) — no start command,
  nginx's own entrypoint handles it.

## Volume

Attach a Railway Volume to `plate-runner-server` and mount it at the same
path as `PLATE_RUNNER_STORAGE_PATH` (e.g. `/data`, matching the existing
local Docker Compose setup's named-volume mount point). Without this, the
SQLite file lives on the service's ephemeral container filesystem and
**all data is lost on every redeploy or restart.**

## CORS / domain setup

1. Deploy `plate-runner-web` first (or note its Railway-generated domain
   in advance).
2. Set `plate-runner-server`'s `PLATE_RUNNER_CORS_ORIGINS` to that exact
   origin (scheme + host, no path, no trailing slash) — e.g.
   `https://plate-runner-web-production.up.railway.app`.
3. If you attach a custom domain to `plate-runner-web`, add it to
   `PLATE_RUNNER_CORS_ORIGINS` as a second comma-separated entry (both
   the Railway-generated domain and the custom one can stay valid
   simultaneously).
4. Redeploy `plate-runner-server` after any CORS origin change — it's
   read once at startup, not hot-reloaded.

## Private networking

Railway's private networking (internal service-to-service DNS) doesn't
help the browser→API leg here — the browser itself makes the `fetch()`
calls to whatever API Base URL is configured in Settings, so that URL
must be a **publicly reachable** address regardless of whether the two
services happen to also be able to reach each other privately within
Railway. No BFF/proxy layer is introduced to change this — it would add
real complexity (an extra service, extra latency, another thing to keep
in sync) for a security property (hiding the backend's public URL) that
the API key already provides. Documented here as a deliberate
non-change, not an oversight.

## Pre-deploy security checklist

Before the first real Railway deploy:

- [ ] `PLATE_RUNNER_API_KEY` generated via `openssl rand -hex 32` (or
      equivalent), set only in Railway's Variables tab, not committed
      anywhere.
- [ ] `PLATE_RUNNER_ENV=production` set on `plate-runner-server`.
- [ ] `PLATE_RUNNER_CORS_ORIGINS` set to the exact `plate-runner-web`
      origin(s) — confirm the server fails to start if this is missing
      (see `SECURITY_AUDIT_RAILWAY_READINESS.md`'s manual QA).
- [ ] A Railway Volume attached and `PLATE_RUNNER_STORAGE_PATH` pointed
      at its mount path.
- [ ] `PLATE_RUNNER_PAIRING_TOKEN_TTL_DAYS` set if this deployment should
      have controller tokens expire (recommended for anything beyond a
      short-lived demo).
- [ ] Re-read `SECURITY_AUDIT_RAILWAY_READINESS.md`'s Known Risks —
      confirm none of the Medium risks are unacceptable for this
      deployment's actual use case.

## Rollback plan

Railway keeps prior deployments/images per service. If a deploy
introduces a regression: use Railway's dashboard to redeploy the last
known-good deployment for the affected service (this reuses the
previously-built image, no rebuild needed, typically near-instant). The
SQLite Volume is unaffected by a service rollback since it's a separate
persistent resource, not part of the container image — a rollback does
not undo any data changes made under the newer version, only which
binary is running.
