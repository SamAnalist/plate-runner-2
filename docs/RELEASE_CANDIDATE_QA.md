# Release Candidate 1 — QA Report

Full end-to-end QA pass across Local Mode, Plate Queue, Plate Lists,
Scheduler, the Local Backend API, Remote Mode (Display/Controller/Pairing),
Docker, and security. Two real bugs were found and fixed during this pass
(see §Bugs Found). This document is the release-readiness record; see
[MANUAL_TESTING_GUIDE.md](MANUAL_TESTING_GUIDE.md) for a step-by-step guide
usable by someone unfamiliar with the codebase.

## Prerequisites

- Node.js ≥ 22.13, `pnpm` (version pinned via `packageManager` in root `package.json`).
- Docker + Docker Compose, for the Docker QA section.
- `curl`, `sqlite3` (optional, only needed to simulate storage corruption/expiry during testing).

## Commands to run

```bash
pnpm install
pnpm typecheck        # all 3 workspace packages
pnpm build             # apps/web production build
pnpm dev                # web (5173) + server (8787) concurrently
pnpm dev:web             # web only
pnpm dev:server            # server only
docker compose up --build   # full stack in containers
```

No `pnpm lint` script exists in this repo (no ESLint/Prettier config wired
up) — `pnpm typecheck` is the closest automated correctness gate along with
`pnpm build`. No `pnpm test` script exists either — there is no formal
automated test suite (Jest/Vitest/Playwright-as-CI); all QA in this project,
including this pass, has been manual/scripted-manual (headless-Chromium
Playwright driver scripts run ad hoc, plus `curl` sweeps), not a committed
CI test suite. This is a known gap, not a hidden one — see Known Limitations.

## Technical Validation

| Check | Result |
|---|---|
| `pnpm typecheck` | ✅ Clean across `packages/shared`, `apps/server`, `apps/web` |
| `pnpm build` | ✅ Clean production build |
| `pnpm lint` | N/A — no lint script configured |
| `pnpm test` | N/A — no test script configured |
| `pnpm dev` / `dev:web` / `dev:server` | ✅ All three start correctly |
| `docker compose up --build` | ✅ Both images build and start cleanly |
| Console errors during QA | ✅ Zero, across every Playwright-driven scenario in this pass |
| Secrets in logs | ✅ Zero — API key, `displaySecret`, `controllerToken`, pairing codes never appeared in any log (raw process or Docker), verified by `grep` after every test batch |

## Local Mode QA

- Single plate: `ABC123` ✅, 12-char `ABCDEFGHIJ12` ✅, invalid `ABC-123` ✅ (shows a validation error, config never receives the invalid value — plate stays whatever it last validly was).
- Direction/placement: `incoming` only offers `*_front` placements, `away` only offers `*_back` placements — no invalid combination is ever selectable. ✅
- Gate modes: `hidden`, `auto_open`, `wait_for_signal` all selectable with correct behavior text; pause/resume/stop/reset all work. ✅
- Vehicle color: all three swatches present; `red`/`gray` show the documented "no dedicated asset yet, rendering as blue" fallback note (matches [VEHICLE_COLOR_VARIANTS.md](VEHICLE_COLOR_VARIANTS.md)); `blue` shows no fallback note. ✅

## Plate Queue QA

- Separator parsing (comma/space/newline mixed) ✅. Invalid entries (hyphen, too-long, `<script>`) all correctly rejected and never executed as HTML (rendered as inert text in the invalid-entries preview) ✅.
- `run_all`: pause/resume/skip/stop all work ✅.
- **`manual_next`: found and fixed a real bug — see §Bugs Found #1.** After the fix: reaches `waiting_for_next` after each item, `Next Vehicle` correctly advances, including the loop-wrap-to-item-0 edge case. ✅
- `loop` toggle persists and works in both `run_all` and `manual_next` (post-fix) ✅.
- `wait_for_signal` gate: queue reaches `waiting_for_signal`, `Send Open Signal` resumes and the item completes ✅.

## Plate Lists QA

All 17 scenarios pass: create (valid + invalid-plates-filtered), edit, duplicate (`Copy of <name>` naming), delete, Load Into Queue (populates without auto-starting), Run List with each of `blue`/`red`/`gray`, persistence across reload, import single-list envelope, import collection envelope, import invalid JSON (handled gracefully, 0 imported, no crash), export single, export all, and corrupted-localStorage recovery (error shown + working "Reset Storage" button). ✅

## Scheduler QA

- `once_at_time` ~90s out (a real browser `datetime-local` input has minute granularity, so any offset under ~60s can round down into the past — noted for anyone writing their own timed test, not an app defect): created, `nextRunAt` shown, fired automatically and auto-disabled. ✅
- `repeat_interval` every 10s (the enforced `MIN_INTERVAL_MS`) with `maxRuns=2`: fired exactly twice and auto-disabled. ✅
- `daily_at_time`: created, `nextRunAt` computed correctly. ✅
- `Run Now`: executes immediately — **does not** touch `runCount`/`lastRunAt` by design (an out-of-band manual trigger shouldn't perturb the automatic cadence math; documented in the hook's own source comment). ✅
- `shuffle` plate order: persists and displays correctly. ✅
- Deleted/missing referenced list: schedule shows a "⚠ Missing list" warning, no crash. ✅
- Queue-busy while a schedule is due: `Run Now`/auto-fire correctly refuses to start a second run while the queue is active (button disabled, "Queue is currently running" hint shown). ✅
- Execution History: `completed` and `stopped` records both captured correctly, Export produces a download, Clear History empties the list. ✅
- Persistence across reload: schedules and history both survive. ✅
- **Corrupted scheduler/execution-history localStorage: found and fixed a real bug — see §Bugs Found #2.**

## Backend API QA

All 18 scenarios pass: `/health` unauthenticated, `/api/status` 401 without key / 200 with key, `POST /api/simulate` creates a command, the frontend Local API listener claims and runs it to `completed`, `POST /api/simulate/queue` with 3 plates, pause/resume/open-gate/stop control routes (including with **no request body**, which Fastify's lenient empty-JSON parser handles correctly), invalid plate → `400`, invalid API key → `401`, oversized (2MB) payload → `413`, API key never in logs, and full persistence verified across a server restart. ✅

## Remote Mode QA

All 20 scenarios pass, driven via a two-tab Playwright session (one Display tab, one Controller tab) plus targeted `curl` for the auth-boundary edge cases:

- Display: register, generate code + live countdown, see/approve/reject pairing requests, revoke a pairing, enable the command listener, Camera Mode hides the panel but the listener (and pairing-request polling) keeps running. ✅
- Controller: enter a valid code → "Waiting for display approval…" → display approves → controller auto-finalizes → "Paired successfully" → send single plate / queue / pause / resume / stop / skip / open-gate, each confirmed executed on the paired display. ✅
- Security edges (curl): unpaired-display attempt → `403`; invalid code → `404`; expired code → `410`; second `finalize` call on the same request → `409 token_already_issued`; revoke → immediate `401` on the next request with that token; no code/token/secret ever appears in logs. ✅

## Docker QA

`docker compose up --build`: both images build (including `better-sqlite3`'s native postinstall via a prebuilt binary), both containers start, web and server both respond, `/health` works, a full pairing → finalize → remote-command flow works entirely inside the containers, and a `docker compose restart` on the server preserves displays, pairings, backend-side plate lists, and commands (verified via the same named volume covering the whole SQLite file). Environment variables (`PLATE_RUNNER_API_KEY`, `_SERVER_PORT`, `_STORAGE_PATH`, `_CORS_ORIGINS`) all confirmed present inside the container with the expected compose defaults; `.env.example` at the repo root matches. ✅

## Security Review

| # | Item | Status |
|---|---|---|
| 1 | No `dangerouslySetInnerHTML` anywhere | ✅ Confirmed via repo-wide grep |
| 2-5 | API key / `controllerToken` / `displaySecret` / pairing code never in logs | ✅ Structurally guaranteed by the logger's header-free `req` serializer; empirically confirmed zero matches across every QA batch |
| 6 | Tokens/secrets stored hashed (SHA-256), never plaintext | ✅ `secretHash`/`tokenHash` columns only |
| 7 | API key required on all `/api/*` | ✅ |
| 8 | `displaySecret` required on display-scoped routes | ✅ |
| 9 | `controllerToken` required on `/api/remote/*` | ✅ |
| 10 | Controller can only control paired displays | ✅ `403` confirmed |
| 11 | Pairing code expires | ✅ `410` confirmed |
| 12 | Pairing request (`approval_pending`/`approved`) also expires on the same TTL | ✅ confirmed via a manually-expired request |
| 13 | Failed-attempt guard works | ✅ `429` after 5 failed attempts / 5 min / IP |
| 14 | Payload caps work | ✅ `413` on a 2MB body |
| 15 | CORS allowlist works | ✅ allowed origin gets headers, disallowed does not |
| 16 | Rate limits work | ✅ pairing 10/min, remote commands 30/min, general 100/min, all wired |
| 17 | Corrupted localStorage doesn't break the frontend | ✅ Plate Lists, Scheduler, Execution History all recover via a working Reset/Clear button (Execution History's was broken — now fixed) |
| 18 | Corrupted/inaccessible SQLite doesn't crash the server | ✅ `initStorage()` falls back to an in-memory DB with a logged warning, documented in `docs/BACKEND_API_SPEC.md` |

## Documentation Review

All docs listed in the request were reviewed for completeness and internal consistency: `docs/PROGRESS.md`, `SIMULATION_SPEC.md`, `QUEUE_SPEC.md`, `PLATE_LISTS_SPEC.md`, `SCHEDULER_SPEC.md`, `EXECUTION_HISTORY_SPEC.md`, `BACKEND_API_SPEC.md`, `API_COMMANDS_SPEC.md`, `LOCAL_API_MODE.md`, `REMOTE_MODE_SPEC.md`, `PAIRING_SPEC.md`, `REMOTE_COMMANDS_SPEC.md`, `DOCKER_SETUP.md`, `SECURITY_NOTES.md`, `VEHICLE_COLOR_VARIANTS.md`. All are current and accurate against the RC1 codebase. No `README.md` existed at the repo root — added a minimal one (project overview, quickstart, doc index) as part of RC hygiene, not a new feature.

One pre-existing, harmless observation: `docs/PROGRESS.md`'s phase numbers aren't strictly sequential (two numbering tracks were used historically — visual/scene-render phases vs. product-feature phases, e.g. Phase 1.5 appears before Phase 0.4 in the file). Every entry is still dated, self-contained, and complete — not touched, since renumbering a historical journal for cosmetic reasons is unnecessary churn with real risk of breaking cross-references.

## Bugs Found

### 1. `manual_next` queue mode: "Next Vehicle" did nothing

- **Severity**: Medium (a documented, user-facing Plate Queue feature was completely non-functional).
- **Steps to reproduce (pre-fix)**: Load a queue, set mode to `Manual Next`, Run Queue. Once the first item finishes and the queue reaches `waiting_for_next`, click "Next Vehicle". Expected: the second item starts. Actual: nothing happened — status flipped back to `waiting_for_next` immediately, `currentIndex` never advanced.
- **Root cause**: `nextVehicle()` in `usePlateQueue.ts` delegated to the same `advance()` function used by the "an item just finished, decide what to do next" phase-watcher logic. In `manual_next` mode, `advance()`'s job is to *pause* (re-set `waiting_for_next`), not to progress — so calling it from `nextVehicle()` just undid nothing, forever.
- **Fix applied**: `nextVehicle()` now has its own self-contained advance-and-start logic (checks `currentIndex + 1`, calls `startItemAt`, handles the loop-wrap-to-item-0 case) instead of calling `advance()`. `advance()`'s loop branch was also simplified to defer the actual item-array reset to `nextVehicle()`, keeping `currentIndex` semantics consistent regardless of how `waiting_for_next` was reached (normal completion vs. a loop wrap after skip). File: `apps/web/src/features/queue/usePlateQueue.ts`.
- **Verified**: both the direct "Next Vehicle advances by one" case and the "skip the last item while looping in manual_next" wrap-around case, via Playwright.

### 2. Corrupted Execution History localStorage had no recovery path

- **Severity**: Low-Medium (only triggered by manually corrupted `localStorage`, but when it happens the user is stuck with a permanent red error banner and no way to clear it from the UI).
- **Steps to reproduce (pre-fix)**: Set `localStorage['plate-runner:execution-history:v1']` to invalid JSON, reload. The panel shows a red error message, but the "Clear History" button — the one action that would actually fix it (it already called the correct `clearExecutionHistory()` under the hood) — was `disabled={records.length === 0}`, and a corrupted store always parses to `records: []`. The button was therefore permanently disabled in exactly the one situation where it was needed.
- **Root cause**: Unlike `PlateListsPanel` and `SchedulerPanel`, which both show a dedicated, always-enabled "Reset Storage" button inside their `storageError` block, `ExecutionHistoryPanel` only showed a plain error message with no distinct recovery action.
- **Fix applied**: Added a "Reset Storage" button inside the `storageError` block, matching the exact pattern already used by the other two panels (confirm dialog → `clearHistory()`, which already correctly clears the corrupted key). File: `apps/web/src/components/controls/ExecutionHistoryPanel.tsx`.
- **Verified**: corrupted storage now shows the error plus a working "Reset Storage" button that recovers the panel to a usable state.

No large/structural bugs were found — everything else confirmed working as designed.

## Files Modified

- `apps/web/src/features/queue/usePlateQueue.ts` — manual_next fix.
- `apps/web/src/components/controls/ExecutionHistoryPanel.tsx` — corruption-recovery fix.
- `docs/RELEASE_CANDIDATE_QA.md`, `docs/MANUAL_TESTING_GUIDE.md` — created.
- `README.md` — created.

## Release Readiness

**READY_FOR_MANUAL_USER_TESTING**

Both bugs found were fixed and re-verified. Every functional area (Local Mode, Queue, Lists, Scheduler, Backend API, Remote Mode, Docker, Security) passed its full QA sweep with zero console errors and zero secret leaks. The main caveat is the complete absence of an automated test suite (see Known Limitations) — this release is verified by thorough manual/scripted QA, not CI-enforced regression tests, so future changes carry real regression risk without one.

## Manual Testing Guide Location

[docs/MANUAL_TESTING_GUIDE.md](MANUAL_TESTING_GUIDE.md)

## Known Limitations

- **No automated test suite.** No `pnpm test` script, no Jest/Vitest unit tests, no committed Playwright/E2E suite. All QA (this pass included) is manual or ad hoc scripted-manual. This is the single biggest risk to long-term stability — any future change can silently regress `manual_next` mode (as this pass found) or any other path with no automated safety net.
- Remote Mode: no manual multi-device LAN test was performed this phase (all Remote Mode QA used two tabs on one machine, plus Docker) — cross-machine LAN behavior (firewalls, mDNS/hostname resolution, real network latency) is unverified.
- Pairing brute-force protection is a flat rate limit + in-memory failed-attempt counter (resets on restart), not a lockout/backoff scheme.
- No pairing/token expiry beyond explicit revocation once finalized.
- Frontend/backend plate-list and execution-history stores remain independent and unsynced (documented since Macro Phase 4).
- `red`/`gray` vehicle colors render as `blue` (no dedicated assets yet) — documented, not a bug.
- CORS is an explicit allowlist defaulting to `localhost:5173`/`:8080` — must be set explicitly for any other origin.

## Recommended Next Phase

Add an automated test suite (unit tests for the pure logic in `usePlateQueue`/`useLocalScheduler`/the pairing state machine, plus a minimal CI-run Playwright smoke suite covering Local Mode, Queue, and the Local API loop) before further feature work — this RC pass found one real, moderate-severity regression (`manual_next`) that automated tests would have caught immediately. Beyond that, real multi-device LAN testing of Remote Mode. Per this phase's explicit scope, no new product features, no cloud deployment, no WebSocket, no user accounts.
