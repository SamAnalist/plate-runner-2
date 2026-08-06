# Plate Runner

A simulated license-plate reading scene for camera/ANPR testing —
local-first, with an optional local backend for remote control over a LAN.

## Quickstart

```bash
pnpm install
pnpm dev        # web (http://localhost:5173) + backend (http://localhost:8787)
```

Or with Docker:

```bash
docker compose up --build   # web at http://localhost:8080, backend at http://localhost:8787
```

New to the project? Start with
[docs/MANUAL_TESTING_GUIDE.md](docs/MANUAL_TESTING_GUIDE.md) — a step-by-step
walkthrough of every feature, no code knowledge required — or
[docs/DEMO_CHECKLIST.md](docs/DEMO_CHECKLIST.md) for a quick 10–15 minute
guided demo.

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
- [docs/DOCKER_SETUP.md](docs/DOCKER_SETUP.md) — running the full stack in containers.
