# CLAUDE.md — Working Instructions for Claude on Plate Runner

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

External cameras may point at the screen and attempt to read the plate. Therefore, the visual simulation is not decorative only: it must be stable, readable, predictable, and configurable.

The system will later support:

- Remote display mode.
- Pairing computers.
- API-driven simulation runs.
- Automated tests from GitHub Actions.
- Schedules and plate lists.
- Gate control from tests.

But the current priority is visual simulation and camera readability.

---

## Current Technical Direction

Current stack:

- Monorepo.
- `apps/web`: React + TypeScript + Vite.
- `packages/shared`: shared types and validation.
- Tailwind CSS.
- SVG/CSS/Framer Motion allowed for 2.5D simulation.
- Backend will come later.
- Docker will come later.

Do not add unnecessary heavy libraries.

Do not add Three.js yet unless explicitly requested.

---

## Current Scope

Focus on:

1. 2.5D vehicle simulation.
2. License plate rendering.
3. Gate arm animation.
4. Direction and detector placement.
5. Camera focus zone.
6. Calibration mode.
7. Camera mode/fullscreen scene.
8. Documentation.

Do not implement yet:

- Backend.
- Remote pairing.
- WebSocket.
- Scheduler.
- Plate list sync.
- API endpoints.

Unless the user explicitly starts that phase.

---

## Required Plate Validation

A valid plate:

```txt
A-Z
0-9
max 12 characters
no spaces
no hyphens
no symbols
not empty
```

All input should be normalized to uppercase.

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

Never render plate input as HTML.

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

- Support `incoming`.
- Support `away`.
- Support six detector placements.
- Use perspective and depth.
- Disappear at the end of the run.
- Stop at gate when required.

The gate must:

- Be a parking arm.
- Visually open when triggered.
- Stay closed in `wait_for_signal`.
- Not hide the plate during camera reading.

---

## Detector Placement Contract

Use this type:

```ts
type DetectorPlacement =
  | "driver_front"
  | "center_front"
  | "passenger_front"
  | "driver_back"
  | "center_back"
  | "passenger_back";
```

Meaning:

- `driver_front`: camera/detector sees the vehicle from driver-side front angle.
- `center_front`: camera/detector sees the vehicle from centered front angle.
- `passenger_front`: camera/detector sees the vehicle from passenger-side front angle.
- `driver_back`: camera/detector sees the vehicle from driver-side rear angle.
- `center_back`: camera/detector sees the vehicle from centered rear angle.
- `passenger_back`: camera/detector sees the vehicle from passenger-side rear angle.

This must affect visual transforms, not just labels.

---

## Gate Mode Contract

Use this final conceptual naming:

```ts
type GateMode = "auto_open" | "wait_for_signal";
```

If the current code uses `stay_closed`, migrate or document it as legacy.

Behavior:

### `auto_open`

Vehicle approaches gate, pauses/slows, gate opens automatically, vehicle exits, run completes.

### `wait_for_signal`

Vehicle approaches gate, stops, plate remains readable, gate stays closed, simulation waits for explicit open signal.

For now, the signal can be a local UI button.

Later, it will be triggered by API:

```http
POST /api/v1/events/:eventId/open-gate
```

---

## Preferred Simulation Phases

Use or migrate toward:

```ts
type SimulationPhase =
  | "idle"
  | "queued"
  | "approaching"
  | "decelerating"
  | "stopped_at_gate"
  | "waiting_for_signal"
  | "gate_opening"
  | "exiting"
  | "completed"
  | "cancelled"
  | "failed";
```

If a simpler phase model exists, document the mapping.

---

## Camera Focus Zone

The app must support:

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

- Percent-based positioning.
- Responsive.
- Optional overlay.
- Does not block plate visibility.
- Shows coordinates in debug mode.
- Used by calibration mode.
- Plate should be inside this zone during reading phase.

---

## Camera Mode

Camera Mode is a clean visual output mode.

It should:

- Hide most controls.
- Hide debug unless explicitly enabled.
- Keep the simulation visible.
- Avoid overlays over the plate.
- Allow exit via small button or Escape.
- Optionally show a tiny status indicator away from the focus zone.

---

## Fullscreen Scene

Fullscreen Scene expands only the simulation area.

It should:

- Hide the main UI controls.
- Keep the scene visible and responsive.
- Allow exit via button or Escape.
- Be useful for external camera testing.

---

## Documentation Requirements

Every phase must update documentation.

At minimum:

```txt
docs/PROGRESS.md
docs/SIMULATION_SPEC.md
```

When relevant, create/update:

```txt
docs/CAMERA_CALIBRATION.md
docs/PLATE_LISTS_SPEC.md
docs/API_SPEC.md
docs/REMOTE_PAIRING_SPEC.md
docs/SCHEDULER_SPEC.md
docs/SECURITY_SPEC.md
docs/DEPLOYMENT.md
```

For every phase, document:

1. Date or phase name.
2. Goal.
3. What changed.
4. Files created/modified.
5. Technical decisions.
6. Manual test instructions.
7. Known limitations.
8. Bugs or risks.
9. Next recommended phase.

Documentation is not optional.

If you implement without updating docs, the phase is incomplete.

---

## Progress Documentation Format

Append entries to `docs/PROGRESS.md` like this:

```md
## Phase X — Title

### Goal

Describe the purpose of the phase.

### Implemented

- Item 1
- Item 2
- Item 3

### Files Changed

- `path/to/file.tsx` — reason
- `path/to/file.ts` — reason

### Decisions

- Decision 1
- Decision 2

### Manual Testing

- Step 1
- Step 2
- Step 3

### Known Limitations

- Limitation 1
- Limitation 2

### Next Steps

- Step 1
- Step 2
```

---

## Commit Requirements

Make small commits.

Recommended commit messages:

```bash
git commit -m "feat: add camera focus zone calibration"
git commit -m "refactor: normalize gate signal mode naming"
git commit -m "docs: document camera calibration workflow"
git commit -m "feat: add fullscreen scene mode"
git commit -m "feat: add local plate list playback"
```

At the end of a phase, report:

- Commits made.
- Files changed.
- Manual tests performed.
- Known issues.
- Recommended next prompt.

If you cannot run git, state the exact commits the user should create manually.

---

## Quality Bar

Do not just make something that works.

Make it:

- Maintainable.
- Documented.
- Safe.
- Easy to test.
- Easy to extend.
- Friendly for technical users.
- Clean enough for management demos.

Avoid one-off hacks unless explicitly labeled and documented.

---

## Response Format After Each Phase

After completing a phase, respond with:

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
