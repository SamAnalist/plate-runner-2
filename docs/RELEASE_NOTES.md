# Release Notes

A snapshot of what Plate Runner does today, how to run it, and what's
deliberately left for later. See [docs/PROGRESS.md](PROGRESS.md) for the
full phase-by-phase history behind everything below.

## What it does

Plate Runner simulates a car driving up to a gate with a license plate,
for testing cameras/ANPR readers — either on the machine you're looking
at, or as a remote display another computer controls over a LAN.

## Current feature set

- **Local Simulator** — run a single plate or a Plate Queue, six
  detector placements, three gate modes (`hidden`/`auto_open`/
  `wait_for_signal`), configurable speeds, vehicle color, and a
  hover-revealed quick Play/Pause/Skip control on the scene itself.
- **Plate Lists** — save, edit, duplicate, delete, import/export as JSON
  (single list or a full collection, with an in-app format reference),
  and a Random Plate Generator (count, digit length, optional prefix).
- **Scheduler** — run a saved Plate List once, daily, or on a repeating
  interval, with an optional run window and max-run limit; Run Now for
  ad hoc runs.
- **Execution History** — a record of every past Plate List run, with
  status badges, exportable to JSON.
- **Display Mode** — register this machine as a remote display, generate
  a pairing code, manually approve/reject pairing requests, and receive
  remote commands.
- **Controller Mode** — pair with a Display via a 6-digit code, then send
  a single plate, a queue, or a saved list, and issue pause/resume/stop/
  skip/open-gate commands remotely.
- **Local API** — drive the simulator from an external script via the
  local backend (`POST /api/simulate` and friends).
- **Camera Mode / Fullscreen** — hide all navigation/chrome for a clean
  camera-facing or presentation view.
- **App Shell** — Home screen with module cards, a sidebar (Modes / Data
  / Settings), and last-visited-screen persistence.
- **Settings / API** — Local API configuration, System Status (app/
  frontend/connection/counts, on-demand backend health check), Local
  Backup export/import (Plate Lists, Scheduler, Execution History, and
  non-secret preferences — never API keys/tokens/secrets), per-domain
  Local Storage reset with confirmation, and a configurable Screen Saver
  (timeout, style, activity-aware, suppressed while the app is busy).
- **Backend** — Fastify + SQLite, API-key authenticated, rate-limited,
  runs locally via `tsx` or in Docker; LAN-reachable by default.

## How to run

```bash
pnpm install
pnpm dev             # web (http://localhost:5173) + backend (http://localhost:8787)
```

or

```bash
docker compose up --build   # web at http://localhost:8080, backend at http://localhost:8787
```

See [README.md](../README.md)'s Quick Start, and
[docs/OPERATIONS_GUIDE.md](OPERATIONS_GUIDE.md) for environment
variables, CORS/LAN setup, backups, and troubleshooting.

## Known limitations

- **No automated test suite.** Every phase has been verified with
  scripted manual QA (Playwright, not committed) plus a documented
  manual-testing guide — see
  [docs/MANUAL_TESTING_GUIDE.md](MANUAL_TESTING_GUIDE.md) and
  [docs/RELEASE_CANDIDATE_QA.md](RELEASE_CANDIDATE_QA.md).
- **No WebSocket / push transport.** Remote commands and the Local API
  are polled (every 1.5s), not pushed — acceptable for the current
  latency needs, documented in
  [docs/REMOTE_MODE_SPEC.md](REMOTE_MODE_SPEC.md).
- **No cloud component.** Everything runs locally or on a LAN; there is
  no hosted/cloud deployment path.
- **No collapsed/icon-only sidebar** for narrow viewports — the app
  targets desktop/laptop use.
- **Backup import is all-or-nothing** — Plate Lists, Scheduler,
  Execution History, and preferences are overwritten together; no
  selective/partial import.
- **System Status's backend section is manual** — a "Check Backend
  Status" click, not an auto-refreshing poll.
- **Screen Saver styles**: `floating_plate` is the most visually tuned;
  `moving_logo`/`subtle_gradient` work but got less attention.
- **Render/scene calibration is stable but not the focus of recent
  phases** — the last dedicated calibration work predates the App Shell
  Navigation phase; visuals haven't regressed, but haven't been
  revisited either.

## Recommended next work

Two directions, not mutually exclusive:

1. **Render/scene calibration** — revisit vehicle/gate/scene visuals
   directly (asset realism, camera-focus-zone tuning, additional vehicle
   colors) now that the surrounding app shell and operational tooling
   are settled.
2. **New functionality** — plate list sync between Display/Controller
   (currently sent as one-off snapshots), scheduler enhancements, or
   whatever the next real demo/usage feedback surfaces.

Either way, the current app is demo-ready: see
[docs/DEMO_CHECKLIST.md](DEMO_CHECKLIST.md) for a guided walkthrough.
