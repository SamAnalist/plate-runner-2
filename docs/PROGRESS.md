# Plate Runner — Progress Log

Format follows `CLAUDE.md § Progress Documentation Format`.

---

## Phase 0.2 — Camera Calibration & Visual Stabilization

**Date:** 2025-07-03

### Goal

Stabilize the visual simulation for external camera use.
Make the license plate reliably readable from a camera pointing at the screen.
Add a focus zone, calibration mode, fullscreen, and camera mode.
Normalize gate mode naming to `wait_for_signal`.

### Implemented

- `FocusZoneConfig` type and `DEFAULT_FOCUS_ZONE` constant in `packages/shared`
- `getPlateSceneRect(t, placement)` — returns plate bounding rect in SVG scene coordinates
- `getPlateReadability(t, placement, focusZone)` — returns `inZone`, `overlapPercent`, readability grade
- `READING_T_INCOMING = 0.46`, `READING_T_AWAY = 0.58` named constants
- `FocusZoneOverlay` — SVG component: dashed rect, corner brackets, readability badge, debug coords
- `DebugOverlay` — HTML overlay: phase, t, detector, gate state, focus zone config, readability
- `FocusZoneControls` — sidebar: X/Y/W/H sliders, color picker, label input, reset button
- `holdAt(t)` method on `SimulationControls` — freeze vehicle at arbitrary depth
- **Calibration Mode** — vehicle frozen at reading position; quick plate test buttons; re-center button
- **Fullscreen Scene** — CSS fixed overlay, simulation fills viewport, status badge, Esc to exit
- **Camera Mode** — clean fullscreen, overlays hidden, minimal exit button
- Live readability badge in header (GOOD / PARTIAL / POOR)
- Gate mode renamed: `stay_closed` → `wait_for_signal`
- `SimulationConfig.showGate` field removed (was redundant with `gateMode: 'hidden'`)
- Car body constants (`CAR_LW`, `CAR_LH`, `CAR_PLATE_X`, etc.) moved from `Vehicle.tsx` to `depth.ts` (single source of truth)

### Files Changed

- `packages/shared/src/types/simulation.ts` — GateMode rename, FocusZoneConfig, DEFAULT_FOCUS_ZONE, remove showGate
- `apps/web/src/utils/depth.ts` — CAR_* constants, getPlateSceneRect, getPlateReadability, READING_T_*
- `apps/web/src/hooks/useSimulation.ts` — wait_for_signal, holdAt(), reading T constants
- `apps/web/src/components/simulation/Gate.tsx` — hidden mode comment
- `apps/web/src/components/simulation/Vehicle.tsx` — imports CAR_* from depth.ts
- `apps/web/src/components/simulation/SimulationScene.tsx` — FocusZoneOverlay, DebugOverlay, cameraMode prop, calibration banner
- `apps/web/src/components/simulation/FocusZoneOverlay.tsx` — NEW
- `apps/web/src/components/simulation/DebugOverlay.tsx` — NEW
- `apps/web/src/components/controls/ControlPanel.tsx` — wait_for_signal label, FocusZone, Calibration, View Modes sections
- `apps/web/src/components/controls/FocusZoneControls.tsx` — NEW
- `apps/web/src/App.tsx` — AppMode state, calibration logic, fullscreen/camera layouts, readability badge
- `docs/PROGRESS.md` — updated
- `docs/SIMULATION_SPEC.md` — updated with focus zone spec, readability formula, test matrix
- `docs/CAMERA_CALIBRATION.md` — NEW: physical setup, calibration workflow, troubleshooting

### Decisions

- Focus zone uses percentages, not pixel coordinates — responsive at any viewport size
- Plate readability is geometric overlap (not optical) — sufficient for calibration positioning
- Fullscreen uses CSS `position: fixed` overlay, not the browser Fullscreen API — avoids permission prompt and keeps behavior predictable
- Calibration mode freezes via `holdAt()` rather than a separate render path — reuses existing simulation state
- `hidden` added as a third GateMode despite AGENTS.md only specifying two — documented as a UI convenience extension

### Manual Testing

1. `pnpm dev` → open `http://localhost:5173`
2. Verify plate `ABCDEFGHIJ12` (12 chars) stays inside plate rectangle at all depths
3. Calibration Mode → Enter → switch plates (ABC123 / ABCDEFGHIJ12 / A) → verify readability badge
4. Focus Zone controls → move X/Y/Width/Height → verify overlay moves on scene
5. Gate mode `wait_for_signal` → Start → vehicle stops → Open Gate → vehicle exits
6. Gate mode `auto_open` → Start → gate opens before vehicle arrives
7. Fullscreen Scene → verify Esc exits, status badge visible
8. Camera Mode → verify all overlays hidden, simulation clean
9. Debug: ON → verify all fields in debug overlay show correct values
10. Test all 12 direction × placement combos (see SIMULATION_SPEC.md §12)

### Known Limitations

- Focus zone resized only by sliders; no drag-to-resize yet
- Plate readability is geometric only (not optical/contrast analysis)
- Vehicle moves at constant speed; no deceleration near gate in `auto_open` mode
- Single lane, single gate, single vehicle
- No backend, no remote, no plate lists

### Next Steps

- Phase 0.3: Plate queue/list playback
- Phase 0.4: WebSocket + remote control
- Phase 0.5: Docker deployment

---

## Phase 0.1 — Initial Monorepo and Visual Simulator Base

**Date:** 2025-07-03

### Goal

Build the foundational 2.5D visual simulation from scratch.
A single car with a configurable license plate travels through a perspective
road past a parking-arm gate. All controls in a local sidebar. No backend.

### Implemented

- pnpm workspace monorepo: `apps/web` + `packages/shared`
- `packages/shared` — `SimulationConfig`, `Direction`, `DetectorPlacement`, `GateMode`, `ValidationResult`, `validatePlate()`
- SVG 800×500 scene with perspective road, vanishing point, lane markings
- Vehicle SVG (front + rear views, 6 color palettes, shadow, skewX for driver/passenger)
- `LicensePlate` — SVG `<text>` + `textLength` attribute guarantees text always fits
- `Gate` — parking arm with Framer Motion rotation, LED status light, reflective stripes
- `useSimulation` — `requestAnimationFrame` loop, phases: `idle / running / at_gate / done`
- `ControlPanel` — plate input, direction, placement (3×2 grid), gate, color, speed, playback
- `PlateInput` — validation on every keystroke, instant error display

### Files Changed

- `pnpm-workspace.yaml` — monorepo root
- `package.json` — root scripts
- `packages/shared/src/types/simulation.ts` — all simulation types
- `packages/shared/src/validators/plate.ts` — `validatePlate()`
- `apps/web/` — full Vite + Tailwind + TypeScript config
- `apps/web/src/utils/depth.ts` — perspective math (lerp, getDepthValues, getVehicleX, getSkewDeg)
- `apps/web/src/hooks/useSimulation.ts` — rAF animation loop
- `apps/web/src/components/simulation/` — SimulationScene, Road, Vehicle, LicensePlate, Gate
- `apps/web/src/components/controls/` — ControlPanel, PlateInput
- `apps/web/src/App.tsx` — layout shell
- `docs/PROGRESS.md`, `docs/SIMULATION_SPEC.md` — initial docs

### Decisions

- SVG viewBox 800×500 with responsive `aspect-ratio` container — precise coordinate math, scales cleanly
- Non-linear depth scale (`t^0.8`) — objects grow faster when approaching, matches natural perspective
- Plate text via SVG `<text>` + `textLength="…" lengthAdjust="spacingAndGlyphs"` — hard-clamps text width, zero HTML injection risk
- Framer Motion only for gate arm rotation — everything else uses rAF + React state
- `packages/shared` has zero runtime dependencies — can later be consumed by a Node backend without pulling React
- Gate mode was initially `stay_closed` (renamed to `wait_for_signal` in Phase 0.2)

### Manual Testing

1. Start with default plate `ABC123`, direction `incoming`, `center_front`
2. Press Start → vehicle animates from top (small) to bottom (large)
3. Change to `away` → vehicle starts large and shrinks upward
4. Try each detector placement → verify horizontal offset and skew
5. Try `wait_for_signal` mode → vehicle stops at gate → Open Gate → exits
6. Enter invalid plate (e.g., `A-B`) → verify error message, plate not updated

### Known Limitations

- Gate mode was `stay_closed` at this point (renamed in 0.2)
- No focus zone, no calibration mode, no fullscreen
- No platform for camera testing

### Next Steps

- Add camera focus zone → Phase 0.2
- Add plate list queue → Phase 0.3
- Add backend → Phase 0.4+

---

## Recommended Next Prompts

### Phase 0.3 — Plate List Playback
> "Implement a plate queue. Add a textarea in the sidebar where the user pastes plates (one per line). A 'Run Queue' button launches vehicles sequentially: each vehicle runs, pauses at gate (or passes), then disappears. Show progress (2/12). Allow pause, skip, and configurable gap between vehicles."

### Phase 0.4 — WebSocket + Remote Control
> "Add a Fastify backend in apps/api. Implement a WebSocket server accepting: push_plate(plate), open_gate, close_gate, start, stop, reset. Frontend connects on startup and shows connection status."

### Phase 0.5 — Docker
> "Add Dockerfile for apps/web (nginx). Add docker-compose.yml with web + api services."
