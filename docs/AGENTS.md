# AGENTS.md — Plate Runner

## Project Overview

Plate Runner is a vehicle plate simulation system.

The app displays cars with specific license plates on a screen, simulating vehicle movement through a lane/gate area. External cameras may physically point at the screen to detect, read, and validate the plates shown by the simulation.

This project is intended for:

1. Manual visual testing.
2. Automated testing.
3. Camera-based plate recognition validation.
4. Training and demonstration.
5. Remote display/control between computers.
6. Future API-driven simulation runs from local tests or CI systems such as GitHub Actions.

The original PlateRunner concept was a client-only React app using localStorage to manage plate lists and animated SVG vehicles. The new version keeps the visual plate-runner concept but expands it into a more robust simulator with backend, remote mode, pairing, scheduling, API control, and camera calibration features.

---

## Current Development Strategy

Build the project in phases.

Do not jump ahead into backend, remote pairing, scheduler, or API features until the visual simulation is reliable enough for camera-based validation.

The current priority is:

1. Visual simulation.
2. Camera focus/readability.
3. Gate behavior.
4. Plate list playback.
5. Backend/API.
6. Remote pairing.
7. Scheduler.
8. Production hardening.

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

Do not use:

```tsx
dangerouslySetInnerHTML
```

for plates or user-provided values.

All plate rendering must be plain text through React/SVG text nodes.

---

## Visual Simulation Requirements

The simulator must support:

### Direction

```ts
type VehicleDirection = "incoming" | "away";
```

Meaning:

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

Detector placement represents where the camera/detector is located relative to the vehicle.

It affects the visual point of view.

Examples:

- `center_front`: centered front view.
- `driver_front`: front view from driver side.
- `passenger_front`: front view from passenger side.
- `center_back`: centered rear view.
- `driver_back`: rear view from driver side.
- `passenger_back`: rear view from passenger side.

### Gate

The simulator uses a parking-arm-style gate.

Gate behavior must support:

```ts
type GateMode = "auto_open" | "wait_for_signal";
```

Meaning:

- `auto_open`: vehicle approaches, stops or slows, gate opens automatically, vehicle exits.
- `wait_for_signal`: vehicle approaches, stops at gate, plate remains readable, gate stays closed until an explicit signal opens it.

If older code uses `stay_closed`, treat it as legacy/deprecated and migrate toward `wait_for_signal`.

---

## Camera Readability Requirements

External cameras may watch the full screen but focus on a specific area.

The simulator must support a camera focus zone:

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

During the stopped/waiting phase, the license plate must be stable and readable inside the focus zone.

The focus zone should be configurable and documented.

The simulator should have:

- Focus Zone Overlay.
- Calibration Mode.
- Camera Mode.
- Fullscreen Scene.
- Debug Overlay.

---

## Simulation States

Preferred simulation states:

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

If the current implementation uses simpler states like `running`, `at_gate`, or `done`, document the current behavior and gradually migrate toward the preferred state model.

---

## Monorepo Structure

Preferred structure:

```txt
plate-runner/
  apps/
    web/
      src/
  packages/
    shared/
      src/
  docs/
```

Future expected structure:

```txt
plate-runner/
  apps/
    web/
    server/
  packages/
    shared/
    simulation-core/
  docs/
  docker-compose.yml
```

---

## Documentation Rules

Every development phase must update the `docs/` folder.

At minimum, maintain:

```txt
docs/PROGRESS.md
docs/SIMULATION_SPEC.md
```

As features are added, create or update:

```txt
docs/CAMERA_CALIBRATION.md
docs/PLATE_LISTS_SPEC.md
docs/API_SPEC.md
docs/REMOTE_PAIRING_SPEC.md
docs/SCHEDULER_SPEC.md
docs/SECURITY_SPEC.md
docs/DEPLOYMENT.md
```

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

Use small, descriptive commits.

Examples:

```bash
git commit -m "chore: initialize plate runner monorepo"
git commit -m "feat: add initial 2.5d vehicle simulator"
git commit -m "feat: add camera focus zone calibration"
git commit -m "refactor: normalize gate signal mode naming"
git commit -m "feat: add gate arm simulation timeline"
git commit -m "docs: document simulation phase progress"
```

If multiple unrelated changes are made, split them into separate commits.

Every phase should end with at least one commit.

---

## Security Rules

Because this app may later be publicly accessible and API-controlled:

- Validate all external inputs with schemas.
- Never trust client payloads.
- Never render untrusted input as HTML.
- Restrict plate values to `A-Z0-9`, max 12 chars.
- Add payload size limits when backend exists.
- Use API keys for automated test endpoints.
- Use long internal tokens for remote pairing/control.
- Pairing codes are user-friendly identifiers, not security secrets.
- Keep pairings revocable.
- Log connection events.
- Avoid leaking API keys in frontend code.

---

## Future Backend Requirements

The backend will eventually support:

- Local Docker deployment.
- REST API.
- WebSocket or SSE communication.
- API key authentication.
- Event status tracking.
- Gate open signal endpoint.
- Remote pairing between computers.
- Logs of connections and API calls.

Expected API examples:

```http
POST /api/v1/local/run
GET /api/v1/events/:eventId/status
POST /api/v1/events/:eventId/open-gate
POST /api/v1/events/:eventId/cancel
GET /health
```

Do not implement backend until the visual simulator and camera calibration are stable, unless explicitly instructed.

---

## UX Principles

The app must be usable by:

1. Technical testers.
2. Developers.
3. Management/demo users.

Therefore:

- Keep basic controls simple.
- Put advanced controls behind collapsible sections.
- Provide clear labels.
- Provide Camera Mode for clean camera-facing output.
- Do not place UI overlays over the plate focus zone unless explicitly enabled.
- Keep debug overlays optional.

---

## Important Development Instruction

Before starting a new feature:

1. Read this file.
2. Read `CLAUDE.md`.
3. Read the relevant docs in `docs/`.
4. Update docs as part of the implementation.
5. Commit changes.
6. Return a clear phase summary.

Do not proceed silently.
