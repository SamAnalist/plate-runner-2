# GEMINI.md — Working Instructions for Gemini on Plate Runner

These are the working instructions for Gemini (or any Gemini-based CLI/agent)
on the Plate Runner project. They mirror `CLAUDE.md` (Claude's instructions)
and `AGENTS.md` (generic agent overview) — all three should stay in sync.
If this file ever conflicts with `CLAUDE.md` or `AGENTS.md`, treat that as a
bug: reconcile them rather than picking one silently.

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

The system supports (or is growing toward):

- Remote display mode.
- Pairing computers (Controller ↔ Display).
- API-driven simulation runs.
- Automated tests from GitHub Actions.
- Schedules and plate lists.
- Gate control from tests.

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
  enums like `Direction`/`DetectorPlacement`/`GateMode`/`VehicleColor`.
- Tailwind CSS.
- SVG/CSS/Framer Motion for the 2.5D simulation.
- Docker Compose exists for local dev (`docker-compose.yml`,
  `docs/DOCKER_SETUP.md`); production runs on Railway
  (`docs/RAILWAY_DEPLOYMENT_PLAN.md`).

Do not add unnecessary heavy libraries. Do not add Three.js unless
explicitly requested. There is no icon library dependency (`lucide-react`,
`heroicons`, etc.) — icons are hand-rolled Unicode glyphs (`▶`, `⏸`, `⏹`,
`↺`, `↻`) embedded directly in button labels; follow that convention rather
than introducing a new icon system.

---

## Current Scope

Backend, remote pairing, and API-driven runs are already implemented —
this is further along than "visual simulation only." Read `docs/PROGRESS.md`
(append-only phase log, newest entries at the bottom) before assuming a
feature doesn't exist yet. Confirm against the code, not just this file.

Always in scope:

1. 2.5D vehicle simulation correctness and readability.
2. License plate rendering and validation.
3. Gate arm animation and gate mode behavior.
4. Direction and detector placement.
5. Camera focus zone / calibration mode.
6. Camera mode / fullscreen scene.
7. Backend API correctness (commands, pairing, remote control).
8. Documentation.

Do not start a genuinely new major phase (e.g. a new persistence layer,
a new auth model, a new deployment target) unless the user explicitly
asks for it — but do not assume "backend doesn't exist yet" either; check.

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
- Use perspective and depth.
- Disappear at the end of the run.
- Stop at the gate when required.

The gate must:

- Be a parking arm.
- Visually open when triggered.
- Stay closed in `wait_for_signal`.
- Not hide the plate during camera reading.

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
- `controllerToken` (issued at the end of the Controller↔Display pairing
  handshake) only expires if the backend operator explicitly sets
  `PLATE_RUNNER_PAIRING_TOKEN_TTL_DAYS` — check the actual deployment's
  env vars before assuming either way; don't hardcode an assumption into
  new docs or code.
- The backend is a fire-and-forget command queue (Display/Local Mode poll
  for pending commands and execute them client-side) — there is no
  endpoint that reports live simulation phase. Don't design a feature that
  assumes one exists; if "wait until the vehicle is actually stopped" is
  needed from outside the browser, it currently has to be a human
  judgment call (see `send-random-plate.sh` / `docs/CONTROLLER_CLI_TOOLS.md`).
- A `run_plate`/`run_queue`/`run_list` command that arrives while a
  previous run is still in progress must be left `pending` (not
  claimed-then-failed) so it naturally retries once the display frees up —
  see `isRunCommandBusy()` in `apps/web/src/features/api/commandExecutor.ts`
  and the "Fix silently-dropped back-to-back run commands" phase in
  `docs/PROGRESS.md` for why this matters.

---

## Documentation Requirements

Every phase must update documentation. At minimum:

```txt
docs/PROGRESS.md
docs/SIMULATION_SPEC.md
```

When relevant, create/update:

```txt
docs/CAMERA_CALIBRATION.md
docs/PLATE_LISTS_SPEC.md
docs/BACKEND_API_SPEC.md
docs/PAIRING_SPEC.md
docs/REMOTE_COMMANDS_SPEC.md
docs/SCHEDULER_SPEC.md
docs/SECURITY_SPEC.md
docs/DEPLOYMENT.md
```

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
