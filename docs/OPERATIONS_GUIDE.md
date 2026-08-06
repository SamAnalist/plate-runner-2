# Operations Guide

Practical reference for running, configuring, and maintaining Plate
Runner day-to-day. Cross-links the more detailed docs rather than
duplicating them.

## Running locally with pnpm

```bash
pnpm install
pnpm dev            # web + server together
pnpm dev:web        # frontend only (http://localhost:5173)
pnpm dev:server     # backend only (http://localhost:8787)
```

Backend defaults: port `8787`, API key `dev-local-key`, in-repo SQLite
storage. Override via env vars (see below).

## Running with Docker

```bash
docker compose up --build
# web:    http://localhost:8080
# server: http://localhost:8787
```

Full details, image layout, and the persistent-volume behavior are in
[DOCKER_SETUP.md](DOCKER_SETUP.md).

## LAN setup (two devices)

Both the `tsx`-run backend and the Docker `nginx`/server containers bind
`0.0.0.0` unconditionally — a second device on the same network can
already reach either setup. The one thing that must be set explicitly is
`PLATE_RUNNER_CORS_ORIGINS` (see below) to include the second device's
actual origin. Full walkthrough, including what CORS does and doesn't
block and how to diagnose it: [MANUAL_TESTING_GUIDE.md](MANUAL_TESTING_GUIDE.md)'s
"Real LAN Testing: Two Computers" section.

## Environment variables

| Variable | Default | Notes |
|---|---|---|
| `PLATE_RUNNER_API_KEY` | `dev-local-key` | Required header (`x-api-key`) on every `/api/*` route. |
| `PLATE_RUNNER_SERVER_PORT` | `8787` | Backend listen port. |
| `PLATE_RUNNER_STORAGE_PATH` | `./data` (local) / `/data` (Docker) | SQLite file location. |
| `PLATE_RUNNER_CORS_ORIGINS` | `http://localhost:5173,http://localhost:8080` | Comma-separated allowed browser origins. |

See `.env.example` at the repo root for a ready-to-copy starting point.

## CORS

A disallowed origin doesn't stop the backend from processing a request —
it stops the *browser* from letting frontend JS read the response, which
is what makes Test Connection/pairing/etc. look like they're silently
failing. See [DOCKER_SETUP.md](DOCKER_SETUP.md) and
[MANUAL_TESTING_GUIDE.md](MANUAL_TESTING_GUIDE.md) for the exact `curl
-X OPTIONS` diagnostic command.

## API key

Same key across every `/api/*` route, sent as `x-api-key`. Never logged,
never rendered in the UI's System Status panel, and never included in
the Local Backup export (see below). Rotate it by changing
`PLATE_RUNNER_API_KEY` and updating the API Base URL/Key fields in
Settings / API and Display/Controller Mode.

## Storage paths

Backend: SQLite at `PLATE_RUNNER_STORAGE_PATH` (a named Docker volume in
the Compose setup, so it survives container restarts — see
[DOCKER_SETUP.md](DOCKER_SETUP.md)).

Frontend: everything lives in the browser's `localStorage`, scoped to
whatever origin you loaded the app from. Keys in use today:

| Key | Holds |
|---|---|
| `plate-runner:plate-lists:v1` | Saved Plate Lists |
| `plate-runner:schedules:v1` | Scheduler entries |
| `plate-runner:execution-history:v1` | Execution History records |
| `plate-runner:last-screen:v1` | Last app screen visited |
| `plate-runner:screensaver:v1` | Screen Saver settings |
| `platerunner_display_registration` | This machine's Display registration + secret |
| `platerunner_controller_pairings` | This machine's paired displays + controller tokens |

The last two hold credentials — see Security below.

## Backups / export

**Settings / API → Local Backup → Export Backup** downloads a single
JSON file (`plate-runner-backup-<date>.json`) containing Plate Lists,
Scheduler, Execution History, and non-secret preferences (last screen,
Screen Saver settings). It never includes the API key, controller
tokens, display secrets, or pairing codes — those live in browser state
this feature never reads.

**Import Backup** (same section) validates the file's schema, asks for
confirmation (it overwrites existing local data), writes it back into
the same `localStorage` keys, then reloads the page so every part of the
app picks up the restored state.

## Resetting local storage

**Settings / API → Local Storage** — one button per domain (Plate
Lists, Scheduler, Execution History, Remote Pairings local credentials,
App Preferences/Last Screen, Screen Saver Settings), each with a
confirmation dialog and a one-line explanation, plus a stronger-worded
"All Local Browser Data" that wipes everything and reloads. None of
these touch the backend — they only affect what's stored in the current
browser.

## Screen Saver

Configurable in **Settings / API → Screen Saver**: enable/disable,
timeout (1–60 minutes), and visual style. Full behavior spec — activity
detection, when it's suppressed, remote-command interaction, security —
in [SCREEN_SAVER_SPEC.md](SCREEN_SAVER_SPEC.md).

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Test Connection / pairing silently fails | CORS origin missing | Add the browser's origin to `PLATE_RUNNER_CORS_ORIGINS` and restart the backend. |
| iOS Safari says "Load failed" on any action | Same as above — Safari's generic wording for a failed `fetch()` | See `MANUAL_TESTING_GUIDE.md`'s troubleshooting table. |
| `EADDRINUSE` starting the backend | Another process already on the port | Find/stop it, or set `PLATE_RUNNER_SERVER_PORT`. |
| Second device can't load the frontend at all | Vite dev server not LAN-bound | Already fixed — `vite.config.ts` sets `server.host: true`. Confirm you're not on an older checkout. |
| A screen/panel shows stale or corrupted data | Corrupted `localStorage` entry | Use the matching Local Storage reset button in Settings / API. |
| Screen Saver never appears | Disabled, or the app is "busy" (queue running/waiting, an active pairing request) | Check Settings / API → Screen Saver is enabled; busy states are intentional (see SCREEN_SAVER_SPEC.md). |

## Security notes

- API key, controller tokens, and display secrets are never rendered in
  the UI (System Status, Export Backup) — see
  [SECURITY_NOTES.md](SECURITY_NOTES.md) for the full security model.
- Every destructive local-storage action requires an explicit confirm
  dialog.
- The Screen Saver overlay has no access to plate/queue/history data —
  see [SCREEN_SAVER_SPEC.md](SCREEN_SAVER_SPEC.md).
