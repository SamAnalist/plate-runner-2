# AGENTS.md — Plate Runner

Generic instructions for any AI agent working on this repo (Claude, Gemini,
Codex, or otherwise). `CLAUDE.md` and `GEMINI.md` mirror this file's facts
with tool-specific framing — all three should stay in sync. If you're an
agent without a dedicated file, this one is your reference.

**Most of the actual detail lives in `docs/` (~35 files), not in this
file.** Read the "Documentation Index" below before assuming something
isn't implemented or isn't documented — re-deriving something from source
that's already written down wastes a turn.

## Project Overview

Plate Runner is a vehicle plate simulation system.

The app displays cars with specific license plates on a screen, simulating
vehicle movement through a lane/gate area. External cameras may physically
point at the screen to detect, read, and validate the plates shown by the
simulation.

This project is used for:

1. Manual visual testing.
2. Automated testing.
3. Camera-based plate recognition validation.
4. Training and demonstration.
5. Remote display/control between computers.
6. API-driven simulation runs from local tests or CI systems.

The original PlateRunner concept was a client-only React app using
localStorage to manage plate lists and animated SVG vehicles. The current
version keeps that visual concept but has grown into a full simulator with
a real backend, remote mode, pairing, scheduling, API control, and camera
calibration features — **this is no longer a future-tense roadmap, it's
built.** See "Current State" below.

---

## Current State

Read `docs/PROGRESS.md` (append-only phase log, newest entries at the
bottom) before assuming a feature doesn't exist yet — it's the single most
reliable source for "when/why was X built." Confirm against the code too;
docs are accurate as of when they were written, code can drift.

Implemented today:

- 2.5D visual simulation, camera focus/readability tooling, gate behavior,
  plate list playback.
- A Fastify + SQLite backend (`apps/server`) — command queue, pairing,
  storage.
- Remote display mode + Controller↔Display pairing.
- API-driven simulation runs, both local and remote.
- A local scheduler and execution history.
- Two vehicle body types (`sedan`, `suv`) × three colors, fully crossed —
  every `(type, color, placement)` combination has its own asset and plate
  anchor.
- A CI-friendly CLI (`scripts/macos/`, `scripts/windows/`) for pairing and
  sending commands without the web UI.
- A production deployment on Railway — see `DEPLOYMENT.md` at the repo
  root.

Not yet done / open for a future phase (confirm against `docs/PROGRESS.md`
before treating this as current):

- Production hardening beyond what `docs/SECURITY_AUDIT_RAILWAY_READINESS.md`
  already covers.
- SUV plate anchors are a placeholder copy of sedan's, not visually
  calibrated — see `docs/VEHICLE_COLOR_VARIANTS.md`.

Do not jump into a genuinely new major phase (new persistence layer, new
auth model, new deployment target) unless the user explicitly asks —
but don't assume something is unbuilt without checking first.

---

## Documentation Index

Everything below lives in `docs/` unless noted. When a task touches one of
these areas, read the doc first.

**Visual simulation / rendering**
`SIMULATION_SPEC.md` (append-only phase log for the simulator itself),
`SIMULATION_STATE_MACHINE.md`, `RENDERER_ARCHITECTURE.md`,
`SCENE_CONFIG_ARCHITECTURE.md`, `SCENE_VARIANTS.md`,
`ASSET_RENDERER_STRATEGY.md`, `MOTION_PATHS.md`, `GATE_BEHAVIOR.md`,
`VEHICLE_COLOR_VARIANTS.md` (color AND vehicle-type asset/anchor/scale
system), `CAMERA_VIEW_SPEC.md`, `CAMERA_CALIBRATION.md`, `VISUAL_QA.md`,
`VISUAL_REDESIGN.md`, `UI_POLISH_NOTES.md`.

**Backend / API**
`BACKEND_API_SPEC.md` (start here for any endpoint question),
`API_COMMANDS_SPEC.md`, `LOCAL_API_MODE.md`, `REMOTE_COMMANDS_SPEC.md`,
`REMOTE_MODE_SPEC.md`, `PAIRING_SPEC.md` (Controller↔Display pairing +
auth model — the "does a request need x-api-key AND x-controller-token"
question is answered here).

**Data features**
`PLATE_LISTS_SPEC.md`, `QUEUE_SPEC.md`, `SCHEDULER_SPEC.md`,
`EXECUTION_HISTORY_SPEC.md`, `IMPORT_EXPORT_SPEC.md`,
`SCREEN_SAVER_SPEC.md`.

**Security**
`SECURITY_SPEC.md`, `SECURITY_NOTES.md`,
`SECURITY_AUDIT_RAILWAY_READINESS.md`, `RAILWAY_SECURITY_CHECKLIST.md`.

**Deployment / operations**
`DEPLOYMENT.md` (repo root — start here), `DOCKER_SETUP.md`,
`RAILWAY_DEPLOYMENT_PLAN.md`, `OPERATIONS_GUIDE.md`,
`RAILWAY_STAGING_SMOKE_TEST.md`.

**QA / testing**
`MANUAL_TESTING_GUIDE.md`, `RELEASE_CANDIDATE_QA.md`, `DEMO_CHECKLIST.md`.

**Tools**
`CONTROLLER_CLI_TOOLS.md` (pairing + random-plate CLI scripts, macOS and
Windows).

**App structure**
`APP_NAVIGATION_SPEC.md`.

**History**
`PROGRESS.md`, `RELEASE_NOTES.md`.

If you can't find something here, `grep -rl <topic> docs/` before assuming
it isn't documented — this index is a map, not a guarantee of completeness.

---

## Core Rules

### License Plate Rules

Plates must:

- Accept only uppercase letters `A-Z`.
- Accept only numbers `0-9`.
- Reject spaces.
- Reject hyphens.
- Reject special characters.
- Reject empty values.
- Have a maximum length of 12 characters.
- Be normalized to uppercase.
- Always stay visually inside the license plate rectangle.
- Never be rendered as HTML.

Canonical source: `packages/shared/src/validators/plate.ts`. Do not use:

```tsx
dangerouslySetInnerHTML
```

for plates or user-provided values. All plate rendering must be plain
text through React/SVG text nodes.

---

## Visual Simulation Requirements

### Direction

```ts
type VehicleDirection = "incoming" | "away";
```

- `incoming`: vehicle approaches the detector/camera.
- `away`: vehicle moves away from the detector/camera.

### Detector Placement

```ts
type DetectorPlacement =
  | "driver_front"
  | "center_front"
  | "passenger_front"
  | "driver_back"
  | "center_back"
  | "passenger_back";
```

`driver_front`/`center_front`/`passenger_front` only valid for `incoming`;
`driver_back`/`center_back`/`passenger_back` only valid for `away` —
enforced client- and server-side (`isPlacementAllowedForDirection`).
Affects visual transforms, not just labels.

### Vehicle Type / Color

```ts
type VehicleType = "sedan" | "suv";
type VehicleColor = "blue" | "red" | "gray";
```

Independent, fully-crossed dimensions — every `(type, color, placement)`
triple has its own asset (`assetRegistry.tsx`) and plate anchor
(`plateAnchors.ts`). `sedan`'s asset folder is named `main-car` (legacy,
predates `VehicleType`, an internal path detail only). See
`docs/VEHICLE_COLOR_VARIANTS.md` before touching either dimension — it
also covers the per-type car-size multiplier (`vehicleTypeScale.ts`) and
per-(type, placement) position nudge (`vehicleTypePosition.ts`).
`vehicleType` is optional (server-defaults `'sedan'`) on request payloads
for backward compatibility, but required on live `SimulationConfig`.

### Gate

```ts
type GateMode = "auto_open" | "wait_for_signal" | "hidden";
```

- `auto_open`: vehicle approaches, stops or slows, gate opens
  automatically, vehicle exits.
- `wait_for_signal`: vehicle approaches, stops at gate, plate remains
  readable, gate stays closed until an explicit signal opens it (local UI
  button, or `POST /api/remote/displays/:displayId/open-gate` /
  `POST /api/simulation/open-gate`).
- `hidden`: gate not rendered.

`stay_closed` is legacy/deprecated — treat as `wait_for_signal`.

The gate also closes (with its own 0.85s animation) the moment a vehicle
finishes passing, not just at the start of the next run — handled in
`useSimulation.ts`'s `'done'` transition. See `docs/PROGRESS.md`'s two
entries on this (the gate-close fix, and the follow-up fix for why it was
invisible during Loop playback specifically — a restart-timing issue, not
a gate-logic bug).

---

## Camera Readability Requirements

```ts
type FocusZoneConfig = {
  enabled: boolean;
  showOverlay: boolean;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  borderColor: string;
  label?: string;
};
```

During the stopped/waiting phase, the plate must be stable and readable
inside the focus zone. The simulator has: Focus Zone Overlay, Calibration
Mode, Camera Mode, Fullscreen Scene, Debug Overlay.

---

## Simulation States

Actual implementation (`apps/web/src/hooks/useSimulation.ts`):

```ts
type SimulationPhase =
  | "idle"
  | "running"
  | "stopped_at_gate"
  | "waiting_for_signal"
  | "gate_opening"
  | "done";
```

Simpler than an earlier aspirational model
(`queued`/`approaching`/`decelerating`/`exiting`/`completed`/`cancelled`/
`failed`) that was never fully implemented — verify against the actual
hook, don't assume the longer list exists.

---

## Backend / API Notes

- Every `/api/*` route requires `x-api-key` (`onRequest` hook on the
  whole `/api` scope) — `/api/remote/*` and `/api/displays/*` need
  **additional** auth on top (`x-controller-token` / `x-display-secret`
  respectively), not instead of it. A missing/wrong value on either check
  returns the identical `401 { ok: false, error: 'unauthorized' }` — check
  both when debugging. See `docs/BACKEND_API_SPEC.md`, `docs/PAIRING_SPEC.md`.
- `controllerToken` only expires if `PLATE_RUNNER_PAIRING_TOKEN_TTL_DAYS`
  is set — check the actual deployment (`DEPLOYMENT.md`) before assuming;
  current production has it set to `30` days.
- No endpoint reports live simulation phase — the backend is a
  fire-and-forget command queue. "Wait until the vehicle is stopped" from
  outside the browser is a human judgment call today (see
  `scripts/macos/send-random-plate.sh`).
- A `run_plate`/`run_queue`/`run_list` command arriving while a previous
  run is in progress must stay `pending` (not claimed-then-failed) —
  see `isRunCommandBusy()` in `commandExecutor.ts`.

---

## CLI Tools

`scripts/macos/{pair-controller.sh,send-random-plate.sh}` and
`scripts/windows/{pair-controller.bat,pair-controller.ps1,
send-random-plate.bat,send-random-plate.ps1}` pair a machine as a
Controller and send simulation commands without the web UI, supporting
random or explicit plate/color/type/direction/placement and an optional
`wait_for_signal` → wait-for-Enter → `open-gate` flow.
`pairing-result.json` (gitignored) always lives at the **project root**,
regardless of which script wrote it. See `docs/CONTROLLER_CLI_TOOLS.md`.

---

## Monorepo Structure

```txt
plate-runner/
  apps/
    web/       — React + TypeScript + Vite frontend
    server/    — Fastify + TypeScript backend (SQLite)
  packages/
    shared/    — shared types, validation, plate rules
  scripts/
    macos/     — bash CLI (pairing + remote commands)
    windows/   — .bat + .ps1 CLI (same, for Windows)
  docs/        — ~35 spec/history docs, see Documentation Index above
  DEPLOYMENT.md, docker-compose.yml
```

---

## Documentation Rules

Every development phase must update `docs/`. At minimum:

```txt
docs/PROGRESS.md
docs/SIMULATION_SPEC.md   (only if the change touches simulation/rendering)
```

When relevant, extend the doc from the Documentation Index that matches
the area touched — don't create a new doc for something an existing one
already covers.

Each phase must document:

1. What was implemented.
2. Why it was implemented that way.
3. Files created or modified.
4. Known limitations.
5. Manual test steps.
6. Bugs found.
7. Next recommended steps.

Do not leave undocumented behavior in the codebase.

---

## Commit Rules

Use small, descriptive commits. Only commit when the user explicitly asks.

```bash
git commit -m "chore: initialize plate runner monorepo"
git commit -m "feat: add initial 2.5d vehicle simulator"
git commit -m "feat: add camera focus zone calibration"
git commit -m "refactor: normalize gate signal mode naming"
git commit -m "feat: add gate arm simulation timeline"
git commit -m "docs: document simulation phase progress"
```

If multiple unrelated changes are made, split them into separate commits.
Never push (especially to `main`/`master`) without the user explicitly
asking for it in that turn — a prior approval to commit does not imply
approval to push.

---

## Security Rules

- Validate all external inputs with schemas. Never trust client payloads.
- Never render untrusted input as HTML.
- Restrict plate values to `A-Z0-9`, max 12 chars.
- Use API keys for automated endpoints; long random tokens for remote
  pairing/control. Pairing codes are short-lived, user-friendly
  identifiers, not long-term secrets.
- Keep pairings/tokens revocable — prefer immediate revocation over
  waiting out a TTL if a credential may be compromised.
- Never commit real secrets (`pairing-result.json`, `.env`, API keys,
  tokens) — verify `.gitignore` covers them before staging.
- Before deploying or touching production config, read `DEPLOYMENT.md`
  and `docs/RAILWAY_SECURITY_CHECKLIST.md`.
- Log connection events. Avoid leaking API keys in frontend code.

---

## UX Principles

The app must be usable by technical testers, developers, and
management/demo users. Therefore:

- Keep basic controls simple.
- Put advanced controls behind collapsible sections.
- Provide clear labels.
- Provide Camera Mode for clean camera-facing output.
- Do not place UI overlays over the plate focus zone unless explicitly
  enabled.
- Keep debug overlays optional.

---

## Important Development Instruction

Before starting a new feature:

1. Read this file (or `CLAUDE.md`/`GEMINI.md` if you're that tool).
2. Check the Documentation Index above and read the relevant doc(s).
3. Update docs as part of the implementation, not after.
4. Commit changes (only if the user asked for a commit).
5. Return a clear phase summary.

Do not proceed silently.
