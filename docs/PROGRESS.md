# Plate Runner — Progress Log

---

## Phase 0.2 — Camera Calibration & Visual Stabilization (2025-07-03)

### What was built / changed

**Goal**: Make the simulation reliable for external cameras reading plates off the screen.

#### Audit fixes
| Issue | Resolution |
|---|---|
| `GateMode: 'stay_closed'` | Renamed to `'wait_for_signal'` everywhere |
| `SimulationConfig.showGate: boolean` | Removed (redundant; `gateMode: 'hidden'` suffices) |
| Car constants duplicated in Vehicle.tsx | Moved to `depth.ts` as shared exports (`CAR_LW`, `CAR_LH`, `CAR_PLATE_X`, etc.) |
| Status text "WAITING AT GATE" | Updated to "WAITING FOR SIGNAL" |

#### New features
- **`FocusZoneConfig`** — type added to `packages/shared`; describes camera focus zone in %
- **`DEFAULT_FOCUS_ZONE`** — pre-calibrated defaults that capture plate at reading position for all placements
- **`FocusZoneOverlay`** — SVG component inside scene: dashed rect + corner brackets + label + readability badge
- **`FocusZoneControls`** — sidebar section: X/Y/W/H sliders, color picker, label, reset button
- **`DebugOverlay`** — HTML overlay (absolute, bottom-left): phase, t, detector, gate, focus zone, plate in zone, overlap%, readability
- **`getPlateSceneRect(t, placement)`** — returns plate bounding rect in SVG scene coordinates
- **`getPlateReadability(t, placement, focusZone)`** — returns `inZone`, `overlapPercent`, `readability: 'good'|'partial'|'poor'`
- **Calibration Mode** — freezes vehicle at reading position; quick plate test buttons (ABC123, 12-char, etc.); re-center button
- **Fullscreen Scene** — CSS fixed overlay; simulation fills viewport; status badge; Esc to exit
- **Camera Mode** — clean fullscreen; all overlays hidden; minimal exit button; focus zone visible only if `showOverlay` is set
- **Live readability badge** in header — always shows current plate readability state
- **Reading position constants** — `READING_T_INCOMING = 0.46`, `READING_T_AWAY = 0.58`

---

### Gate mode naming (final)

| Value | Meaning |
|---|---|
| `auto_open` | Gate opens automatically when vehicle is `GATE_OPEN_LEAD` ahead of gate |
| `wait_for_signal` | Vehicle stops at reading position and waits for manual/API signal |
| `hidden` | Gate not rendered |

### Simulation phases

| Phase | Trigger |
|---|---|
| `idle` | Initial state / after stop/reset |
| `running` | Vehicle animating along road |
| `at_gate` | Vehicle stopped at reading position (`wait_for_signal` mode or `holdAt()` call) |
| `done` | Vehicle completed the full run |

### Reading positions (when plate is most legible)

| Mode | Reading T | Legibility window |
|---|---|---|
| `auto_open` | Brief window as car passes t=0.46–0.52 | ~0.5–1.5s depending on speed |
| `wait_for_signal` | Indefinite hold at t=0.46 (incoming) or t=0.58 (away) | Until gate opens |
| Calibration | Frozen at reading_t | Permanent |

---

### File inventory (new/modified)

```
packages/shared/src/types/simulation.ts  [MODIFIED] — GateMode rename, FocusZoneConfig, DEFAULT_FOCUS_ZONE, remove showGate
apps/web/src/utils/depth.ts              [MODIFIED] — CAR_* constants, getPlateSceneRect, getPlateReadability, READING_T_*
apps/web/src/hooks/useSimulation.ts      [MODIFIED] — wait_for_signal, holdAt(), reading T constants
apps/web/src/components/simulation/
  Gate.tsx                               [MINOR] — hidden mode comment
  Vehicle.tsx                            [MODIFIED] — imports CAR_* from depth.ts
  SimulationScene.tsx                    [MODIFIED] — FocusZoneOverlay, DebugOverlay, cameraMode prop, calibration banner
  FocusZoneOverlay.tsx                   [NEW]
  DebugOverlay.tsx                       [NEW]
apps/web/src/components/controls/
  ControlPanel.tsx                       [MODIFIED] — wait_for_signal label, FocusZone section, Calibration section, View Modes
  FocusZoneControls.tsx                  [NEW]
apps/web/src/App.tsx                     [MODIFIED] — AppMode state, calibration logic, fullscreen/camera layouts, readability badge
docs/PROGRESS.md                         [UPDATED]
docs/SIMULATION_SPEC.md                  [UPDATED]
docs/CAMERA_CALIBRATION.md               [NEW]
```

---

### Limitations (Phase 0.2)

- Focus zone position/size is adjusted via sliders; there is no drag-to-resize yet.
- Plate readability check is geometric overlap only (no optical/contrast analysis).
- No night/day lighting mode.
- No vehicle speed-up/slow-down near gate in auto_open mode (constant speed).
- Fullscreen uses CSS overlay, not the browser Fullscreen API (avoids permission prompt).
- Single lane, single gate, single vehicle.
- No backend, no remote, no plate lists (next phases).

---

## Phase 0.1 — Visual Simulation Engine (2025-07-03)

End-to-end 2.5D visual simulation. Car with configurable plate travels
down a perspective road past a parking-arm gate. Full sidebar controls.

Key decisions:
- SVG viewBox 800×500, responsive via `aspect-ratio`
- Depth formula: `scale = lerp(0.04, 1.0, t^0.8)`
- Gate at t=0.52
- Plate: SVG `<text>` + `textLength` attribute — text always fits, never HTML
- Framer Motion for gate arm rotation only

---

## Recommended next prompts

### Phase 0.3 — Plate list & queue
> "Implement a plate queue. Load a list of plates from a textarea or JSON. Auto-run vehicles
> sequentially with a configurable gap. Show progress (current / total). Allow pause and skip."

### Phase 0.4 — WebSocket + remote control
> "Add a Fastify backend in apps/api. Implement a WebSocket server that accepts:
> - push_plate(plate)
> - open_gate / close_gate
> - start / stop / reset
> The web frontend connects on startup and shows connection status."

### Phase 0.5 — Docker
> "Add Dockerfile for apps/web (nginx). Add docker-compose.yml with web + api services."
