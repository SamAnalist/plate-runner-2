# Plate Runner

A simulated license-plate reading scene for camera/ANPR testing —
local-first, with an optional local backend for remote control over a LAN.

## Quick Start

1. **Install dependencies:**
   ```bash
   pnpm install
   ```
2. **Run web + server locally:**
   ```bash
   pnpm dev        # web (http://localhost:5173) + backend (http://localhost:8787)
   ```
3. **Open the app** at `http://localhost:5173` — you'll land on Home.
4. **Run a plate:** open Local Simulator, type a plate (e.g. `ABC123`),
   click Start.
5. **Optional — Docker:**
   ```bash
   docker compose up --build   # web at http://localhost:8080, backend at http://localhost:8787
   ```
6. **Optional — LAN / Remote Mode:** pair a Display and a Controller on
   two devices on the same network — see
   [docs/MANUAL_TESTING_GUIDE.md](docs/MANUAL_TESTING_GUIDE.md)'s "Real
   LAN Testing" section.

For day-to-day operation (env vars, backups, storage resets, Screen
Saver, troubleshooting), see
[docs/OPERATIONS_GUIDE.md](docs/OPERATIONS_GUIDE.md). For a full
feature walkthrough, see
[docs/MANUAL_TESTING_GUIDE.md](docs/MANUAL_TESTING_GUIDE.md), or
[docs/DEMO_CHECKLIST.md](docs/DEMO_CHECKLIST.md) for a guided 10–15
minute demo.

## Project layout

```
apps/web/       React + TypeScript + Vite frontend (the simulation + control UI)
apps/server/    Fastify + SQLite local backend (command queue, pairing, remote control)
packages/shared/  Shared types and validators used by both
```

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Runs `apps/web` and `apps/server` together |
| `pnpm dev:web` / `pnpm dev:server` | Run just one |
| `pnpm build` | Production build of `apps/web` |
| `pnpm typecheck` | Type-checks all three workspace packages |
| `pnpm server:start` | Runs the backend without watch mode |

No `pnpm lint` or `pnpm test` script exists yet — see
[docs/RELEASE_CANDIDATE_QA.md](docs/RELEASE_CANDIDATE_QA.md)'s Known
Limitations for the current state of automated testing.

## Documentation

All project documentation lives in [docs/](docs/). Key entry points:

- [docs/RELEASE_NOTES.md](docs/RELEASE_NOTES.md) — current feature set, how to run, known limitations, and what's next.
- [docs/PROGRESS.md](docs/PROGRESS.md) — the full phase-by-phase build log.
- [docs/RELEASE_CANDIDATE_QA.md](docs/RELEASE_CANDIDATE_QA.md) — latest QA pass and release readiness status.
- [docs/OPERATIONS_GUIDE.md](docs/OPERATIONS_GUIDE.md) — running, configuring, backing up, and troubleshooting day-to-day.
- [docs/MANUAL_TESTING_GUIDE.md](docs/MANUAL_TESTING_GUIDE.md) — step-by-step manual testing.
- [docs/DEMO_CHECKLIST.md](docs/DEMO_CHECKLIST.md) — a guided 10–15 minute demo script.
- [docs/SCREEN_SAVER_SPEC.md](docs/SCREEN_SAVER_SPEC.md) — the configurable idle Screen Saver.
- [docs/SIMULATION_SPEC.md](docs/SIMULATION_SPEC.md) — how the simulation itself works.
- [docs/BACKEND_API_SPEC.md](docs/BACKEND_API_SPEC.md) — the local backend's REST API.
- [docs/REMOTE_MODE_SPEC.md](docs/REMOTE_MODE_SPEC.md) / [docs/PAIRING_SPEC.md](docs/PAIRING_SPEC.md) — Display/Controller remote control and pairing.
- [docs/SECURITY_NOTES.md](docs/SECURITY_NOTES.md) — what's protected, what's explicitly deferred.
- [docs/SECURITY_AUDIT_RAILWAY_READINESS.md](docs/SECURITY_AUDIT_RAILWAY_READINESS.md) — current security audit and Railway readiness decision.
- [docs/RAILWAY_DEPLOYMENT_PLAN.md](docs/RAILWAY_DEPLOYMENT_PLAN.md) — Railway deployment prep (not yet deployed).
- [docs/RAILWAY_STAGING_SMOKE_TEST.md](docs/RAILWAY_STAGING_SMOKE_TEST.md) — step-by-step script to validate a real Railway Staging deploy.
- [docs/RAILWAY_SECURITY_CHECKLIST.md](docs/RAILWAY_SECURITY_CHECKLIST.md) — exhaustive pre-deploy security checklist.
- [docs/DOCKER_SETUP.md](docs/DOCKER_SETUP.md) — running the full stack in containers.
