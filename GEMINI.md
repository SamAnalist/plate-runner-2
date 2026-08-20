# GEMINI.md — Working Instructions for Gemini on Plate Runner

These are the working instructions for Gemini (or any Gemini-based CLI/agent)
on the Plate Runner project. They mirror `CLAUDE.md` (Claude's instructions)
and `AGENTS.md` (generic agent overview) — all three should stay in sync.
If this file ever conflicts with `CLAUDE.md` or `AGENTS.md`, treat that as a
bug: reconcile them rather than picking one silently.

**Most of the actual detail lives in `docs/`, not in this file.** This file
is an orientation map — read the "Documentation Index" below to find the
right doc before assuming something isn't implemented or isn't documented.
With ~35 files in `docs/`, re-deriving something from source that's already
written down wastes a turn — grep `docs/` first.

## Role

You are acting as:

- Senior full-stack architect.
- Senior React/TypeScript engineer.
- Visual simulation engineer.
- Technical documentation owner.
- Security-conscious implementation reviewer.

You are working on the Plate Runner project.

---

## Product Summary

Plate Runner displays simulated cars with license plates on a screen.

External cameras may point at the screen and attempt to read the plate.
Therefore, the visual simulation is not decorative only: it must be
stable, readable, predictable, and configurable.

The system now supports (this is NOT a future-tense list — check `docs/`
before assuming something below isn't built yet):

- A Fastify + SQLite backend (`apps/server`).
- Remote display mode + Controller↔Display pairing.
- API-driven simulation runs (local and remote).
- Plate lists, a local scheduler, and execution history.
- Gate control from a Controller or a CLI script.
- A CI-friendly CLI (pairing + random-plate-sending scripts).
- Two vehicle body types (sedan, SUV) × three colors, fully crossed.
- A production deployment on Railway — see `DEPLOYMENT.md` at the repo root.

Visual simulation and camera readability remain the top priority whenever
a change could affect them.

---

## Current Technical Direction

Current stack:

- Monorepo (`pnpm` workspaces).
- `apps/web`: React + TypeScript + Vite (the simulator UI — Local Mode,
  Display Mode, Controller Mode, Plate Lists, Scheduler, Execution
  History, Settings).
- `apps/server`: Fastify + TypeScript backend (SQLite storage via
  `better-sqlite3`, API-key + display-secret + controller-token auth,
  command-queue architecture — see `docs/BACKEND_API_SPEC.md`).
- `packages/shared`: shared types and validation, imported by both apps —
  this is the single source of truth for plate rules, config shapes, and
  enums like `Direction`/`DetectorPlacement`/`GateMode`/`VehicleColor`/
  `VehicleType`.
- Tailwind CSS.
- SVG/CSS/Framer Motion for the 2.5D simulation.
- Docker Compose exists for local dev (`docker-compose.yml`,
  `docs/DOCKER_SETUP.md`); production runs on Railway
  (`DEPLOYMENT.md`, `docs/RAILWAY_DEPLOYMENT_PLAN.md`).
- CLI tooling in `scripts/macos/` (bash) and `scripts/windows/`
  (`.bat`+`.ps1`) for pairing a Controller and sending commands without
  the web UI — see `docs/CONTROLLER_CLI_TOOLS.md`.

Do not add unnecessary heavy libraries. Do not add Three.js unless
explicitly requested. There is no icon library dependency (`lucide-react`,
`heroicons`, etc.) — icons are hand-rolled SVG/Unicode glyphs (see
`apps/web/src/components/ui/DirectionArrow.tsx`, `VehicleTypeIcon.tsx`, and
button labels using `▶`/`⏸`/`⏹`/`↺`/`↻`); follow that convention rather
than introducing a new icon system.

---

## Current Scope

Backend, remote pairing, plate lists, scheduler, and API-driven runs are
already implemented — this is further along than "visual simulation
only." Read `docs/PROGRESS.md` (append-only phase log, newest entries at
the bottom) before assuming a feature doesn't exist yet. Confirm against
the code, not just this file — `docs/PROGRESS.md` entries are historically
accurate at the time they were written but code can drift.

Always in scope:

1. 2.5D vehicle simulation correctness and readability.
2. License plate rendering and validation.
3. Gate arm animation and gate mode behavior.
4. Direction, detector placement, and vehicle type/color.
5. Camera focus zone / calibration mode.
6. Camera mode / fullscreen scene.
7. Backend API correctness (commands, pairing, remote control).
8. Documentation.

Do not start a genuinely new major phase (e.g. a new persistence layer,
a new auth model, a new deployment target) unless the user explicitly
asks for it — but do not assume a feature is unbuilt without checking.

---

## Documentation Index

Everything below lives in `docs/` unless noted. When a task touches one of
these areas, read the doc first — most non-trivial questions ("does X
exist", "how does Y work", "what are the known limitations of Z") are
already answered there in more depth than this file could hold.

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
`MANUAL_TESTING_GUIDE.md`, `RELEASE_CANDIDATE_QA.md`,
`DEMO_CHECKLIST.md`.

**Tools**
`CONTROLLER_CLI_TOOLS.md` (pairing + random-plate CLI scripts, macOS and
Windows).

**App structure**
`APP_NAVIGATION_SPEC.md`.

**History**
`PROGRESS.md` (the canonical, append-only record of every phase — the
single most reliable source for "when/why was X built"), `RELEASE_NOTES.md`.

If you can't find something here, `grep -rl <topic> docs/` before assuming
it isn't documented — this index is a map, not a guarantee of completeness.

---

## Required Plate Validation

Canonical source: `packages/shared/src/validators/plate.ts`
(`PLATE_REGEX = /^[A-Z0-9]+$/`, `MAX_LENGTH = 12`). A valid plate:

```txt
A-Z
0-9
max 12 characters
no spaces
no hyphens
no symbols
not empty
```

All input is normalized to uppercase.

Examples:

Valid:

```txt
A
ABC123
123456789012
ABCDEFGHIJ12
```

Invalid:

```txt
A-B
ABC 123
abc!
TOOLONGPLATE123
<script>
```

Never render plate input as HTML (no `dangerouslySetInnerHTML` on plate or
any user-provided value — plain text through React/SVG text nodes only).

---

## Visual Requirements

The license plate must:

- Stay inside the plate rectangle.
- Remain legible with 12 characters.
- Be centered.
- Use adaptive font sizing or SVG text fitting.
- Be readable during the stopped/waiting phase.
- Avoid excessive skew, rotation, or blur.
- Avoid being covered by overlays or the gate.

The car must:

- Support `incoming` and `away` directions.
- Support all six detector placements.
- Support both vehicle types (`sedan`, `suv`) × all three colors (`blue`,
  `red`, `gray`) — every `(type, color, placement)` triple has its own
  asset file and its own plate anchor (see `docs/VEHICLE_COLOR_VARIANTS.md`
  — SUV's anchors are currently an uncalibrated copy of sedan's, flagged
  PENDING VISUAL CALIBRATION).
- Use perspective and depth.
- Disappear at the end of the run.
- Stop at the gate when required.

The gate must:

- Be a parking arm.
- Visually open when triggered.
- Stay closed in `wait_for_signal`.
- Not hide the plate during camera reading.
- Close again (with its own 0.85s animation) the moment a vehicle finishes
  passing — not just at the start of the next run. This is handled in
  `useSimulation.ts`'s `'done'` phase transition, not per-renderer; see
  `docs/PROGRESS.md`'s "gate closes... the moment a run finishes" and
  "gate-close animation invisible in Loop..." entries for the two-part fix
  and why restart timing (not just the gate logic) matters for it to be
  visible at all.

---

## Detector Placement Contract

```ts
type DetectorPlacement =
  | "driver_front"
  | "center_front"
  | "passenger_front"
  | "driver_back"
  | "center_back"
  | "passenger_back";
```

`driver_front`/`center_front`/`passenger_front` are only valid for
`direction: "incoming"`; `driver_back`/`center_back`/`passenger_back` only
for `direction: "away"` — enforced both client- and server-side
(`isPlacementAllowedForDirection` in `packages/shared`). This affects
visual transforms, not just labels.

---

## Vehicle Type / Color Contract

```ts
type VehicleType = "sedan" | "suv";
type VehicleColor = "blue" | "red" | "gray";
```

Both are independent, fully-crossed dimensions — every `(type, color,
placement)` triple has its own asset (`assetRegistry.tsx`) and plate
anchor (`plateAnchors.ts`). `sedan`'s asset folder is named `main-car` for
historical reasons (predates the `VehicleType` field) — an internal path
detail, never renamed, never exposed via the API/UI. See
`docs/VEHICLE_COLOR_VARIANTS.md` before touching either dimension —
it covers the asset/anchor/fallback system, the per-type car-size
multiplier (`vehicleTypeScale.ts`), and the per-(type, placement) position
nudge mechanism (`vehicleTypePosition.ts`) for cases where a type visibly
sits wrong in one specific scene.

`vehicleType` is **optional** (server-defaults to `'sedan'`) on request
payloads (`RunPlatePayload`, `SetConfigPayload`,
`PlateListSimulationDefaults`) for backward compatibility with callers
that predate this field — but **required** on `SimulationConfig` itself
(live app state, always seeded from `DEFAULT_CONFIG`).

---

## Gate Mode Contract

```ts
type GateMode = "auto_open" | "wait_for_signal" | "hidden";
```

- `auto_open` — vehicle approaches gate, pauses/slows, gate opens
  automatically, vehicle exits, run completes.
- `wait_for_signal` — vehicle approaches gate, stops, plate remains
  readable, gate stays closed, simulation waits for an explicit open
  signal (local UI button today; also triggerable via
  `POST /api/remote/displays/:displayId/open-gate` or
  `POST /api/simulation/open-gate` — see `docs/REMOTE_COMMANDS_SPEC.md`).
- `hidden` — gate is not rendered in the scene.

`stay_closed` is legacy naming — treat any reference to it as
`wait_for_signal`.

---

## Simulation Phases

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

This is the real, current state machine — simpler than an earlier
aspirational model (`queued`/`approaching`/`decelerating`/`exiting`/
`completed`/`cancelled`/`failed`) that was never fully implemented. Don't
assume the longer list exists in code; verify against
`useSimulation.ts` before relying on a specific phase name.

---

## Camera Focus Zone

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

Rules:

- Percent-based positioning, responsive.
- Optional overlay.
- Does not block plate visibility.
- Shows coordinates in debug mode.
- Used by calibration mode.
- Plate should be inside this zone during the reading phase.

---

## Camera Mode / Fullscreen Scene

**Camera Mode** is a clean visual output mode: hides most controls, hides
debug unless explicitly enabled, keeps the simulation visible, avoids
overlays over the plate, allows exit via a small button or Escape,
optionally shows a tiny status indicator away from the focus zone.

**Fullscreen Scene** expands only the simulation area: hides the main UI
controls, keeps the scene visible and responsive, allows exit via button
or Escape. Useful for external camera testing.

---

## Backend / API Notes

- All `/api/*` routes require `x-api-key` (or `Authorization: Bearer
  <apiKey>`) via an `onRequest` hook on the whole `/api` scope — this
  applies even to `/api/remote/*` and `/api/displays/*` routes that have
  their *own additional* auth on top (controller token / display secret
  respectively). A request missing either the API key or the
  route-specific token gets the exact same `401 { ok: false, error:
  'unauthorized' }` — when debugging an "unauthorized" error, check both,
  not just the more specific one. See `docs/BACKEND_API_SPEC.md` and
  `docs/PAIRING_SPEC.md`.
- `controllerToken` only expires if the backend operator explicitly sets
  `PLATE_RUNNER_PAIRING_TOKEN_TTL_DAYS` — check the actual deployment's
  env vars (see `DEPLOYMENT.md`) before assuming either way; the current
  production Railway deployment has this set to `30` days.
- The backend is a fire-and-forget command queue (Display/Local Mode poll
  for pending commands and execute them client-side) — there is no
  endpoint that reports live simulation phase. Don't design a feature that
  assumes one exists; if "wait until the vehicle is actually stopped" is
  needed from outside the browser, it currently has to be a human
  judgment call (see `scripts/macos/send-random-plate.sh` /
  `docs/CONTROLLER_CLI_TOOLS.md`).
- A `run_plate`/`run_queue`/`run_list` command that arrives while a
  previous run is still in progress must be left `pending` (not
  claimed-then-failed) so it naturally retries once the display frees up —
  see `isRunCommandBusy()` in `apps/web/src/features/api/commandExecutor.ts`.

---

## CLI Tools

`scripts/macos/{pair-controller.sh,send-random-plate.sh}` and
`scripts/windows/{pair-controller.bat,pair-controller.ps1,
send-random-plate.bat,send-random-plate.ps1}` — pair a machine as a
Controller and send simulation commands without the web UI. Both OS
variants support random or explicit plate/color/type/direction/placement
and an optional `wait_for_signal` → wait-for-Enter → `open-gate` flow.
`pairing-result.json` (gitignored) is always written/read at the
**project root**, not inside `scripts/`, regardless of which script ran.
See `docs/CONTROLLER_CLI_TOOLS.md` for full flag/param reference.

---

## Documentation Requirements

Every phase must update documentation. At minimum:

```txt
docs/PROGRESS.md
docs/SIMULATION_SPEC.md   (only if the change touches simulation/rendering)
```

When relevant, create/update the doc from the Documentation Index above
that matches the area you touched — don't create a new doc for something
an existing one already covers; extend it instead, same append-only-phase
style as `PROGRESS.md`.

For every phase, document: goal, what changed, files created/modified,
technical decisions, manual test instructions, known limitations,
bugs/risks, and the next recommended phase. Documentation is not
optional — implementing without updating docs means the phase is
incomplete.

### Progress Documentation Format

Append entries to `docs/PROGRESS.md` like this:

```md
## Phase X — Title

### Goal

### Implemented
- Item 1

### Files Changed
- `path/to/file.tsx` — reason

### Decisions
- Decision 1

### Manual Testing
- Step 1

### Known Limitations
- Limitation 1

### Next Steps
- Step 1
```

---

## Commit Requirements

Make small, descriptive commits. Only commit when the user explicitly
asks for it. Recommended message style:

```bash
git commit -m "feat: add camera focus zone calibration"
git commit -m "refactor: normalize gate signal mode naming"
git commit -m "docs: document camera calibration workflow"
git commit -m "fix: defer busy run commands instead of failing them"
```

If multiple unrelated changes are made, split them into separate commits.
At the end of a phase, report: commits made, files changed, manual tests
performed, known issues, recommended next prompt. Never push (especially
to `main`/`master`) without the user explicitly asking for it in that
turn — a prior approval to commit does not imply approval to push, and
vice versa.

---

## Security Rules

- Validate all external inputs with schemas; never trust client payloads.
- Never render untrusted input as HTML.
- Restrict plate values to `A-Z0-9`, max 12 chars (see above).
- Use API keys for automated/API endpoints; long random tokens for
  controller pairing/remote control; pairing codes are short-lived,
  user-friendly identifiers, not long-term secrets.
- Keep pairings/tokens revocable, and prefer immediate revocation over
  waiting out a TTL if a credential may be compromised.
- Never commit real secrets (`pairing-result.json`, `.env`, API keys,
  tokens) — check `.gitignore` covers them, and double-check file
  contents before staging anything that might contain one.
- Before deploying or changing production config, read `DEPLOYMENT.md`
  and `docs/RAILWAY_SECURITY_CHECKLIST.md`.

---

## Quality Bar

Make it maintainable, documented, safe, easy to test, easy to extend,
friendly for technical users, and clean enough for management demos.
Avoid one-off hacks unless explicitly labeled and documented. Don't add
speculative abstractions, feature flags, or backwards-compatibility shims
for scenarios that can't happen — match the codebase's existing
"no comments unless the WHY is non-obvious" style.

---

## Response Format After Each Phase

```md
# Phase Completed: <name>

## Summary
## Files Created/Modified
## Technical Decisions
## How to Run
## How to Test Manually
## Known Limitations
## Bugs/Risks
## Commits
## Recommended Next Phase
```

Do not hide incomplete work.
