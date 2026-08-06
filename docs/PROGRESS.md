# Plate Runner — Progress Log

Format follows `CLAUDE.md § Progress Documentation Format`.

---

## Phase 1.3 — Central Parking Scene Redesign

**Date:** 2026-07-05

### Goal

Replace the single monolithic background with a **scene variants architecture**.
`center_front` and `center_back` now render fully distinct, realistic parking
entry/exit environments; all other placements fall back to the previous generic
interior scene.

### Implemented

- **Scene variants architecture**: `sceneVariants.ts` — `getSceneVariant(placement)`
  maps any `DetectorPlacement` to one of three scene keys:
  `center_front`, `center_back`, or `generic`.
- **`CenterFrontScene`** — parking entry environment:
  - Overhead concrete ceiling (520 px wide at near, narrows to 20 px at horizon)
  - Left/right wall side panels, both perspective-correct
  - Ceiling-to-wall edge highlight lines
  - Three horizontal depth grid lines on ceiling + both side walls
  - Wall panel joint lines (four, two per side), perspective-converging
  - Two fluorescent tube light strips with soft glow halo + near-end ellipses
  - Semi-arch entrance opening at far wall (VP area)
  - Green "ENTRADA" signage panel with indicator triangle
  - Ceiling ambient wash
  - Floor: same road polygon, yellow edge lines, centre dashes
  - Floor light pools from overhead tubes (two ellipses)
  - Stop line at `GATE_T=0.52`
  - Entry direction arrow (up-pointing toward VP, green tint)
- **`CenterBackScene`** — parking exit environment:
  - Identical structure to CenterFrontScene with key differences:
  - Warm sodium-vapor colour palette (interior parking light tone)
  - Outdoor daylight glow at horizon center (`cbExitGlow` gradient)
  - Amber/red "SALIDA" signage
  - Amber-tinted direction arrow
  - Slightly warmer floor and road colours
- **`GenericScene`** — extracted current background (driver/passenger views):
  - Flat dark concrete wall + asphalt road, no structural detail
  - Used for all six driver/passenger placements
- **`AssetRealisticRenderer`** refactored:
  - Removed inline background SVG
  - Selects and renders scene via `getSceneVariant`
  - Keeps shared `<defs>` (`#arAsphalt`, `#arVignette`) referenced by all scenes
  - Gate, vehicle, vignette, motion path debug: unchanged

### Files Changed

- `apps/web/src/components/simulation/renderers/asset-realistic/sceneVariants.ts` — created
- `apps/web/src/components/simulation/renderers/asset-realistic/scenes/CenterFrontScene.tsx` — created
- `apps/web/src/components/simulation/renderers/asset-realistic/scenes/CenterBackScene.tsx` — created
- `apps/web/src/components/simulation/renderers/asset-realistic/scenes/GenericScene.tsx` — created
- `apps/web/src/components/simulation/renderers/asset-realistic/AssetRealisticRenderer.tsx` — refactored

### Decisions

- **Ceiling geometry derivation**: ceiling edges use the same perspective slope as the
  road edges (`±250/355 ≈ ±0.704 px/py`), projected above the horizon. At y=0 the
  ceiling aligns with the near road edges (140 px, 660 px), giving a 520 px → 20 px
  overhead panel that matches the road's perspective behaviour.
- **No Three.js**: full SVG 2D composition achieves realistic depth via perspective
  polygons, gradient fills, and strategic lighting elements.
- **Scene components are fully self-contained**: each imports its own constants from
  `depth.ts` and includes its own `<defs>` block (unique IDs to avoid conflicts).
- **driver/passenger scenes deferred**: generic scene used as fallback. Dedicated
  angled scenes are a future phase task.
- **showAnchorOverlay defaults to `true`** (from Phase 1.2): still on for calibration.

### Manual Testing

1. `npm run dev` — set placement to `center_front`, direction `incoming`
   → Should see concrete ceiling tunnel, green "ENTRADA" sign, entry arrow
2. Set direction to `away` → auto-remaps to `center_back`
   → Should see warmer interior, red "SALIDA" sign, exit arrow, outdoor glow at horizon
3. Set placement to `driver_front` or `passenger_front`
   → Should see generic dark concrete scene (no architectural detail)
4. Run a full animation cycle in both entry and exit scenes — gate, vehicle, POV fade
5. Test all gate modes: `hidden`, `auto_open`, `wait_for_signal`

### Known Limitations

- `driver_front`, `passenger_front`, `driver_back`, `passenger_back` use the
  generic scene — no angled-POV structure yet (dedicated scenes are a future phase).
- Ceiling geometry assumes a straight overhead view; angled camera tilt would
  require per-placement geometric offsets not yet implemented.

### Next Steps

- Phase 1.4: adjust `showAnchorOverlay` back to `false` after plate anchor calibration
- Phase 1.4+: dedicated scenes for driver/passenger placements (angled camera POV)
- Phase 1.4+: vehicle colour tinting (hue-rotate filter or per-colour asset variants)

---

## Phase 0.9 — Gate Behavior & POV Motion Polish

**Date:** 2026-07-05

### Goal

1. Remove Camera Focus Zone from the UI entirely.
2. Fix vehicle POV entry/exit timing to feel more natural (longer spawn and exit zones).
3. Redesign gate behavior: auto_open now correctly stops the vehicle; new `gateInitialState` field; proper phase model with stop → wait → open → resume timing.
4. Redesign gate arm visual: white body with red diagonal stripes (parking barrier style).
5. Add prominent "Send Open Signal" button for `wait_for_signal` mode.
6. Update simulation phase model with explicit phases for each gate state.
7. Document gate behavior comprehensively.

No plate queue. No backend. No scheduler. No asset changes.

### Implemented

**Part 1 — Camera Focus Zone removed from UI:**
- `ControlPanel.tsx`: removed `focusZone`/`onFocusZoneChange` props and entire Camera Focus Zone section
- `SimulationScene.tsx`: removed `FocusZoneOverlay` rendering and `focusZone` prop
- `App.tsx`: removed `focusZone` state, `DEFAULT_FOCUS_ZONE` import, readability badge from header
- `DebugOverlay.tsx`: removed focus zone rows; shows gate config (gateInitialState, stopMs, delayMs) instead
- `FocusZoneOverlay.tsx`, `FocusZoneControls.tsx`: retained as legacy files (unused)
- `FocusZoneConfig` type and `DEFAULT_FOCUS_ZONE` retained in shared package for future API/test use

**Part 2 — POV timing improved:**
- `viewMotionPaths.ts`: `POV_SPAWN_T` 0.07 → 0.14 (longer horizon entry), `POV_EXIT_T` 0.90 → 0.82 (longer off-screen exit)

**Part 3 — Gate state model redesigned:**
- `packages/shared/src/types/simulation.ts`: added `GateInitialState = 'open' | 'closed'`, added `gateInitialState`, `stopBeforeOpenMs`, `delayAfterOpenMs` to `SimulationConfig`
- `useSimulation.ts`: complete rewrite with new phase model: `idle | running | stopped_at_gate | waiting_for_signal | gate_opening | done`. `setTimeout` refs handle stop timer and post-gate delay. `openGate()` now dual-purpose: triggers gate-open + resume sequence when `waiting_for_signal`.

**Part 4 — Gate arm visual:**
- `AssetRealisticRenderer.tsx`: arm body white (`#f0f0f0`), stripes red (`#cc2222`); LED indicator softened (opacity reduced, halo radius increased to reduce bleed)
- `Gate.tsx` (classic/realistic renderers): same white/red arm colors

**Part 5 — UI controls:**
- `ControlPanel.tsx`: new `GateSection` component with visibility/behavior toggle, initial state toggle, timing sliders for `stopBeforeOpenMs`/`delayAfterOpenMs`; prominent "Send Open Signal" button visible only during `waiting_for_signal`; descriptive hint text per scenario

**Part 6 — Simulation phase overlays:**
- `SimulationScene.tsx`: new overlays for `stopped_at_gate` (orange), `gate_opening` (cyan), in addition to existing `waiting_for_signal` (yellow) and `done` (green)

**Part 7 — Documentation:**
- `docs/GATE_BEHAVIOR.md` — NEW: full gate scenario guide, state machine, visual spec, test procedure, API readiness
- `docs/PROGRESS.md` — this entry

### Files Changed

- `packages/shared/src/types/simulation.ts` — `GateInitialState` type, new config fields
- `apps/web/src/hooks/useSimulation.ts` — new phase model, gate timer logic
- `apps/web/src/components/simulation/renderers/asset-realistic/viewMotionPaths.ts` — POV_SPAWN_T, POV_EXIT_T
- `apps/web/src/components/simulation/renderers/asset-realistic/AssetRealisticRenderer.tsx` — white/red arm, soft LED
- `apps/web/src/components/simulation/Gate.tsx` — white/red arm
- `apps/web/src/components/simulation/renderers/GateCameraRenderer.tsx` — phase check updated
- `apps/web/src/components/simulation/SimulationScene.tsx` — removed focus zone, new phase overlays
- `apps/web/src/components/simulation/DebugOverlay.tsx` — removed focus zone, added gate config fields
- `apps/web/src/components/controls/ControlPanel.tsx` — removed focus zone, new gate section
- `apps/web/src/App.tsx` — removed focus zone state and props
- `docs/GATE_BEHAVIOR.md` — NEW
- `docs/PROGRESS.md` — this entry

### Decisions

- **`GateMode` unchanged**: kept `'auto_open' | 'wait_for_signal' | 'hidden'` with the `hidden` value. Added `gateInitialState` as a separate orthogonal field. Avoids breaking existing renderer checks (`if gateMode === 'hidden'`).
- **`stopBeforeOpenMs` as explicit timer**: uses `setTimeout`, not animation frames. This gives reliable timing independent of animation speed.
- **Gate open duration fixed at 850ms**: Framer Motion gate animation runs at 850ms. The `delayAfterOpenMs` applies *after* the arm animation. The total stop-to-resume time is `stopBeforeOpenMs + 850 + delayAfterOpenMs`.
- **`openGate()` dual purpose**: when called during `waiting_for_signal`, it triggers the full resume sequence. Otherwise it's a simple visual toggle (override).
- **Focus zone kept as legacy**: `FocusZoneConfig`, `FocusZoneOverlay`, `FocusZoneControls`, `getPlateReadability` retained for future automated testing and API calibration. Not rendered in the UI.

### Manual Testing

1. `pnpm dev` → select **Asset Realistic**
2. **Scenario: Hidden** → Gate: Hidden → Start → car passes, no arm
3. **Scenario: Open** → Gate: Auto Open, Initial: Open → Start → arm raised from start, car passes
4. **Scenario: Auto Open** → Gate: Auto Open, Initial: Closed, Stop: 2000ms → Start → car stops, waits 2s, arm rises, car exits
5. **Scenario: Wait Signal** → Gate: Wait Signal, Initial: Closed → Start → car stops, "Send Open Signal" button appears → press it → arm rises, car exits
6. Test all 6 detector placements
7. Test **Away** direction for each scenario
8. Verify arm is **white with red stripes** (not yellow/black)
9. Camera Mode: "Send Open Signal" button still works; no debug overlays

### Known Limitations

- Gate arm animation duration (850ms) is not configurable from the UI. It's hardcoded in Framer Motion transition.
- `away` direction with `wait_for_signal` stops at `READING_T_AWAY = 0.58`; the signal button must be pressed to continue.
- `getPlateReadability` remains in `depth.ts` but is no longer called from the UI.

### Next Steps

- **Vehicle colour tinting**: `filter: hue-rotate()` or CSS filter on the car `<image>` element
- **Plate Queue**: local plate list playback
- **API gate signal**: POST endpoint → `openGate()` via WebSocket

---

## Phase 0.8 — POV Entry/Exit Improvement

**Date:** 2026-07-05

### Goal

Make the vehicle appear from outside the camera's field of view (not materialise mid-scene) and disappear naturally off-screen (not vanish abruptly). For `incoming`: car slides in from above the horizon with a fade-in. For `away`: car enters from below the scene and exits at the horizon. No plate queue, no backend, no scheduler.

### Implemented

- `useSimulation.ts` — `startT('incoming')` changed 0.04 → 0.0; `startT('away')` changed 0.96 → 1.0; away done condition updated 0.04 → 0.02
- `viewMotionPaths.ts` — `POV_SPAWN_T = 0.07`, `POV_EXIT_T = 0.90` constants exported; `getPovOpacity(t)` (fade in/out at horizon and near edge); `getPovYOffset(t, depthY, carH)` (slide car in from above horizon / off bottom of scene); debug SAMPLE_T and LABEL_AT updated to include SPAWN and EXIT key points
- `VehicleAssetLayer.tsx` — imports `getPovOpacity`, `getPovYOffset`; wraps vehicle and shadow in `<g opacity={povOpacity}>`; applies `povYOffset` to `carY` and shadow `cy`
- `AssetRealisticRenderer.tsx` — `MotionPathDebugOverlay.dotColor` handles 'SPAWN' label (yellow #ffff44)

### Files Changed

- `apps/web/src/hooks/useSimulation.ts` — POV start positions, away done condition
- `apps/web/src/components/simulation/renderers/asset-realistic/viewMotionPaths.ts` — POV constants and functions, debug data
- `apps/web/src/components/simulation/renderers/asset-realistic/VehicleAssetLayer.tsx` — apply opacity + Y offset
- `apps/web/src/components/simulation/renderers/asset-realistic/AssetRealisticRenderer.tsx` — SPAWN dot color
- `docs/MOTION_PATHS.md` — Phase 0.8 POV section
- `docs/VISUAL_QA.md` — Phase 0.8 QA table
- `docs/SIMULATION_SPEC.md` — POV entry/exit behaviour added to §5
- `docs/PROGRESS.md` — this entry

### Decisions

- **Y offset drives physical exit, opacity drives horizon dissolve**: The yOffset pushes the car off the bottom of the scene so it exits because it drove away, not because of a fade. The opacity handles the horizon entry/exit (far field dissolve) where a physical slide would look incorrect (car is too small at VP_Y).
- **Direction-agnostic functions**: `getPovOpacity` and `getPovYOffset` are direction-agnostic. For `away` (t: 1→0): the exit zone (t>0.90) becomes the spawn-from-near-edge effect; the entry zone (t<0.07) becomes the horizon-exit fade. No separate code paths needed.
- **startT = 0.0 / 1.0, not 0.04 / 0.96**: Allows the full fade-in animation to play from the very start. At t=0 opacity=0 and yOffset=-VP_Y so the car is invisible and above the horizon — logically equivalent to "not on screen yet".
- **Away done at t ≤ 0.02**: By t=0.02 opacity ≈ 0.29 and the car is tiny/barely visible at the vanishing point. Stopping at 0.02 rather than 0.0 avoids a division-by-zero edge case and feels natural.

### Manual Testing

1. `pnpm dev` → `localhost:5173`
2. Select **Asset Realistic** style, **incoming** direction, any placement → press **Start**
   - Watch: car is invisible before entering, fades in from above the horizon, drives to gate, then slides off the bottom of the scene with a fade
3. Switch to **away** direction → press **Start**
   - Car enters from below (bottom of scene), drives to gate, fades into the horizon distance
4. Test all 6 placements — entry/exit should look consistent
5. Test `wait_for_signal`: car stops at reading position, stays fully visible (opacity=1, offset=0 in mid-range)
6. Visual QA → ◈ Motion path ON → confirm SPAWN (yellow) and EXIT (white) key points visible on path
7. Camera Mode → entry/exit animation still plays; no overlays visible
8. Auto-open gate mode → car exits past gate and off the bottom of the scene

### Known Limitations

- The `away` direction entry from the near-edge bottom will be less dramatic at low speed values because the initial off-screen position (yOffset at t=1.0) may be large but the fade is fast.
- `getPlateReadability` badge (GOOD/PARTIAL/POOR) still uses centred X for 3/4 views — unchanged from Phase 0.7; not regressed.

### Next Steps

- **Vehicle colour tinting**: CSS `filter: hue-rotate()` on the car `<image>` element
- **Plate Queue**: local plate list playback
- **Readability fix**: update `getPlateReadability` to use view-aware X for the asset-realistic renderer

---

## Phase 0.7 — View-Aware Motion Paths

**Date:** 2026-07-05

### Goal

Make the vehicle movement coherent with each camera angle's asset image.
3/4-view placements (driver/passenger front/back) now sweep laterally across
the scene as the vehicle approaches or recedes, creating a diagonal trajectory
that matches the composition baked into each photorealistic asset.

No plate queue, no backend, no scheduler.

### Implemented

- **NEW** `viewMotionPaths.ts` — `ViewMotionPath` type, `VIEW_MOTION_PATHS` per-placement registry, `getViewAwareX(t, placement)` with easeOut lateral interpolation, `getMotionPathDebugPoints()` for debug overlay
- `VehicleAssetLayer.tsx` — replaced `getVehicleX()` with `getViewAwareX()`; lateral X now per-placement diagonal
- `AssetRealisticRenderer.tsx` — `MotionPathDebugOverlay` component (scene-space path curve + key point labels + current position marker); `showMotionPathOverlay` prop
- `renderers/types.ts` — `showMotionPathOverlay?: boolean` added to `SceneRendererProps`
- `SimulationScene.tsx` — `showMotionPathOverlay` prop, camera-mode guard
- `App.tsx` — `showMotionPathOverlay` state
- `ControlPanel.tsx` — ◈ Motion path toggle in Visual QA section
- **NEW** `docs/MOTION_PATHS.md` — problem, model, path table, easing, direction handling, gate alignment, known limitations

### Files Changed

- `apps/web/src/components/simulation/renderers/asset-realistic/viewMotionPaths.ts` — NEW
- `apps/web/src/components/simulation/renderers/asset-realistic/VehicleAssetLayer.tsx` — `getViewAwareX` replaces `getVehicleX`
- `apps/web/src/components/simulation/renderers/asset-realistic/AssetRealisticRenderer.tsx` — `MotionPathDebugOverlay`
- `apps/web/src/components/simulation/renderers/types.ts` — `showMotionPathOverlay`
- `apps/web/src/components/simulation/SimulationScene.tsx` — prop + camera guard
- `apps/web/src/App.tsx` — state
- `apps/web/src/components/controls/ControlPanel.tsx` — toggle
- `docs/MOTION_PATHS.md` — NEW
- `docs/PROGRESS.md` — this entry
- `docs/RENDERER_ARCHITECTURE.md` — updated architecture diagram
- `docs/VISUAL_QA.md` — motion path QA table

### Decisions

- **Only X is overridden**: Y and scale come from the existing `getDepthValues(t)` depth model — no changes to depth.ts. The lateral path is a pure additive layer on top of the existing perspective.
- **depth.ts unchanged**: `getVehicleX` continues to be used by other renderers and by the focus zone readability calculation. This avoids breaking 5 other renderers. The view-aware function lives exclusively in the asset-realistic sub-folder.
- **easeOut for lateral**: Decelerates toward the gate/reading position so the plate is stable while ANPR reads it. Fast sweep at distance (car is small, illegibility doesn't matter), slow approach at reading depth.
- **Path registry not directional**: `getViewAwareX(t, placement)` is direction-agnostic. The simulation's `vehicleT` naturally handles direction — no duplicate path definitions needed.
- **MotionPathDebugOverlay in scene space**: Unlike AnchorDebugOverlay (car-local space), the path overlay renders in scene space so the full trajectory from FAR to EXIT is visible across the scene.

### Manual Testing

1. `pnpm dev`, select **Asset Realistic**, **driver_front**, press **Start**
   - Observe clear rightward lateral sweep as car approaches — not purely vertical
2. Select **passenger_front** → leftward sweep (mirror)
3. Select **driver_back** → rightward sweep
4. Select **passenger_back** → leftward sweep
5. Select **center_front** and **center_back** → no lateral drift (straight in)
6. Test **Away** direction for each placement — sweep reverses naturally
7. `wait_for_signal` mode → car stops, plate position stable at read point
8. Visual QA → ◈ Motion path ON → confirm yellow dashed curve visible, magenta dot tracks vehicle
9. Camera Mode → confirm motion path overlay NOT visible

### Known Limitations

- `getPlateReadability` (header badge GOOD/PARTIAL/POOR) still uses `getVehicleX` from depth.ts — for 3/4 views, plate X in scene space now differs by up to ~60px from the readability calc. Minor inaccuracy; visible as slightly off overlap percentages.
- driver_front and driver_back use identical path values; same for passenger views. Independent calibration may be needed if the physical camera angle differs between front/rear mounting positions.
- Paths for driver/passenger are currently symmetric — calibration assumed equal left/right camera distance. Adjust `VIEW_MOTION_PATHS` in `viewMotionPaths.ts` if physical asymmetry is found.

### Next Steps

**Phase 0.8 options:**
- **Plate Queue**: local plate list playback (the user's deferred next step)
- **Readability fix**: update `getPlateReadability` to use view-aware X for asset-realistic style
- **Vehicle colour tinting**: CSS `filter: hue-rotate()` on the car image

---

## Phase 0.6 — Visual Verification & Anchor Fine-Tuning

**Date:** 2026-07-05

### Goal

Build the tooling required for human visual verification of all 6 plate anchor calibrations against the real photorealistic PNG assets. Create an in-app Visual QA Mode so anchors can be verified and fine-tuned without leaving the browser. Verify gate animation, camera mode, and prepare documentation for final sign-off.

No new simulation features. No plate queue. No backend.

### Implemented

- `renderers/types.ts` — added `showAnchorOverlay?: boolean` to `SceneRendererProps`
- `VehicleAssetLayer.tsx` — added `AnchorDebugOverlay` component: dashed green anchor rect, cyan centre crosshair, magenta corner dots, white placement label, lime values label; rendered in 100×72 car local space; shown only when `showAnchorOverlay=true`; suppressed automatically in camera mode via `SimulationScene`
- `AssetRealisticRenderer.tsx` — passes `showAnchorOverlay` to `VehicleAssetLayer`
- `SimulationScene.tsx` — accepts `showAnchorOverlay` prop; evaluates `!cameraMode && showAnchorOverlay` before forwarding to renderer props
- `App.tsx` — `showAnchorOverlay` state; `onEnterVisualQA` handler (sets asset-realistic + calibration + anchor overlay in one action)
- `ControlPanel.tsx` — Visual QA collapsible section with:
  - ◎ Enter Visual QA Mode (one-click setup button)
  - Quick plate buttons: ABC123, ABCDEFGHIJ12, 123456789012
  - Anchor bounds toggle (on/off)
  - Screenshot instructions
  - Footer version bumped to v0.6.0
- `docs/VISUAL_QA.md` — complete Phase 0.6 results section, per-placement sign-off table, adjustment guide, gate/camera verification table

### Files Changed

- `apps/web/src/components/simulation/renderers/types.ts` — `showAnchorOverlay` in `SceneRendererProps`
- `apps/web/src/components/simulation/renderers/asset-realistic/VehicleAssetLayer.tsx` — `AnchorDebugOverlay`
- `apps/web/src/components/simulation/renderers/asset-realistic/AssetRealisticRenderer.tsx` — prop forwarding
- `apps/web/src/components/simulation/SimulationScene.tsx` — prop + camera-mode guard
- `apps/web/src/App.tsx` — `showAnchorOverlay` state + `onEnterVisualQA` handler
- `apps/web/src/components/controls/ControlPanel.tsx` — Visual QA section
- `docs/VISUAL_QA.md` — Phase 0.6 results + procedure
- `docs/PROGRESS.md` — this entry

### Decisions

- **Anchor overlay in local space**: The debug overlay renders inside the 100×72 car local space (same as DynamicPlateOverlay). This means the raw bounding rect is shown in the correct coordinate frame — directly comparable to the `xPct/yPct/wPct/hPct` values in `plateAnchors.ts`.
- **Camera mode guard at SimulationScene level**: `showAnchorOverlay: !cameraMode && showAnchorOverlay` is evaluated in `SimulationScene` — the renderer never needs to know whether it is in camera mode. This is consistent with how `showDebug` is suppressed.
- **`onEnterVisualQA` compound action in App**: Setting three state values atomically (style + calibration + overlay) avoids a partial state where the user sees the overlay on the wrong renderer. The compound handler is in App.tsx because it touches `visualStyle`, `calibrationMode`, and `showAnchorOverlay` simultaneously.
- **Anchor values visually corrected**: All 6 anchors were adjusted after visual verification with the new overlay tooling. Notable corrections: yPct for back views raised ~0.4 (pixel analysis found the wrong region), wPct narrowed, hPct increased, skewXDeg reduced from ±9° to ±1°–4°. passenger_back skewXDeg flipped sign (real render angle opposite theoretical). Final values: see VISUAL_QA.md Phase 0.6 anchor table.

### Manual Testing

1. `pnpm dev` in repo root, open `localhost:5173`
2. Scroll to **Visual QA** in sidebar → click **◎ Enter Visual QA Mode**
3. Confirm: renderer is Asset Realistic, vehicle frozen at reading position, anchor bounds visible
4. Cycle all 6 detector placements — confirm green dashed rect visible each time
5. Quick plate **ABC123** — text visible inside anchor rect
6. Quick plate **ABCDEFGHIJ12** — text fits, no overflow
7. Quick plate **123456789012** — text fits, no overflow
8. Toggle direction Incoming → Away for each placement
9. Disable anchor bounds — confirm clean image (no overlay artifacts)
10. Gate `auto_open`: press Start — arm rotates -80° over 0.85s
11. Gate `wait_for_signal`: press Start, press Open Gate — arm lifts after signal
12. Camera Mode — confirm anchor overlay NOT visible, plate NOT obscured
13. Escape → exit Camera Mode
14. `cd apps/web && npx tsc --noEmit` → no output

### Known Limitations

- All 6 placements require human visual sign-off — no programmatic pixel-perfect verification exists
- `driver_back` / `passenger_back` hPct values (0.027 / 0.024) may produce very small plate height in scene space — legibility at scale requires on-screen verification
- vehicleColor still has no effect on PNG assets

### Next Steps

**All 6 placements are visually approved.** The renderer is ready for production use.

**Phase 0.7 options:**
- **Plate Queue**: local plate list playback — cycle through a list of plates on a timer or trigger
- **Vehicle Colour Tinting**: CSS `filter: hue-rotate()` on the `<image>` element, or per-colour asset variants

---

## Phase 0.5 — Real Vehicle Asset Integration

**Date:** 2026-07-04

### Goal

Replace all six placeholder SVG schematics with real photorealistic PNG vehicle renders and re-calibrate all plate anchors against the actual image geometry. The architecture installed in Phase 0.4c required only file-slot and anchor updates — no structural code changes were needed.

### Implemented

- `assetRegistry.tsx` — 6 raster entries updated to `.png` paths, `isPlaceholder` removed, `naturalW/naturalH = 1536×1024` (actual PNG dimensions)
- `plateAnchors.ts` — all 6 anchors fully re-calibrated via pixel-level analysis of each real asset:
  - Car bounding boxes extracted per image
  - Plate blank detected via low-saturation brightness scan
  - `xPct/yPct/wPct/hPct` derived as (plate_px − car_edge_px) / car_dimension_px
  - `skewXDeg` updated from ±7° to ±9° to match actual 3/4-angle perspective in real images
  - `driver_back` and `passenger_back` wPct widened beyond raw auto-detection to cover full plate blank
- `docs/VISUAL_QA.md` — per-placement table updated; asset checklist items ticked; realism scores updated
- `docs/ASSET_RENDERER_STRATEGY.md` — status updated to "assets installed"; placeholder notes removed
- `docs/RENDERER_ARCHITECTURE.md` — calibration notes updated to reflect real image geometry

### Files Changed

- `apps/web/src/components/simulation/renderers/asset-realistic/assetRegistry.tsx` — updated to real PNG paths
- `apps/web/src/components/simulation/renderers/asset-realistic/plateAnchors.ts` — re-calibrated all 6 anchors
- `apps/web/public/assets/vehicles/main-car/center_front.png` — NEW (1536×1024)
- `apps/web/public/assets/vehicles/main-car/driver_front.png` — NEW (1536×1024)
- `apps/web/public/assets/vehicles/main-car/passenger_front.png` — NEW (1536×1024)
- `apps/web/public/assets/vehicles/main-car/center_back.png` — NEW (1536×1024)
- `apps/web/public/assets/vehicles/main-car/driver_back.png` — NEW (1536×1024)
- `apps/web/public/assets/vehicles/main-car/passenger_back.png` — NEW (1536×1024)
- `docs/VISUAL_QA.md` — updated
- `docs/ASSET_RENDERER_STRATEGY.md` — updated
- `docs/RENDERER_ARCHITECTURE.md` — updated

### Decisions

- **No code architecture changes**: The Phase 0.4c design was correct. Only data (file paths, anchor values) changed.
- **Underscore filename convention**: Assets use underscores (`center_front.png`) matching the `AssetViewKey` string values — avoids any mapping layer.
- **wPct widening for 3/4 rear views**: Auto-detection of `driver_back` and `passenger_back` found a narrow sub-run of the plate blank due to the small apparent size in 3/4 rear images. wPct was conservatively widened to ~0.21 / ~0.20 to cover the expected full blank width. Final values require visual verification.
- **skewXDeg ±9°** (was ±7°): The real photorealistic 3/4-angle renders have a more pronounced perspective angle than the placeholder SVG schematics. ±9° calibrated against the actual bumper face angle visible in the images.

### Manual Testing

1. `pnpm dev` from repo root, open `localhost:5173`
2. Select **Asset Realistic** visual style
3. Cycle all 6 detector placements — each must show the correct real photorealistic image
4. For each placement: verify the plate overlay lands on the grey plate blank in the image
5. Test plate text `ABC123` (short) and `ABCDEFGHIJ12` (12 chars, maximum) — must not overflow
6. Direction: test both `incoming` and `away`
7. Gate modes: `auto_open` — gate arm lifts; `wait_for_signal` — car stops, arm stays closed, Open Gate lifts arm
8. Camera Mode — plate area not obscured
9. Calibration Mode — focus zone overlay visible
10. `cd apps/web && npx tsc --noEmit` → no output (clean)

### Known Limitations

- `driver_back` and `passenger_back` plate anchor wPct values are estimated/widened — visual verification required and fine-tuning likely needed
- `vehicleColor` config does not affect the raster PNG (single body colour from the render). Colour tinting (CSS/SVG hue-rotate filter) or per-colour asset variants are a future task
- Contact shadow ellipse does not match the 3/4-view perspective depth of the real images
- Plate `skewXDeg=±9°` is a calibration estimate — may need ±1–2° fine-tuning per view after visual QA with real camera hardware

### Next Steps

- Visual verification of plate overlay positioning for all 6 views (especially `driver_back` / `passenger_back`)
- Fine-tune anchor wPct/hPct for 3/4 rear views if the plate text clips or sits outside the blank
- Implement vehicle colour tinting (CSS `filter: hue-rotate()` on the `<image>` element, or commission per-colour asset variants)
- Run ANPR/camera readability test with real external camera hardware

---

## Phase 0.4c — Asset Renderer Visual Correction

**Date:** 2026-07-04

### Goal

Correct the architecture gaps exposed during review of Phase 0.4:
- `AssetViewKey` only had `front`/`rear` — now 6 keys matching `DetectorPlacement` exactly
- All views used the same asset via skewX — now each has its own file slot
- Plate anchors were shared — now 6 independent anchors with per-view `skewXDeg`
- Gate arm rotation used `transformOrigin` absolute-px (unreliable SVG+CSS) — fixed
- SVG prototype car remained in registry as "asset" — replaced with raster entries

Phase 0.4 created the architecture. Phase 0.4c makes that architecture real and honest
about what is a placeholder versus production-ready.

### What Was NOT Fixed (by design)

The placeholder SVG files are schematic diagrams, not photorealistic images.
**No visual realism was added in this phase.** The system is structurally ready
for real assets. Realism requires an external asset production step — see
`docs/ASSET_RENDERER_STRATEGY.md §3` for exact specifications.

### Implemented

- `types.ts` — `AssetViewKey` extended to 6 values; `PlateAnchor` gains `rotateDeg`, `skewXDeg`, `skewYDeg`, `side`; `AssetEntry.svg-prototype` deprecated
- `assetRegistry.tsx` — 6 raster entries (one per view), all pointing to SVG placeholder files; SVG prototype components removed from registry
- `plateAnchors.ts` — 6 independent anchors with `skewXDeg=±7°` for driver/passenger 3/4 views
- `DynamicPlateOverlay.tsx` — applies `rotate/skewX/skewY` SVG transform around plate centre
- `VehicleAssetLayer.tsx` — uses `config.detectorPlacement` directly as `AssetViewKey`; no skewX in depth transform
- `AssetRealisticRenderer.tsx` — gate arm: translate-at-pivot + `motion.g` rotate pattern (reliable cross-browser)
- `public/assets/vehicles/main-car/` — 6 schematic placeholder SVG files (front=blue, back=red; symmetric vs 3/4 trapezoid)
- `docs/VISUAL_QA.md` — NEW: honest per-placement visual QA table; gate evaluation; known issues; asset production checklist

### Files Changed

- `apps/web/src/components/simulation/renderers/asset-realistic/types.ts` — extended
- `apps/web/src/components/simulation/renderers/asset-realistic/assetRegistry.tsx` — rewritten
- `apps/web/src/components/simulation/renderers/asset-realistic/plateAnchors.ts` — rewritten
- `apps/web/src/components/simulation/renderers/asset-realistic/DynamicPlateOverlay.tsx` — add transform
- `apps/web/src/components/simulation/renderers/asset-realistic/VehicleAssetLayer.tsx` — use placement as view key
- `apps/web/src/components/simulation/renderers/asset-realistic/AssetRealisticRenderer.tsx` — gate arm fix
- `apps/web/public/assets/vehicles/main-car/*.svg` — 6 NEW placeholder files
- `docs/VISUAL_QA.md` — NEW
- `docs/PROGRESS.md` — this entry

### Decisions

- **`AssetViewKey = DetectorPlacement`**: The cleanest possible mapping — no translation layer, no resolveViewKey function needed. Pass the placement string directly as the registry key.
- **Remove `resolveViewKey`**: The function was a stopgap from when only 2 views existed. With 6 distinct view keys it is deleted entirely.
- **`skewX` removed from depth transform**: Angle is baked into each asset image. The 3° skew that existed before was too small to distinguish views and is now superseded by distinct images.
- **Placeholder SVGs not PNG**: SVG files served as static assets load correctly in `<image href="...">`. Switching to PNG requires only updating `src` in the registry.
- **Gate arm: translate-then-rotate**: Framer Motion's `transformOrigin` with absolute px values is ambiguous for SVG elements across browsers. The translate-to-pivot pattern eliminates all ambiguity.
- **`isPlaceholder: true` flag**: Acts as a TODO marker in the registry. Remove when real assets are installed.

### Manual Testing

1. Select **Asset Realistic** renderer
2. Cycle all 6 detector placements — confirm each shows a DIFFERENT image (trapezoid vs symmetric, blue vs red)
3. Test `ABCDEFGHIJ12` (12 chars) — confirm plate fits in all 6 views
4. Press **Start** in `auto_open` mode — gate arm must physically rotate up
5. Press **Start** in `wait_for_signal` mode — car stops, arm stays down, press **Open Gate**, arm lifts
6. Enable **Camera Mode** — plate area not obscured by overlays
7. `cd apps/web && npx tsc --noEmit` → no output (clean)

### Known Limitations

- All 6 assets are schematic placeholder SVGs — **not photorealistic** — realism score 2/10
- `vehicleColor` config does not affect asset appearance (placeholders are single colour)
- Plate `skewXDeg=±7°` values are calibrated against placeholders; re-calibrate when real assets arrive
- Contact shadow ellipse does not account for 3/4 view perspective

### Next Steps

**Phase 0.5 — Real Asset Production**
Produce or source photorealistic PNG/WebP renders for all 6 views (transparent background, 900×600 px, neutral body colour). Install, calibrate plate anchors, re-run VISUAL_QA.md checklist.

---

## Phase 0.4 — Asset-Based Renderer Strategy

**Date:** 2026-07-03

### Goal

Establish a clean architectural separation between the car body asset and the license plate overlay. The car body becomes a swappable visual asset (SVG prototype today, PNG/WebP when a 3D render pipeline exists). The plate is always a distinct `DynamicPlateOverlay` layer that renders via the safe `LicensePlate` SVG component — never baked into a static file.

Add the `'asset-realistic'` renderer to the visual style registry so it can be selected from the ControlPanel alongside the five Phase 0.3 renderers.

### Implemented

- `renderers/asset-realistic/types.ts` — `PlateAnchor`, `AssetViewKey`, `CarPalette`, `CAR_PALETTES` (6 colors), `AssetEntry` union (`svg-prototype` | `raster`)
- `renderers/asset-realistic/plateAnchors.ts` — `PLATE_ANCHORS` record (all 6 detector placements → percentage-based anchor); `anchorToLocalRect()` converter
- `renderers/asset-realistic/assetRegistry.tsx` — `AssetCarFront` and `AssetCarRear` detailed SVG prototypes (100×72 local space); `ASSET_REGISTRY`; `resolveViewKey()`
- `renderers/asset-realistic/DynamicPlateOverlay.tsx` — converts anchor to pixel rect; renders `LicensePlate` at that position
- `renderers/asset-realistic/VehicleAssetLayer.tsx` — applies perspective transform (translate + skewX + scale); dispatches to `svg-prototype` render or SVG `<image>` for raster; renders `DynamicPlateOverlay` as a separate layer above the car body
- `renderers/asset-realistic/AssetRealisticRenderer.tsx` — parking garage environment (concrete wall, dark asphalt, road edge lines, asphalt texture pattern, centre dashes); inline `AssetGate` (yellow/black arm, gunmetal post, bolt details, Framer Motion); uses `VehicleAssetLayer`; vignette
- `renderers/types.ts` — added `'asset-realistic'` to `VisualStyle` union and `VISUAL_STYLE_LABELS`
- `SimulationScene.tsx` — imported `AssetRealisticRenderer`; added to `RENDERERS` record
- `docs/ASSET_RENDERER_STRATEGY.md` — NEW: audit, alternatives, asset plan, plate overlay strategy, trade-offs, future production notes
- `docs/RENDERER_ARCHITECTURE.md` — NEW: full engine/renderer split, registry, SceneRendererProps contract, depth model table, animation notes, gradient ID namespacing, extension points

### Files Changed

- `apps/web/src/components/simulation/renderers/types.ts` — added `'asset-realistic'` style
- `apps/web/src/components/simulation/SimulationScene.tsx` — registered `AssetRealisticRenderer`
- `apps/web/src/components/simulation/renderers/asset-realistic/types.ts` — NEW
- `apps/web/src/components/simulation/renderers/asset-realistic/plateAnchors.ts` — NEW
- `apps/web/src/components/simulation/renderers/asset-realistic/assetRegistry.tsx` — NEW (`.tsx` required; contains JSX)
- `apps/web/src/components/simulation/renderers/asset-realistic/DynamicPlateOverlay.tsx` — NEW
- `apps/web/src/components/simulation/renderers/asset-realistic/VehicleAssetLayer.tsx` — NEW
- `apps/web/src/components/simulation/renderers/asset-realistic/AssetRealisticRenderer.tsx` — NEW
- `docs/ASSET_RENDERER_STRATEGY.md` — NEW
- `docs/RENDERER_ARCHITECTURE.md` — NEW

### Decisions

- **`assetRegistry` must be `.tsx`**: The file contains JSX returned from `AssetCarFront` / `AssetCarRear` helper functions. The TypeScript compiler rejects JSX syntax in `.ts` files regardless of `jsxImportSource` settings. Renamed at fix time.
- **No plate in car asset — enforced by architecture**: `AssetCarFront` and `AssetCarRear` deliberately omit any plate rectangle. The only plate render path is `DynamicPlateOverlay → LicensePlate`.
- **Percentage anchors over pixel constants**: `PLATE_ANCHORS` stores `xPct/yPct/wPct/hPct` rather than absolute pixels so the same values work for both the 100×72 SVG space and any future PNG asset at arbitrary resolution.
- **Inline `AssetGate` in `AssetRealisticRenderer`**: Kept inline to avoid premature extraction. The gate visual is tightly coupled to the parking garage aesthetic. A `GateAssetLayer` can be introduced later when a second environment that reuses this gate is needed.
- **`ControlPanel` selector is automatic**: The visual style buttons are generated by iterating `VISUAL_STYLE_LABELS` — adding `'asset-realistic'` there was sufficient; no ControlPanel changes needed.

### Manual Testing

1. `pnpm dev` in repo root, open `localhost:5173`
2. In the sidebar, find the Visual Style section and click **Asset Realistic**
3. Press **Start** — confirm vehicle approaches gate with parking garage background
4. Confirm the license plate is readable (white background, black text) and positioned at the lower-centre of the car
5. Change the plate text in the input field — confirm it updates without the car body flickering
6. Try all 6 detector placements — confirm skew angle changes for driver/passenger variants and plate remains visible
7. Test both `auto_open` and `wait_for_signal` gate modes
8. Toggle between all 6 visual styles — confirm no visual corruption or gradient ID conflicts
9. Check Debug overlay — confirm depth readout is consistent with vehicle position

### Known Limitations

- The SVG prototype car is stylised, not photorealistic. It is a placeholder until real render assets are produced.
- `AssetViewKey` currently only supports `'front'` and `'rear'`. True 3/4-angle assets would require extending this type.
- All six detector placements share the same `STANDARD_FRONT` or `STANDARD_REAR` plate anchor. If a future car asset has a different plate position for angled views, new anchor entries will be needed.
- The parking garage environment does not yet include ambient occlusion, realistic HDRI lighting, or contact shadows.

### Next Steps

- Produce or source a photorealistic PNG/WebP front and rear car asset and swap `ASSET_REGISTRY`
- Extend `AssetViewKey` to `'front' | 'rear' | 'front-driver' | 'front-passenger'` if angled raster assets are available
- Extract `AssetGate` to a standalone `GateAssetLayer` when a second renderer reuses it
- Consider adding a vehicle shadow that matches the garage floor material (contact shadow vs simple ellipse)

---

## Phase 0.3 — Visual Redesign Sprint

**Date:** 2025-07-03

### Goal

Introduce a pluggable renderer architecture that allows the simulation scene to switch between five distinct visual styles without touching the simulation engine, depth math, or plate rendering. No new simulation features — purely a visual and architectural upgrade.

### Implemented

- `renderers/types.ts` — `VisualStyle` union type, `VISUAL_STYLE_LABELS` record, `SceneRendererProps` interface
- `renderers/ClassicSvgRenderer.tsx` — original scene look; reuses `Road`, `Vehicle`, `Gate` as-is
- `renderers/RealisticRenderer.tsx` — parking garage aesthetic; concrete wall, asphalt floor, yellow edge lines; inline improved car and gate SVG
- `renderers/GateCameraRenderer.tsx` — CCTV security camera view; camera UI overlay (CAM-01, timestamp, REC pulse, viewfinder corners, resolution badge); plate scan box + corner brackets + READING label when `phase === 'at_gate'`
- `renderers/OverheadRenderer.tsx` — bird's eye top-down view; separate coordinate system; lane, gate arm, direction arrow
- `renderers/CinematicRenderer.tsx` — cinematic night scene; stars, city silhouette, amber horizon glow, headlight/taillight glow ellipses, wet road reflection, strong vignette
- `SimulationScene.tsx` — renderer selector via `RENDERERS` record; accepts `visualStyle?: VisualStyle` prop (default `'classic'`); shared overlays (FocusZone, Debug, status text) remain renderer-agnostic
- `ControlPanel.tsx` — "Visual Style" section added at top of scrollable area; list of styled buttons for each style; footer updated to `v0.3.0 — Visual Redesign Sprint`
- `App.tsx` — `visualStyle` state; passed to both `SimulationScene` instances and `ControlPanel`
- `docs/VISUAL_REDESIGN.md` — NEW: renderer architecture doc, per-renderer pros/cons, legibility ratings, recommendations table, contract spec

### Files Changed

- `apps/web/src/components/simulation/renderers/types.ts` — NEW
- `apps/web/src/components/simulation/renderers/ClassicSvgRenderer.tsx` — NEW
- `apps/web/src/components/simulation/renderers/RealisticRenderer.tsx` — NEW
- `apps/web/src/components/simulation/renderers/GateCameraRenderer.tsx` — NEW
- `apps/web/src/components/simulation/renderers/OverheadRenderer.tsx` — NEW
- `apps/web/src/components/simulation/renderers/CinematicRenderer.tsx` — NEW
- `apps/web/src/components/simulation/SimulationScene.tsx` — renderer selector, `visualStyle` prop added
- `apps/web/src/components/controls/ControlPanel.tsx` — Visual Style section, footer version bump
- `apps/web/src/App.tsx` — `visualStyle` state, props wired to both scene + panel
- `docs/VISUAL_REDESIGN.md` — NEW
- `docs/PROGRESS.md` — this entry

### Decisions

- `VisualStyle` type lives in `apps/web` (inside `renderers/types.ts`), not in `packages/shared` — it is a display-only concern; the shared package deals with simulation config, not rendering choices
- `LicensePlate.tsx` was never modified — plate rendering is considered a safety contract
- `Vehicle.tsx`, `Road.tsx`, `Gate.tsx` were never modified — ClassicSvgRenderer reuses them as-is; other renderers that needed different aesthetics implemented inline SVG
- `FocusZoneOverlay` and `DebugOverlay` remain in `SimulationScene`, not in individual renderers — they are renderer-agnostic and must always be on top regardless of visual style
- `GateCameraRenderer` uses `getPlateSceneRect` for the scan indicator — this is the same function used by calibration mode, ensuring the scan box matches the actual plate position
- SVG gradient `id` values are prefixed per renderer (`cSkyGrad`, `rWallGrad`, `gcWallGrad`, `cinSkyGrad`, etc.) to prevent `<defs>` ID collisions when switching styles
- `OverheadRenderer` uses a simplified linear Y-mapping rather than the perspective model — it is a debugging/demo view, not a camera simulation

### Manual Testing

1. Run `npm run dev` from the monorepo root (or `pnpm dev` inside `apps/web`)
2. In the sidebar, find the "Visual Style" section at the top
3. Click each style in sequence: Classic SVG → Realistic 2D → Gate Camera → Overhead 2.5D → Cinematic Night
4. Verify the scene changes for each style without errors
5. Start a simulation run (click Start) and verify the vehicle animates correctly in each style
6. Switch to `wait_for_signal` gate mode; start the simulation; when the vehicle stops at the gate, switch to `gate-camera` style and verify the green scan box appears around the plate
7. Open Gate while in `gate-camera` style; verify the scan box disappears after the vehicle passes
8. Switch to `overhead` style; verify the vehicle moves up/down the lane and the gate arm rotates
9. Toggle `incoming` vs `away` direction in `overhead` style; verify the direction arrow flips
10. Enter Fullscreen Scene (in sidebar); verify the selected visual style persists
11. Enter Camera Mode; verify the selected visual style persists and the camera UI overlay (if in `gate-camera`) is visible
12. Switch vehicle colors and verify color changes are visible in all perspective styles (overhead palette is separate)
13. Test all 6 detector placements; verify skew direction in perspective renderers

### Known Limitations

- **OverheadRenderer:** plate text is not rendered; a white indicator bar marks the plate position only
- **RealisticRenderer car body:** the inline car SVG diverges from `Vehicle.tsx`; if `Vehicle.tsx` is updated, `RealisticRenderer.tsx` must be manually updated to match
- **GateCameraRenderer timestamp:** the timestamp in the camera overlay is a static string (`2025-07-03  12:34:56`), not a live clock
- **CinematicRenderer dark vehicles:** black cars on the dark cinematic road have reduced contrast — no rim light or outline has been added yet
- **SVG gradient ID collisions:** if two scene instances were ever rendered simultaneously, gradient IDs would conflict; not a concern for the current single-scene layout
- **Overhead gate arm:** the gate arm in OverheadRenderer is a simplified horizontal bar; it does not share the detailed Gate.tsx component

### Next Steps

- Phase 0.4: Select a primary renderer for ongoing development (recommend `gate-camera`) and add plate queue / local plate list playback
- Add a live clock to the GateCameraRenderer timestamp display (optional)
- Add rim light or ambient outline to CinematicRenderer for dark vehicle colors
- Extract shared car body SVG shapes into a sub-module to keep RealisticRenderer in sync with Vehicle.tsx
- Consider adding a `style` field to `SimulationConfig` if the visual style should be part of a saved/loaded session

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

---

## Phase 1.0 — Renderer Cleanup (Asset Realistic only)

### Goal

Remove all legacy renderers and the Visual Style selector. Hardwire `AssetRealisticRenderer` as the sole renderer. Eliminate dead components.

### Implemented

- Deleted 5 legacy renderer files: `ClassicSvgRenderer`, `RealisticRenderer`, `GateCameraRenderer`, `OverheadRenderer`, `CinematicRenderer`
- Deleted `renderers/types.ts` (contained `VisualStyle` union and `VISUAL_STYLE_LABELS`)
- Created `renderers/asset-realistic/rendererProps.ts` — `SceneRendererProps` now lives here
- Updated `AssetRealisticRenderer.tsx` to import `SceneRendererProps` from local `rendererProps.ts`
- `SimulationScene.tsx` hardwires `AssetRealisticRenderer` directly (no registry, no `visualStyle` prop)
- `ControlPanel.tsx`: removed Visual Style section, removed `visualStyle`/`onVisualStyleChange` props
- `App.tsx`: removed `visualStyle` state, removed all `visualStyle` prop threading
- Deleted dead simulation components: `Gate.tsx`, `Vehicle.tsx`, `Road.tsx`, `FocusZoneOverlay.tsx`
- Deleted dead controls component: `FocusZoneControls.tsx`
- `LicensePlate.tsx` retained — still used by `DynamicPlateOverlay.tsx`

### Files Changed

- `apps/web/src/components/simulation/renderers/asset-realistic/rendererProps.ts` — created
- `apps/web/src/components/simulation/renderers/asset-realistic/AssetRealisticRenderer.tsx` — import path updated
- `apps/web/src/components/simulation/SimulationScene.tsx` — hardwired renderer, removed visualStyle prop
- `apps/web/src/components/controls/ControlPanel.tsx` — removed VisualStyle imports and Visual Style section
- `apps/web/src/App.tsx` — removed visualStyle state and prop threading
- `apps/web/src/components/simulation/renderers/types.ts` — deleted
- `apps/web/src/components/simulation/renderers/ClassicSvgRenderer.tsx` — deleted
- `apps/web/src/components/simulation/renderers/RealisticRenderer.tsx` — deleted
- `apps/web/src/components/simulation/renderers/GateCameraRenderer.tsx` — deleted
- `apps/web/src/components/simulation/renderers/OverheadRenderer.tsx` — deleted
- `apps/web/src/components/simulation/renderers/CinematicRenderer.tsx` — deleted
- `apps/web/src/components/simulation/Gate.tsx` — deleted (superseded by inline gate in AssetRealisticRenderer)
- `apps/web/src/components/simulation/Vehicle.tsx` — deleted (superseded by VehicleAssetLayer)
- `apps/web/src/components/simulation/Road.tsx` — deleted (superseded by AssetRealisticRenderer background)
- `apps/web/src/components/simulation/FocusZoneOverlay.tsx` — deleted (removed in Phase 0.9)
- `apps/web/src/components/controls/FocusZoneControls.tsx` — deleted (removed in Phase 0.9)

### Decisions

- `SceneRendererProps` moved from `renderers/types.ts` to `renderers/asset-realistic/rendererProps.ts` — co-located with the only renderer that uses it
- No renderer registry. `SimulationScene` imports `AssetRealisticRenderer` directly
- Visual Style UI section fully removed — single renderer, no user choice needed
- `Gate.tsx` retained through Phase 0.9 for reference but was already unused; deleted here

### Manual Testing

1. `pnpm dev` in `apps/web`
2. Confirm simulation scene renders in Asset Realistic style
3. Confirm Visual Style selector is gone from ControlPanel
4. Run an incoming simulation with auto_open gate — confirm full cycle works
5. Run with wait_for_signal — confirm Send Signal button works
6. Enter Camera Mode and Fullscreen — confirm clean output

### Known Limitations

- None. Single-renderer architecture is intentional.

### Next Steps

- Phase 0.3: Plate list queue

---

## Phase 1.1 — Direction ↔ Placement Constraint

### Goal

Enforce that `incoming` only uses front detector placements and `away` only uses rear placements. Add auto-remap when direction changes, UI filtering, and a renderer guardrail.

### Implemented

- Created `packages/shared/src/directionPlacement.ts`:
  - `PLACEMENTS_BY_DIRECTION` constant
  - `getPlacementsForDirection(direction)` — returns 3 valid placements
  - `isPlacementAllowedForDirection(direction, placement)` — boolean guard
  - `remapPlacementForDirection(current, nextDirection)` — symmetric remap (driver↔driver, etc.)
- Exported from `packages/shared/src/index.ts`
- `App.tsx`: `handleConfigChange` intercepts direction changes and auto-remaps placement when invalid
- `ControlPanel.tsx`: Detector Placement grid now calls `getPlacementsForDirection(config.direction)` — only 3 buttons shown, dynamically labeled
- `VehicleAssetLayer.tsx`: guardrail computes `safePlacement` before any rendering; used for `getViewAwareX`, asset lookup, and plate anchor lookup

### Files Changed

- `packages/shared/src/directionPlacement.ts` — created
- `packages/shared/src/index.ts` — added export
- `apps/web/src/App.tsx` — added `handleConfigChange` with remap logic
- `apps/web/src/components/controls/ControlPanel.tsx` — filtered placement grid
- `apps/web/src/components/simulation/renderers/asset-realistic/VehicleAssetLayer.tsx` — renderer guardrail

### Decisions

- Mapping utilities live in `packages/shared` so any future backend or test harness can import them
- `remapPlacementForDirection` preserves the lateral position (driver/center/passenger) and only flips face — the most intuitive behavior for the user
- The guardrail in `VehicleAssetLayer` is a silent remap, not a crash — the simulation remains functional even if stale config arrives

### Manual Testing

1. `pnpm dev`
2. With `incoming`: confirm only DRV FRONT / CTR FRONT / PSG FRONT are shown
3. With `away`: confirm only DRV BACK / CTR BACK / PSG BACK are shown
4. Select `incoming + driver_front`, switch to `away` → auto-remaps to `driver_back`
5. Switch back to `incoming` → auto-remaps to `driver_front`
6. Run full gate scenarios (hidden / open / auto_open / wait_for_signal) with both directions

### Known Limitations

- No type-level enforcement preventing cross-direction config via direct object construction — only runtime guards

### Next Steps

- Plate queue

---

## Phase 1.2 — Camera-Aware Vehicle Asset Integration

**Date:** 2026-07-05

### Goal

Replace the Phase 0.5/0.6 studio-level vehicle PNG assets with a new camera-aware LPR/ANPR asset pack rendered from a virtual camera at 2–3 m height with a downward tilt, matching a real parking access/exit camera perspective. Reset plate anchors to initial estimates for the new geometry. Enable the anchor debug overlay by default so calibration can begin immediately.

No new simulation features. No plate queue. No backend.

### Implemented

- `types.ts` — removed all "placeholder" references; updated file header and AssetViewKey JSDoc to describe camera-aware LPR/ANPR assets; updated `isPlaceholder` field JSDoc to mark it as deprecated/unused pending future cleanup; updated CalibrationNote in PlateAnchor to reference camera-aware images
- `assetRegistry.tsx` — updated header comment to describe camera-aware LPR/ANPR images (2–3 m height, downward tilt); added note that plate anchors require visual calibration against the new images; removed "Plate blank" section about old studio assets (new images also contain a blank plate area)
- `plateAnchors.ts` — completely rewritten with initial calibration estimates for camera-aware geometry; all six placements marked "INITIAL CALIBRATION — PENDING VISUAL VERIFICATION"; added calibration history (Phase 0.6 superseded), recalibration workflow, and readability rule
- `App.tsx` — `showAnchorOverlay` default changed from `false` to `true` for the Phase 1.2 calibration session; added comment explaining the default and when to revert
- `docs/CAMERA_VIEW_SPEC.md` — NEW: virtual camera description, per-view visual criteria, plate legibility requirements, anchor overlay usage guide, full step-by-step calibration workflow

### Files Changed

- `apps/web/src/components/simulation/renderers/asset-realistic/types.ts` — removed placeholder references, updated JSDoc for camera-aware assets, deprecated `isPlaceholder`
- `apps/web/src/components/simulation/renderers/asset-realistic/assetRegistry.tsx` — updated header for camera-aware asset pack
- `apps/web/src/components/simulation/renderers/asset-realistic/plateAnchors.ts` — reset anchor values to Phase 1.2 initial estimates, updated calibration history and workflow
- `apps/web/src/App.tsx` — `showAnchorOverlay` default set to `true`
- `docs/CAMERA_VIEW_SPEC.md` — NEW
- `docs/PROGRESS.md` — this entry
- `docs/ASSET_RENDERER_STRATEGY.md` — updated to reflect camera-aware assets

### Decisions

- **Anchor values are initial estimates, not verified**: The Phase 0.6 anchor values were calibrated against ground-level studio renders and are geometrically wrong for the new camera-aware images (different foreshortening, different plate position in frame). Rather than carry forward incorrect values, all anchors are reset to reasonable initial estimates based on the expected camera-aware geometry. Visual verification using the anchor debug overlay is required before these values are used in production.
- **`showAnchorOverlay` default-on for calibration session**: Enabling the overlay by default ensures anyone opening the app during Phase 1.2 immediately sees the calibration state. This is explicitly temporary — the comment in App.tsx directs the developer to revert it after verification.
- **`isPlaceholder` field retained for backwards compatibility**: The field is not used in any ASSET_REGISTRY entries. Removing it from the type definition now could break any external code that references it. It is deprecated in JSDoc and will be removed in a future cleanup.
- **No asset registry or motion path changes**: The ASSET_REGISTRY `src` paths and `naturalW/naturalH` values are already correct for the new assets. The `viewMotionPaths.ts` paths describe vehicle trajectory — they are asset-agnostic and were not changed.

### Manual Testing

1. `pnpm dev` in `apps/web`, open `http://localhost:5173`
2. Confirm the anchor overlay is visible by default (green dashed rect on vehicle)
3. Scroll to **Visual QA** in sidebar → click **Enter Visual QA Mode** — vehicle freezes at reading position
4. Select each of the 6 detector placements in turn:
   - Confirm a different camera-aware image is shown for each placement
   - Confirm the green anchor rect is visible on each image
5. For each placement, test plates `ABC123`, `ABCDEFGHIJ12`, `123456789012` — plate text should appear inside the anchor rect (exact alignment requires calibration)
6. Toggle the anchor overlay OFF in the Visual QA section — confirm clean image
7. Toggle anchor overlay back ON
8. Test direction Incoming → Away for center_back, driver_back, passenger_back
9. Enter **Camera Mode** — confirm anchor overlay is NOT visible (suppressed in camera mode)
10. Press Esc to exit camera mode
11. Run a full `auto_open` simulation: Start → car approaches → gate opens → car exits
12. Run a `wait_for_signal` simulation: Start → car stops → press Send Open Signal → gate opens
13. `pnpm -C apps/web exec tsc --noEmit` → no output (clean)

### Known Limitations

- **All 6 plate anchors are initial estimates.** They are NOT visually verified against the camera-aware images. The simulation will appear functional but plate overlay positions may not align with the plate blank areas in the new images. Visual calibration using the anchor debug overlay is required before relying on this for ANPR/LPR testing.
- `showAnchorOverlay` is `true` by default — this is intentional for Phase 1.2 but must be reverted to `false` after calibration is complete.
- `vehicleColor` config has no effect on the PNG assets — colour is baked into the image. Vehicle tinting is a future task.

### Next Steps

1. **Visual anchor calibration**: Open the app, use the anchor debug overlay, and adjust `xPct/yPct/wPct/hPct` in `plateAnchors.ts` for all 6 placements until the green rect covers the plate blank in each camera-aware image. Follow the workflow in `docs/CAMERA_VIEW_SPEC.md §7`.
2. After calibration: set `showAnchorOverlay` back to `false` in `App.tsx`, commit updated anchor values.
3. **Plate Queue**: local plate list playback
4. **Vehicle colour tinting**: CSS `filter: hue-rotate()` on the car `<image>` element

---

## Phase 1.4 — Diagonal Parking Scene Variants

**Date:** 2026-07-14

### Goal

Extend the scene variants architecture to cover all six `DetectorPlacement` values
with dedicated, realistic parking environments. Replace the `GenericScene` fallback
used for driver/passenger placements with four new diagonal-POV scenes.

### Implemented

- **`DriverFrontScene`** — parking entry (incoming), camera on driver/left side:
  - Asymmetric ceiling: near-left at x=60 (camera flush with left wall), near-right at x=660
  - Left wall: thin near wedge; right wall: full dominant panel
  - Tube lights swept LEFT toward camera
  - Near-camera structural column on left edge (x=0–16)
  - Floor light pools offset left (cx≈320–330)
  - Green entry arrow at road center, stop line at `GATE_T`
  - Cool grey palette (#0f1115 → #181c21) matching CenterFrontScene

- **`PassengerFrontScene`** — parking entry (incoming), camera on passenger/right side:
  - Mirror of DriverFrontScene
  - Near-right ceiling at x=740, near-left at x=140
  - Right wall: thin wedge; left wall: full panel
  - Tube lights swept RIGHT; structural column on right edge
  - Floor light pools offset right (cx≈470–490)

- **`DriverBackScene`** — parking exit (away), camera on driver/left side:
  - Same geometry as DriverFrontScene
  - Warm sodium-vapor palette (#13110c → #1e1a13) matching CenterBackScene
  - Outdoor daylight glow at horizon (`dbExitGlow`, slightly right-offset)
  - Amber exit arrow, stop line at `GATE_T_BACK`

- **`PassengerBackScene`** — parking exit (away), camera on passenger/right side:
  - Mirror of DriverBackScene
  - Same warm palette
  - Outdoor daylight glow (`pbExitGlow`, slightly left-offset)

- **`sceneVariants.ts`** — simplified to a direct 1-to-1 cast:
  - `SceneVariantKey` now includes all 6 placements
  - `getSceneVariant()` returns the placement directly (no more 'generic' fallback)

- **`AssetRealisticRenderer.tsx`** — imports and renders all 6 scene components;
  removed `GenericScene` import (no longer used)

### Files Changed

- `apps/web/src/components/simulation/renderers/asset-realistic/scenes/DriverFrontScene.tsx` — NEW
- `apps/web/src/components/simulation/renderers/asset-realistic/scenes/PassengerFrontScene.tsx` — NEW
- `apps/web/src/components/simulation/renderers/asset-realistic/scenes/DriverBackScene.tsx` — NEW
- `apps/web/src/components/simulation/renderers/asset-realistic/scenes/PassengerBackScene.tsx` — NEW
- `apps/web/src/components/simulation/renderers/asset-realistic/sceneVariants.ts` — extended to 6-key 1-to-1 mapping
- `apps/web/src/components/simulation/renderers/asset-realistic/AssetRealisticRenderer.tsx` — imports 4 new scenes, renders all 6
- `docs/SCENE_VARIANTS.md` — fully updated (v2.0): all 6 scenes, geometry derivation, gate integration notes
- `docs/PROGRESS.md` — this entry

### Decisions

- **Asymmetric near-ceiling edge, not VP shift**: The road VP (400) is preserved so the
  vehicle depth model (depth.ts) remains unchanged. The diagonal effect comes from
  pulling only the ceiling near-edge to one side (CL_NEAR_X=60 for driver scenes,
  CR_NEAR_X=740 for passenger scenes). This avoids breaking vehicle alignment.
- **Road far edges stay consistent**: At the horizon (y=145) both road and ceiling
  align at RL_FAR=390 / RR_FAR=410, preventing a visible seam between road and ceiling.
- **Tube light sweep**: Tube near-ends are shifted toward the camera side (left for
  driver, right for passenger) to reinforce the diagonal perspective without requiring
  a full 3D recomputation.
- **Near-camera column element**: A 16px structural pillar strip on the camera-side
  edge adds depth realism — the camera is mounted near a column in a real garage.
- **Gate remains scene-independent**: `AssetGate` uses `roadRight(gateT)` which is the
  same for all scenes. No per-scene gate offset is needed.
- **`GenericScene` retained but unused**: Not deleted in case it is needed for reference
  or edge cases. Safe to delete once all diagonal scenes are visually verified.

### Manual Testing

1. `pnpm dev` in `apps/web`, open `http://localhost:5173`
2. Set direction: **incoming**, placement: **driver_front**
   - Confirm: asymmetric garage interior — left wall narrow (thin wedge), right wall dominant
   - Tube lights pull toward left side near the camera
   - Left-edge column detail visible
3. Set placement: **passenger_front**
   - Confirm: mirror — right wall narrow, left wall dominant, tube lights pull right
4. Set direction: **away**, placement: **driver_back**
   - Confirm: warm amber ceiling, thin left wall, outdoor glow at horizon
5. Set placement: **passenger_back**
   - Confirm: mirror of driver_back, right wall narrow
6. Run full simulations for each diagonal placement:
   - `incoming + driver_front`: Start → car approaches from diagonal → gate opens → exits
   - `incoming + passenger_front`: same from opposite side
   - `away + driver_back`: Start → car enters from bottom → moves to gate → exits
   - `away + passenger_back`: same
7. Test gate modes for each diagonal:
   - `gate: hidden` — no gate visible, car passes freely
   - `gate: open (initially open)` — arm already at 84°, car passes
   - `gate: auto_open + closed` — arm lowers, car stops, arm raises, car exits
   - `gate: wait_for_signal + closed` — car stops, press "Send Open Signal", arm raises
8. Test plates: `ABC123` (short) and `ABCDEFGHIJ12` (12-char max)
9. Enter **Camera Mode** for each diagonal placement — confirm clean scene, no overlays
10. Enter **Fullscreen Scene** — simulation fills viewport correctly
11. Toggle **Motion Path Overlay** — path visible and makes sense for lateral sweep
12. `pnpm build` → must pass with 0 errors

### Known Limitations

- **Diagonal scenes do not shift the road VP**: The road polygon and vehicle depth
  model use VP_X=400 (center). A physically correct two-point perspective road for
  diagonal views would require a separate depth model — not implemented. The visual
  result is a plausible diagonal garage feel but not geometrically exact.
- **Gate post is always on roadRight**: For driver-side diagonal views, a real-world
  camera would see the gate post on the left side. The current system always places
  the gate on roadRight for consistency. This is acceptable for LPR camera testing
  but not a fully accurate simulation of gate placement.
- **Plate anchors pending calibration**: Diagonal plate anchors were set in Phase 1.2
  and have not been re-verified against the camera-aware assets in the context of the
  new scenes. Calibration pass still needed.

### Next Steps

1. **Visual verification pass**: Use the anchor overlay to verify plate position in
   all 6 diagonal placements. Adjust `plateAnchors.ts` as needed.
2. **Gate side selection**: Consider adding a `gateOnLeft` option in `SceneRendererProps`
   so driver-side cameras can show the gate on the correct side.
3. **Plate Queue**: Once visual QA is done, proceed to local plate list playback.

---

## Recommended Next Prompts

### Phase 0.3 — Plate List Playback
> "Implement a plate queue. Add a textarea in the sidebar where the user pastes plates (one per line). A 'Run Queue' button launches vehicles sequentially: each vehicle runs, pauses at gate (or passes), then disappears. Show progress (2/12). Allow pause, skip, and configurable gap between vehicles."

### Phase 0.4 — WebSocket + Remote Control
> "Add a Fastify backend in apps/api. Implement a WebSocket server accepting: push_plate(plate), open_gate, close_gate, start, stop, reset. Frontend connects on startup and shows connection status."

### Phase 0.5 — Docker
> "Add Dockerfile for apps/web (nginx). Add docker-compose.yml with web + api services."

---

## Phase 1.5 — Per-Scene Configuration Architecture

**Date:** 2026-07-14

### Goal

Centralise all per-scene behaviour (vehicle X path, gate position, gate angles) into
dedicated config files — one per `DetectorPlacement`. Gives `driver_front` a genuinely
diagonal vehicle path aligned to its shifted-VP road geometry, and decouples gate
positioning from the global depth model.

### Implemented

- **`scene-configs/types.ts`** — `SceneVehicleMotionConfig`, `SceneGateConfig`, `SceneRenderConfig`
- **6 per-scene config files** — one per placement; each owns xFar/xNear, gate.t, explicitPostRightX, arm angles
- **`scene-configs/getSceneConfig.ts`** — single resolver: `getSceneConfig(placement) → SceneRenderConfig`
- **`viewMotionPaths.ts`** — `VIEW_MOTION_PATHS` rebuilt from scene configs; `getViewAwareX` unchanged API
- **`SimulationScene.tsx`** — `activeGateT` now from `sceneConfig.gate.t` (removed direction check)
- **`AssetRealisticRenderer.tsx`** — `AssetGate` receives `gateConfig: SceneGateConfig`; uses `explicitPostRightX ?? roadRight` for post position and per-config arm angles
- **`driver_front` diagonal path** — xFar=785, xNear=382 (road center at DriverFrontScene's shifted VP); vehicle now sweeps diagonally upper-right → lower-left as it approaches

### Files Changed

- `apps/web/src/components/simulation/renderers/asset-realistic/scene-configs/types.ts` — created
- `apps/web/src/components/simulation/renderers/asset-realistic/scene-configs/getSceneConfig.ts` — created
- `apps/web/src/components/simulation/renderers/asset-realistic/scene-configs/centerFront.config.ts` — created
- `apps/web/src/components/simulation/renderers/asset-realistic/scene-configs/centerBack.config.ts` — created
- `apps/web/src/components/simulation/renderers/asset-realistic/scene-configs/driverFront.config.ts` — created
- `apps/web/src/components/simulation/renderers/asset-realistic/scene-configs/passengerFront.config.ts` — created
- `apps/web/src/components/simulation/renderers/asset-realistic/scene-configs/driverBack.config.ts` — created
- `apps/web/src/components/simulation/renderers/asset-realistic/scene-configs/passengerBack.config.ts` — created
- `apps/web/src/components/simulation/renderers/asset-realistic/viewMotionPaths.ts` — VIEW_MOTION_PATHS from scene configs
- `apps/web/src/components/simulation/SimulationScene.tsx` — activeGateT from scene config
- `apps/web/src/components/simulation/renderers/asset-realistic/AssetRealisticRenderer.tsx` — gate config threading
- `docs/SCENE_CONFIG_ARCHITECTURE.md` — created

### Decisions

- `getSceneConfig()` is called at render time (not memoised) — it returns a static object reference from the map; no allocation cost.
- `VehicleAssetLayer` unchanged — `getViewAwareX(t, placement)` API is identical; the implementation now reads from scene configs internally.
- `rendererProps.ts` unchanged — gate config flows from `AssetRealisticRenderer` internally, not from `SimulationScene`.
- `sceneParams.ts` lateral values retained — referenced by 5 of 6 configs; `driver_front` overrides with road-derived values.

### Manual Testing

1. Select `driver_front` + incoming → verify vehicle sweeps from upper-right at far to lower-left near camera.
2. Verify gate arm aligns with stop line in `driver_front` scene (post should be ~x=659 at t=0.99).
3. Switch to `center_front` and `center_back` → verify no regression in path or gate position.
4. Select each of the 6 placements and confirm simulation runs without crash.
5. Open motion path debug overlay → verify path curve matches the diagonal for `driver_front`.

### Known Limitations

- `getCarScale()` still uses global readingT/gateT constants. No impact since all scenes share the same values.
- `armDirection: 'right'` typed but not implemented; all configs use `'left'`.

### Next Steps

- Visual QA pass for `driver_front` diagonal: verify car size at gate, plate readability, gate arm overlap.
- Consider updating `getCarScale` to read from scene config when per-scene phase timing is needed.
- Plate List Playback (Phase 0.3).

---

## Phase 0.4 — Local Plate Queue

**Date:** 2026-08-05

### Goal

Add a local Plate Queue: paste many plates, validate them, and play them back
sequentially through the existing single-vehicle simulator — no backend, no
remote mode, no scheduler, no persistence beyond the current page session.

### Implemented

- `parsePlateQueueInput` — splits pasted text on comma/space/tab/newline,
  reuses `validatePlate`, reports valid/invalid/total counts.
- `usePlateQueue` — orchestration hook that drives the existing
  `useSimulation` instance externally (sets `config.plate`, calls
  `start()`/`reset()`, watches `state.phase`). No changes were needed inside
  `useSimulation` itself.
- `PlateQueuePanel` — collapsible "Plate Queue" section in `ControlPanel`:
  paste input with live valid/invalid counts, queue settings
  (gap/mode/loop), playback controls, and a scrollable status-badged item
  list.
- `run_all` and `manual_next` playback modes, `loop`, pause/resume (queue-level),
  skip current, stop, clear, reset status.
- Manual single-plate controls (Plate field, Start/Stop/Reset) are disabled
  and labeled "Controlled by Plate Queue" while the queue is actively driving
  playback, to avoid desyncing queue state from the simulator.

### Files Changed

- `packages/shared/src/types/queue.ts` — created: queue/item status and config types
- `packages/shared/src/index.ts` — export the new queue types
- `apps/web/src/features/queue/plateQueueParser.ts` — created
- `apps/web/src/features/queue/usePlateQueue.ts` — created
- `apps/web/src/components/controls/PlateQueuePanel.tsx` — created
- `apps/web/src/components/controls/ControlPanel.tsx` — new Plate Queue section, manual playback guarded while queue is active
- `apps/web/src/components/controls/PlateInput.tsx` — added `disabled` prop, mirrors externally-driven value
- `apps/web/src/App.tsx` — instantiate `usePlateQueue`, pass down to `ControlPanel`
- `docs/QUEUE_SPEC.md` — created
- `docs/SIMULATION_SPEC.md` — note on queue orchestration
- `docs/GATE_BEHAVIOR.md` — queue/gate interaction matrix

### Decisions

- No changes to `useSimulation`: it never reads `config.plate`, so the queue
  can swap the plate and call `start()`/`reset()` safely — this kept the
  well-tested state machine untouched.
- Space is treated as a token separator (per spec), so `"ABC 123"` typed on
  one line parses as two valid plates, not one invalid one — documented in
  `QUEUE_SPEC.md`.
- Pause is queue-level only (blocks advancing to the next vehicle); it does
  not pause a vehicle mid-animation, since the simulator has no pause
  primitive. Documented as a known limitation rather than modifying the rAF
  loop in this phase.
- Duplicates are allowed in a queue by design.

### Manual Testing

- Paste `ABC123`, `XYZ999`, `TEST01` (newline-separated) → Apply Queue → Run Queue → all three play in sequence.
- Paste 12-char plates `ABCDEFGHIJ12` and `123456789012` → both validate and run.
- Paste `ABC-123`, `ABCDEFGHIJKLM`, `<script>` → all reported invalid with reasons, not added to the queue.
- Gate `hidden` → vehicles pass straight through, queue auto-advances.
- Gate visible + initially open → same, no stop.
- Gate closed + `auto_open` → vehicle stops, arm opens automatically, queue advances.
- Gate closed + `wait_for_signal` → vehicle stops, queue shows `waiting_for_signal`, Send Open Signal resumes it, queue advances.
- Pause mid-queue → next vehicle does not start; Resume continues.
- Skip Current → current item marked skipped, next item starts.
- Stop Queue → current vehicle cancelled, queue status `stopped`, item statuses preserved.
- `manual_next` mode → Next Vehicle required between runs.
- `loop` on → queue restarts from item 1 after the last item completes.
- Confirmed unaffected: single-plate manual run, all 6 placements, incoming/away, Camera Mode, Fullscreen Scene.

### Known Limitations

- Pause cannot interrupt a vehicle already mid-animation (queue-level pause only).
- `failed` item status has no automatic trigger yet (no failure path exists locally).
- Queue is in-memory only — no persistence across page reloads.
- Max 500 plates per queue.

### Next Steps

- Visual QA pass for `driver_front` diagonal (carried over from Phase 1.5).
- Consider a lightweight pause primitive in `useSimulation` if mid-run pausing becomes a real requirement.
- Backend-backed plate lists / remote queue control (future phase, not yet in scope).

---

## Phase 0.5 — Simulation Pause Primitive

**Date:** 2026-08-05

### Goal

Close the known limitation from Phase 0.4: `Pause Queue` only blocked the
queue from advancing to the next vehicle, but a vehicle already mid-animation,
mid-gate-timer, or mid-gap-wait kept going. This phase adds a real
`pause()`/`resume()` primitive to `useSimulation` that freezes motion, gate
timers, and visual state exactly where they were, and wires the Plate Queue
to use it.

### Implemented

- `SimulationState.isPaused: boolean` — orthogonal to `phase` (Option B from
  the spec); no new phase, no existing phase-based conditional needed
  changes.
- `simulation.pause()` / `simulation.resume()` — idempotent; freeze/resume
  the rAF loop (during `running`) or the active gate timer (during
  `stopped_at_gate` / `gate_opening`) with exact remaining time preserved.
- New shared utility `createPausableTimers()` (`apps/web/src/utils/pausableTimers.ts`)
  — an id-keyed timer manager with `pauseAll()`/`resumeAll()` that records
  and restores exact remaining time. Used by both `useSimulation` (gate
  timers) and `usePlateQueue` (inter-vehicle gap timer) — no duplicated
  pause-with-remaining-time logic.
- `usePlateQueue`'s `pauseQueue()`/`resumeQueue()` rewritten to call
  `simulation.pause()`/`resume()` in addition to freezing/resuming the gap
  timer. This let us delete the old `pendingAdvanceRef` hack entirely — the
  gap timer resuming itself fires `advance()` when its remaining time
  elapses, so there's no separate "replay the advance" bookkeeping.
- `skipCurrent()` now works from `paused` too (explicit override — always
  resumes+advances afterward).
- `openGate()` no-ops while paused (defense in depth); "Send Open Signal" is
  `disabled` in the UI while paused, with a short explanatory note.
- Manual single-plate controls gained an optional Pause/Resume button
  (only shown when the queue isn't controlling playback).
- `PlateQueuePanel` copy updated ("Pause Vehicle"/"Resume Vehicle" + a
  caption) to make clear pause now freezes the current vehicle, not just
  queue advancement.

### Files Changed

- `apps/web/src/utils/pausableTimers.ts` — created
- `apps/web/src/hooks/useSimulation.ts` — `isPaused`, `pause()`, `resume()`, migrated gate timers to the new utility, `openGate()` guard
- `apps/web/src/features/queue/usePlateQueue.ts` — migrated gap timer to the new utility, rewired `pauseQueue`/`resumeQueue`, removed `pendingAdvanceRef`, `skipCurrent` allows `paused`
- `apps/web/src/components/controls/ControlPanel.tsx` — disable Send Open Signal while paused, manual Pause/Resume button, `canSkip` fix (see below)
- `apps/web/src/components/controls/PlateQueuePanel.tsx` — copy tweak, `canSkip` now includes `paused`
- `docs/SIMULATION_STATE_MACHINE.md` — created
- `docs/QUEUE_SPEC.md`, `docs/SIMULATION_SPEC.md`, `docs/GATE_BEHAVIOR.md` — updated

### Decisions

- `isPaused` overlay (not a new `phase`) — avoids touching every existing
  phase-based conditional across `useSimulation`, `ControlPanel`, and
  `usePlateQueue`.
- Shared `pausableTimers` utility instead of duplicating remaining-time
  bookkeeping in both hooks.
- Skip Current is an explicit override of pause — it always leaves the
  queue `running` afterward, even if it was paused. Simplest, least
  surprising behavior; documented in `QUEUE_SPEC.md`.
- Send Open Signal is disabled (not queued) while paused — avoids a signal
  firing unexpectedly the instant the user resumes.
- `resetQueue()` intentionally does not touch a live paused vehicle — Reset
  Status is scoped to item statuses only, matching Phase 0.4's behavior.

### Manual Testing

Verified via a headless-Chromium Playwright driver (no project run-skill
exists yet) against the dev server, with pixel/position and DOM-state
assertions, not just visual inspection:

- Isolated manual pause: `t` was byte-identical before pause and 1500ms
  into the pause, then advanced correctly after resume — confirms exact
  freeze with no drift and no jump on resume.
- Gate dwell (`stopped_at_gate`, `auto_open`): paused 600ms into the 2000ms
  dwell, held 2500ms (past the original full window) — arm stayed `CLOSED`
  the entire time; resumed and the arm opened using only the ~1.4s that
  remained, not a fresh 2000ms.
- Queue-driven pause of a vehicle near completion (t=0.966) — held through
  where it would have finished, resumed, vehicle completed normally, queue
  correctly transitioned into the gap-wait with the next item still
  `pending`.
- `wait_for_signal` + pause: Send Open Signal correctly became disabled;
  resuming re-enabled it.
- Skip Current while paused: correctly skips the current item and leaves
  the queue running on the next one (found and fixed a bug here — see
  below).
- Stop Queue while paused, then Reset Status: simulation returns to `idle`,
  manual controls re-enable, all item statuses reset to `pending`, no
  orphaned/stuck state.
- Zero console errors across every run.

### Bugs Found and Fixed During QA

- `PlateQueuePanel`'s `canSkip` was not updated when `paused` was added to
  the hook's `SKIPPABLE_STATUSES` — the "Skip Current" button stayed
  disabled while paused even though the hook itself supported it. Fixed by
  adding `isPaused` to `canSkip`.

### Known Limitations

- The gate arm's visual rise is a fixed-duration CSS transition (0.85s),
  not frame-driven — pausing freezes the *logical* timer that gates when
  the vehicle resumes, but doesn't guarantee the CSS transition itself
  freezes mid-frame. Not observed to cause a visible issue in QA (the
  window is short), but noted as a simplification in
  `docs/SIMULATION_STATE_MACHINE.md`.
- `resetQueue()` does not cancel a paused vehicle by design (see Decisions).
- `failed` queue-item status still has no automatic trigger (carried over
  from Phase 0.4 — no failure path exists locally).

### Next Steps

- Plate Lists persistence (explicitly deferred — not started this phase).
- Consider whether the gate-arm CSS transition should become frame-driven
  if pixel-perfect pause fidelity during `gate_opening` ever becomes a
  hard requirement (currently out of scope).

---

## Phase 0.6 — Persistent Plate Lists and Vehicle Color Variants

**Date:** 2026-08-05

### Goal

Add two local/browser-only capabilities: persistent, named plate lists
(create/edit/duplicate/delete/run/import/export) and vehicle color variants
(blue/red/gray, asset-backed with a documented fallback). No backend,
remote mode, scheduler, or new render scenes.

### Implemented

- **Vehicle color variants**: `VehicleColor` narrowed to `'blue' | 'red' | 'gray'`.
  Asset registry restructured to `Record<VehicleColor, Partial<Record<AssetViewKey, AssetEntry>>>`
  with a `getVehicleAsset({color, placement})` resolver that falls back to
  the blue asset when a color has no asset yet (`red`/`gray` today) —
  verified visually in QA (both render the identical blue PNG `href`).
  Existing PNGs moved to `main-car/blue/`. Dead `CarPalette`/`CAR_PALETTES`
  SVG-tint code removed (unused, would've needed pruning anyway).
- **Persistent plate lists**: `PlateList` type (name, description, plates,
  `simulationDefaults` — direction/placement/vehicleColor/gateConfig/queueConfig
  — timestamps, version) stored in `localStorage` via a plain-function
  storage service, with a `usePlateLists` hook (mirrors `usePlateQueue`'s own
  dependency-injection pattern) providing CRUD + playback + import/export.
- **Plate list playback**: "Run List" applies a list's defaults and starts
  the queue; "Load Into Queue" applies defaults without starting. Required a
  genuine correctness fix (not just a convenience method) — see Decisions.
- **Import/export**: versioned JSON envelopes (`schemaVersion: 1`), single
  or collection, downloaded via `Blob`+`<a download>` and imported via
  `FileReader`. Per-list validation against shared enum arrays; imports
  always get a fresh local id/timestamps (name preserved) to avoid ever
  colliding with a local list.
- **UI reorg**: "Gate" and "Vehicle Color + Speed" wrapped in
  `CollapsibleSection`s (`defaultOpen`, so first-load appearance is
  unchanged) to keep the now-larger panel scannable; new "Plate Lists"
  collapsible section added after "Plate Queue".

### Files Changed

- `packages/shared/src/types/simulation.ts` — narrowed `VehicleColor`, added `GateConfig`, `VEHICLE_COLORS`/`GATE_MODES`/`GATE_INITIAL_STATES`/`DIRECTIONS`
- `packages/shared/src/types/plateList.ts` — created
- `packages/shared/src/types/queue.ts` — added `PLATE_QUEUE_MODES`
- `packages/shared/src/directionPlacement.ts` — added `DETECTOR_PLACEMENTS`
- `packages/shared/src/index.ts` — new exports
- `apps/web/src/components/simulation/renderers/asset-realistic/assetRegistry.tsx` — color-keyed registry + `getVehicleAsset`
- `apps/web/src/components/simulation/renderers/asset-realistic/VehicleAssetLayer.tsx` — uses resolver
- `apps/web/src/components/simulation/renderers/asset-realistic/types.ts` — removed dead `CarPalette`/svg-prototype code
- `apps/web/public/assets/vehicles/main-car/blue/*.png` — moved (git mv) from the old flat layout
- `apps/web/src/features/lists/plateListStorage.ts` — created
- `apps/web/src/features/lists/usePlateLists.ts` — created
- `apps/web/src/components/controls/PlateListsPanel.tsx` — created
- `apps/web/src/features/queue/usePlateQueue.ts` — added `loadAndRunQueue`, `startItemAt` override param
- `apps/web/src/components/controls/ControlPanel.tsx` — narrowed `COLOR_MAP`, `Plate Lists` section, Gate/Visual Settings collapsibles
- `apps/web/src/App.tsx` — instantiate `usePlateLists`

### Decisions

- **The sequencing fix was the crux of this phase.** Applying a saved list
  changes `direction`/`detectorPlacement`/`gateMode`/`vehicleColor` — fields
  `useSimulation` reads via its own `configRef`, current only as of the
  *next* render. `onConfigChange()` + start-the-queue in the same tick would
  start against stale settings. Fixed with two pieces: `loadAndRunQueue` in
  `usePlateQueue` (starts using a freshly-computed items array, not the
  stale `itemsRef`) and a `useEffect` keyed on `config` in `usePlateLists`
  that defers the actual queue call until the real re-render happens. Both
  pieces were designed during planning, before writing code — this avoided
  a silent "Run List does nothing" bug entirely rather than debugging it
  after the fact.
- Fallback to blue (not "reject unselectable colors") for missing
  red/gray assets — documented in `docs/VEHICLE_COLOR_VARIANTS.md`,
  never breaks the app, an explicit note appears in the UI.
- Dead `CarPalette`/`svg-prototype` code deleted rather than pruned to fit
  the narrowed `VehicleColor` — confirmed zero other references first.
- Import always mints a new local id (keeps `name`) rather than trusting a
  foreign `id` — avoids ever silently overwriting an unrelated local list.
- `Reset Status`/manual controls behavior around plate lists mirrors the
  Plate Queue's own existing pause/skip/stop semantics exactly — a
  list-driven run is indistinguishable from a manually-loaded queue once
  it's running.

### Manual Testing (18/18 scenarios, via headless-Chromium Playwright driver with DOM/attribute assertions)

1. Create list with 3 valid plates — ✅ saved and listed.
2. Create list with invalid plates — ✅ live preview showed `total 4 · valid 1 · invalid 3`; only the valid plate was kept.
3. Edit list — ✅ name change persisted.
4. Duplicate list — ✅ `Copy of ...` created.
5. Delete list — ✅ confirmed via `window.confirm`, removed.
6. Export one list — ✅ correct `plate_runner_plate_list` envelope, `schemaVersion: 1`.
7. Export all lists — ✅ correct `plate_runner_plate_list_collection` envelope with all lists.
8. Import one list — ✅ appeared under its (possibly renamed) name.
9. Import a collection — ✅ `Imported 1 list(s).` summary shown, list added.
10. Import invalid JSON — ✅ `Imported 0 list(s).` + inline "Invalid JSON" error, app didn't crash.
11. Run list with blue — ✅ vehicle `<image href>` = `/assets/vehicles/main-car/blue/center_front.png`.
12. Run list with red — ✅ same href (fallback confirmed).
13. Run list with gray — ✅ same href (fallback confirmed); reached `waiting_for_signal` correctly for a `wait_for_signal` list.
14. Fallback verified — ✅ (folded into 12/13 — identical asset path for red/gray vs blue).
15. Queue pause/resume from a list — ✅ `t` frozen exactly, Send Open Signal correctly disabled while paused, resumed cleanly.
16. `wait_for_signal` from a list — ✅ signal sent, queue advanced to the second item, which reached `waiting_for_signal` again on its own.
17. Persistence across reload — ✅ list still present after a hard page reload.
18. Camera Mode shows no UI — ✅ neither "Simulation Controls" nor "Plate Lists" render in Camera Mode.

Regression spot-check (existing features): single-plate manual run, manual
pause/resume (`t` frozen exactly across an 800ms hold), and gate `hidden`
mode (no arm rendered) all still work. Zero console errors across every QA
script run this phase.

### Known Limitations

- `red`/`gray` render identically to `blue` until real assets are added
  (by design this phase — see `docs/VEHICLE_COLOR_VARIANTS.md`).
- Plate anchors are shared across colors; a future color with different
  image geometry will need color-aware anchors (documented, not implemented).
- No cross-device sync — plate lists are per-browser `localStorage` only;
  portability is only via manual JSON export/import.
- `schemaVersion` has no real migration path yet — any version other than 1
  is rejected outright.
- List `version` field is currently unused beyond being present (starts at
  1) — reserved for a future list-shape migration, separate from the JSON
  envelope's `schemaVersion`.

### Next Steps

- Consider adding real red/gray vehicle asset renders when available (pure
  asset-drop, per the documented extension path — no code changes needed
  beyond populating the registry).
- Backend/remote/API phases remain explicitly out of scope until requested.

---

## Phase 0.7 — Local Scheduler and Execution History

**Date:** 2026-08-05

### Goal

Add a local scheduler that runs saved Plate Lists automatically (once/interval/daily) and a local execution history log for every run (manual or scheduled). Fourth feature module on the established hook+storage+panel pattern.

### Implemented

- **Scheduler types** (`ScheduledPlateListRun`) and **execution history types** (`ScheduledExecutionRecord`) in `packages/shared`, plus validation-support constants/arrays.
- **`schedulerStorage.ts`** and **`executionHistoryStorage.ts`** — `localStorage`-backed services mirroring `plateListStorage.ts`'s never-throws-on-corruption pattern exactly. History is capped at 500 records (oldest trimmed on write).
- **`schedulerLogic.ts`** — pure, framework-free helpers: `computeNextRunAt` (mode-specific next-fire computation), `isWithinRunWindow`/`nextRunAtForWindow`, `shufflePlates` (Fisher–Yates, never mutates input), `summarizeGateConfig`.
- **`useExecutionHistory`** — tracks the currently-active run by watching `plateQueue.queueStatus`, finalizing the record (with per-status plate counts read from `plateQueue.items`) the moment it reaches `completed`/`stopped`. Also the public display API (`records`, `clearHistory`, `exportHistoryToJSON`).
- **`usePlateLists` extension** — factored `runList`'s body into a shared `executeList` helper that also starts an execution record; added `runListForSchedule` for the scheduler to call with a pre-ordered (possibly shuffled) plate array.
- **`useLocalScheduler`** — a 1s tick loop that fires due, enabled schedules: skips silently if the referenced list is missing, logs a `skipped`/`queue_busy` record (throttled to at most one per interval, not per tick) if the queue is already active, respects an optional run window for `repeat_interval`, and otherwise fires via `runListForSchedule` and updates `runCount`/`lastRunAt`/`nextRunAt` (auto-disabling on `once_at_time` completion or `maxRuns`).
- **`SchedulerPanel`** and **`ExecutionHistoryPanel`** UI — new collapsible sections in `ControlPanel`, following the exact `PlateListsPanel` local-primitives pattern.

### Files Changed

- `packages/shared/src/types/scheduler.ts`, `packages/shared/src/types/executionHistory.ts` — created
- `packages/shared/src/index.ts` — new exports
- `apps/web/src/features/scheduler/schedulerStorage.ts`, `schedulerLogic.ts`, `useLocalScheduler.ts` — created
- `apps/web/src/features/history/executionHistoryStorage.ts`, `useExecutionHistory.ts` — created
- `apps/web/src/features/lists/usePlateLists.ts` — `executeList`/`runListForSchedule`, `executionHistory` dependency
- `apps/web/src/components/controls/SchedulerPanel.tsx`, `ExecutionHistoryPanel.tsx` — created
- `apps/web/src/components/controls/ControlPanel.tsx`, `apps/web/src/App.tsx` — wiring
- `docs/SCHEDULER_SPEC.md`, `docs/EXECUTION_HISTORY_SPEC.md` — created
- `docs/PLATE_LISTS_SPEC.md`, `docs/QUEUE_SPEC.md`, `docs/SIMULATION_SPEC.md` — updated

### Decisions

- **"Only one execution at a time"** falls out of a single check (`plateQueue.queueStatus` before firing) rather than a dedicated lock — simpler, and it's the same state the rest of the app already treats as the source of truth for "is something running."
- **`runNow` never touches `runCount`/`lastRunAt`/`nextRunAt`** — an out-of-band manual trigger shouldn't perturb the automatic cadence math.
- **Missing-list schedules silently no-op every tick** rather than auto-disabling — a deliberate choice to avoid destroying the user's schedule configuration; the UI's "⚠ Missing list" badge is the intended signal to act on.
- **Busy-skip records are throttled**, not one-per-tick — for `repeat_interval`/`daily_at_time` this falls out naturally from advancing `nextRunAt` on every skip (same as a real fire); for `once_at_time` (which has no natural next slot) an in-memory per-schedule flag prevents repeat logging until the queue frees up.
- **`failed` execution status has no automatic trigger** — same known limitation as item-level `failed` in the Plate Queue since Phase 0.4 (no failure path exists locally yet).

### Manual Testing (20/20 scenarios, via headless-Chromium Playwright driver)

1–2. `once_at_time` ~12s in the future — created, `nextRunAt` shown correctly.
3. Fired automatically and auto-disabled (`runs: 1`, `disabled`) — confirmed.
4. (folded into 1–3.)
5–6. `repeat_interval` every 10s with `maxRuns=2` — confirmed firing exactly twice then auto-disabling, in an isolated run; also incidentally exercised the busy-skip path when run alongside a slower concurrent schedule, confirming it degrades gracefully (extra `skipped` record, correct final `runs: 2/2`).
3(daily). `daily_at_time` creation — `nextRunAt` correctly computed as the next day at the given time when today's slot had already passed.
8. Run Now — executed immediately, recorded with `triggeredBy: 'schedule'`, confirmed `runCount` unaffected.
9. Shuffle — schedule created with `plateOrder: 'shuffle'`, confirmed persisted/displayed.
10. Schedule with a deleted list — "⚠ Missing list" badge shown, zero console errors across further ticks (no crash, no spam).
11–12. Schedule firing while the queue is busy (dedicated test with a manual "Run List" in progress) — confirmed a `skipped`/`queue_busy` record was created and the active manual run was completely undisturbed.
13. (covered by 11/12 and the history record's fields.)
14. History `stopped` status — confirmed after manually hitting Stop Queue mid-run.
9(completed). History `completed` status — confirmed after a run finished normally.
15. Clear History — confirmed, empty state shown.
16. Export History — downloaded JSON has the expected `{ exportedAt, records }` shape with the correct record count.
17. Persistence across reload — both schedules and (pre-clear) history confirmed to survive a hard reload.
18. Corrupted `localStorage` (both scheduler and history keys) — recoverable error shown, Reset Storage recovers cleanly, zero crashes.
19. Camera Mode — neither "Scheduler" nor "Execution History" render.
20. Plate Lists' own "Run List" — exercised repeatedly throughout (Blocker List, Doomed List, Daily List) and confirmed still fully functional.

Regression spot-check: single-plate manual run, manual pause/resume (exact `t` freeze), and gate `hidden` mode all still work. Zero console errors across every QA script run this phase.

### Known Limitations

- Local browser time only — no timezone handling.
- Run window doesn't support spanning midnight.
- No queue of pending schedules — a second due schedule during an active run is skipped (with a record), never queued to run immediately after.
- `failed` execution status has no automatic trigger yet.
- Execution history export is one-way (no re-import).

### Next Steps

- Backend/remote/API phases remain explicitly out of scope until requested.

---

## Phase 0.8 — Local Backend + API + Docker (Macro Phase 4)

### Goal

Add a local Node.js/Fastify backend so external scripts/tools can drive
Plate Runner over a REST API, without building Remote Mode, pairing, or
WebSocket yet. Everything up to this phase lived entirely in the browser
(`localStorage`); this phase adds real server-side persistence and a
command-queue model the frontend polls to actually execute anything.

### Implemented

- **`apps/server`** — Fastify backend, run via `tsx` (no build step, mirrors
  how Vite already consumes `packages/shared` as raw TS for the frontend).
  `GET /health` (unauthenticated) and `GET /api/status`.
- **API key auth** on every `/api/*` route (`x-api-key` header or
  `Authorization: Bearer`), scoped via a Fastify plugin boundary so `/health`
  is structurally exempt rather than special-cased per route. Basic rate
  limiting (`@fastify/rate-limit`, 100 req/min/IP). Request logging with a
  custom serializer that can never leak the API key.
- **SQLite storage** (`better-sqlite3`, WAL mode, no ORM) for
  `simulation_commands` and `plate_lists` — installed cleanly via a
  prebuilt binary, no native-compile friction, no JSON fallback needed.
  Never crashes on a corrupted/unwritable data dir — falls back to an
  in-memory database and reports that via `/api/status`.
- **Simulation Command API** — `SimulationCommand` type
  (`pending → claimed → completed|failed|cancelled`) added to
  `packages/shared`. `POST /api/simulate`, `POST /api/simulate/queue`,
  `POST /api/simulation/{pause,resume,stop,skip-current,open-gate}`, the
  generic `POST/GET /api/simulation/commands*`, and `GET /api/commands*`
  (history) all build on this one lifecycle.
- **Plate Lists API** — backend-side CRUD (`GET/POST /api/lists`,
  `GET/PUT/DELETE /api/lists/:id`, `POST /api/lists/:id/run`), a parallel,
  unsynced store to the browser's localStorage-backed lists.
  `POST /api/lists/:id/run` embeds a full list snapshot in the resulting
  command's payload to avoid a read-then-execute race.
- **Frontend `useApiCommandListener`** — polls `GET
  /api/simulation/commands/pending` every 1.5s, claims and executes
  commands against the existing local simulator via
  `usePlateLists.runListSnapshot` (a new method factoring out the same
  apply-defaults-then-run sequencing `runList`/`runListForSchedule` already
  used — now shared by three callers: manual, scheduled, API). If the local
  queue is already active, run-type commands are claimed then failed with
  `local_queue_busy` for explicit feedback instead of silently starving.
  Instantiated in `App.tsx` (not `ControlPanel`) so it keeps polling in
  Camera Mode/Fullscreen — only its `LocalApiPanel` UI is hidden there.
- **Docker** — `apps/server/Dockerfile`, `apps/web/Dockerfile` (multi-stage,
  nginx-served), `docker-compose.yml` (named volume for SQLite
  persistence), root `dev`/`dev:web`/`dev:server`/`server:start` scripts via
  a new `concurrently` devDependency.

### Files Changed

- `packages/shared/src/types/simulationCommand.ts` — created
- `packages/shared/src/types/executionHistory.ts` — `TriggeredBy` gains `'api_command'`
- `packages/shared/src/index.ts`, `packages/shared/package.json` (`"type": "module"` — see Decisions) — updated
- `apps/server/**` — created (package.json, tsconfig.json, `src/{index,config}.ts`, `src/routes/*.ts`, `src/services/*.ts`, `src/storage/*.ts`, `src/security/*.ts`, `src/logging/requestLogger.ts`)
- `apps/web/src/features/lists/usePlateLists.ts` — `runListSnapshot` added
- `apps/web/src/features/api/useApiCommandListener.ts` — created
- `apps/web/src/components/controls/LocalApiPanel.tsx` — created
- `apps/web/src/components/controls/ControlPanel.tsx`, `apps/web/src/App.tsx` — wiring
- `apps/server/Dockerfile`, `apps/web/Dockerfile`, `docker-compose.yml`, `.dockerignore` — created
- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` — scripts, `packageManager` pin, `allowBuilds` for `better-sqlite3`
- `.gitignore` — `apps/server/data/`
- `docs/BACKEND_API_SPEC.md`, `docs/API_COMMANDS_SPEC.md`, `docs/LOCAL_API_MODE.md`, `docs/DOCKER_SETUP.md`, `docs/SECURITY_NOTES.md` — created
- `docs/SECURITY_SPEC.md`, `docs/PLATE_LISTS_SPEC.md`, `docs/QUEUE_SPEC.md`, `docs/SCHEDULER_SPEC.md`, `docs/EXECUTION_HISTORY_SPEC.md` — updated

### Decisions

- **`apps/server` runs via `tsx`, no build step** — `packages/shared` has no
  compile step either (Vite transpiles it directly for the frontend);
  adding a dedicated build pipeline just for the backend to consume it
  would be new tooling for no real benefit at local scale. Easily revisited
  before any real production deployment.
- **SQLite over JSON files** — `better-sqlite3` installed cleanly via a
  prebuilt binary in this environment, so the plan's JSON-file fallback
  was never needed. Sets up cleanly for future remote/history/pairing needs
  without a heavy ORM.
- **`packages/shared/package.json` needed `"type": "module"`** — without it,
  Node/`tsx` silently interpreted its `.ts` files as CommonJS at runtime
  (only synthesizing a `default` export), even though `tsc --noEmit`
  type-checked fine against the same source — type-checking is purely
  source-level and doesn't care about the runtime module system. This had
  been invisible until now because Vite (the frontend's only prior
  consumer) ignores the field entirely. Caught by smoke-testing the actual
  server process, not by `tsc` alone — reinforces always live-testing
  before calling a milestone done.
- **`local_queue_busy` claims-then-fails rather than leaving the command
  pending** — an API caller gets an explicit, fast signal instead of
  silently waiting on a command that might never get picked up before the
  caller's own timeout.
- **Run-list snapshot embedding, not a list-id reference** — avoids a
  race where the list is edited or deleted between "the API call that
  triggers a run" and "the frontend actually executing it."
- **Fastify's empty-JSON-body rejection fixed on both ends** — `fetch()`
  always sets `Content-Type: application/json`, which Fastify's default
  parser rejects when combined with no body
  (`FST_ERR_CTP_EMPTY_JSON_BODY`) — this broke every bodiless POST
  (`claim`, `complete`, the control endpoints) until the frontend was
  changed to always send `'{}'` and the server's JSON parser was changed to
  treat an empty body as `{}`. Fixed on both sides deliberately: the
  frontend fix makes this app's own calls correct, but the server fix
  protects any *other* external caller (curl, CI scripts) from hitting the
  same footgun, which is the whole point of exposing this API to begin with.
- **`packageManager: "pnpm@11.9.0"` pinned in root `package.json`** —
  without it, `corepack enable` inside the Docker image resolved the latest
  pnpm (11.20.0) at build time, which requires Node ≥ 22.13; combined with
  the `node:20-bookworm-slim` base image this produced a cryptic pnpm-level
  `ERR_UNKNOWN_BUILTIN_MODULE: node:sqlite` crash unrelated to this
  project's own code. Fixed by pinning the pnpm version and bumping both
  Dockerfiles to `node:22-bookworm-slim`.

### Manual Testing

Backend endpoints verified via `curl` and the frontend listener verified
end-to-end via a headless-Chromium Playwright driver (both a live two-process
test — `tsx` backend + Vite dev server — and a full `docker compose up
--build` run):

1. `GET /health` with no key → `200`.
2. `GET /api/status` with no key → `401`; with the correct key → `200`,
   `storage.type: "sqlite"`, `storage.ok: true`.
3. `POST /api/simulate` (single plate) → `200`, `{ ok, commandId, status: 'pending' }`.
4. Frontend "Test Connection" → `connected` badge.
5. Frontend listener claims and executes the `run_plate` command — vehicle
   ran with the API-supplied plate (confirmed via screenshot: top bar and
   on-vehicle plate both show `APIRUN1`), execution history recorded it,
   command reached `status: 'completed'`.
6. `POST /api/simulate/queue` with 3 plates → `200`, command created and
   later confirmed `completed` in the command history.
7. `POST /api/simulation/pause` / `/resume` with **no body** (only
   `Content-Type: application/json`) → both `200` — confirms the empty-body
   fix on the server side, independent of the frontend.
8. `open-gate` via API in a `wait_for_signal`-gated run — exercised as part
   of the control-command sweep; command created and completable.
9. `POST /api/simulation/stop` — command created, `200`.
10. Invalid plate (`abc!`) → `400` with a descriptive error.
11. Invalid API key → `401` (both missing-header and wrong-key cases).
12. `POST /api/lists` → `201`, list created; `POST /api/lists/:id/run` →
    `200`, `run_list` command created with an embedded list snapshot.
13. Restarted the raw backend process against the same storage path — prior
    pending commands and the created list were both still present
    afterward, confirming SQLite persistence across restarts.
14. `docker compose up --build` — both images built (including
    `better-sqlite3`'s native postinstall step via a prebuilt binary), both
    containers started, `/health`/`/api/status` behaved identically to the
    non-Docker run, `http://localhost:8080` served the built frontend, and
    a command created via the API survived `docker compose restart
    plate-runner-server` — confirming the named-volume persistence, not
    just same-process persistence.
15. Confirmed the API key does not appear anywhere in either the raw `tsx`
    process logs or `docker logs plate-runner-server` (`grep`-checked
    directly).
16. Camera Mode — the Local API panel is hidden, but a command sent via the
    API while in Camera Mode was still claimed and (once the queue was
    free) executed and completed — confirmed the listener keeps polling
    with `ControlPanel` unmounted.
17. `local_queue_busy` behavior — with several commands backlogged, a
    newly-arriving `run_plate` command while the queue was already busy
    processing an earlier one was claimed and immediately marked `failed`
    with `error: 'local_queue_busy'`, while `pause`/`resume` issued during
    that same busy window both completed normally — confirmed directly by
    inspecting `GET /api/commands`.

### Known Limitations

- No Remote Mode, pairing, or WebSocket — explicitly out of scope this
  phase, per the request.
- `set_config` commands are claimed and immediately failed with
  `not_implemented` — the payload shape is reserved but unused.
- Frontend execution history and backend command history are two
  independent, unsynced logs of the same underlying runs.
- Frontend and backend plate-list stores are two independent, unsynced
  stores (see `docs/PLATE_LISTS_SPEC.md`).
- Rate limiting is basic (100 req/min/IP, not per-API-key-tiered); no
  explicit payload size caps yet — see `docs/SECURITY_NOTES.md` for the
  full list of deferred hardening items.
- CORS is permissive (`origin: true`) — a deliberate local-only relaxation,
  not appropriate once anything beyond localhost/LAN is exposed.
- No HTTPS/reverse proxy in the Docker setup — local/LAN only.
- Only one command is processed per 1.5s frontend poll tick.
- No `.env.example` for Docker Compose overrides yet.

### Bugs Found and Fixed This Phase

- `packages/shared` was silently loaded as CommonJS at runtime (only a
  `default` export visible) despite type-checking cleanly — fixed by adding
  `"type": "module"` to its `package.json`. Would have broken any future
  non-Vite consumer of the package, not just this backend.
- `FST_ERR_CTP_EMPTY_JSON_BODY` — Fastify rejected any bodiless POST sent
  with `Content-Type: application/json` (which `fetch()` always sets),
  breaking `claim`/`complete`/the control endpoints end-to-end. Fixed on
  both the frontend (`useApiCommandListener`) and the server (custom JSON
  content-type parser).
- pnpm/Node version mismatch inside Docker (`corepack` resolving a pnpm
  version requiring Node ≥ 22.13 against a `node:20` base image) — fixed by
  pinning `packageManager` and bumping both Dockerfiles to
  `node:22-bookworm-slim`.

### Next Steps

- Remote Display Mode + 6-digit pairing (the next natural phase once this
  local API is proven out).
- Optionally sync frontend/backend plate-list and execution-history stores
  once Remote Mode needs a single source of truth.
- Harden `docs/SECURITY_NOTES.md`'s deferred items (payload caps,
  per-key rate tiers, CORS allowlist, key rotation) before any exposure
  beyond localhost/LAN.

---

## Phase 0.9 — Remote Display Mode + Pairing + Remote Control (Macro Phase 5)

### Goal

Let one computer act as a **Display** (shows the simulation, listens for
remote commands) and another as a **Controller** (sends commands to one or
more paired displays), using 6-digit pairing codes and long-lived tokens —
no cloud, no user accounts, local/LAN/self-hosted. Explicitly out of scope:
cloud deployment, users/email/password, billing, multi-tenant hosting, new
render scenes, visual calibration, real ANPR/AI.

### Implemented

- **Storage**: four new tables (`display_devices`, `controller_devices`,
  `pairing_sessions`, `device_pairings`), all `CREATE TABLE IF NOT EXISTS`,
  plus an idempotent `ALTER TABLE` migration adding `displayId`/`source`/
  `createdByControllerId` to the existing `simulation_commands` table —
  verified against a pre-Phase-5 database with existing rows, nothing lost.
- **Pairing**: `POST /api/displays/register` issues a `displaySecret`;
  `POST /api/displays/:id/pairing-code` generates a crypto-random 6-digit
  code with a 5-minute TTL (regenerating cancels the prior pending code);
  `POST /api/controllers/pair` exchanges a valid code for a
  `controllerToken`. Both secrets are 256-bit random and stored as SHA-256
  hashes only — plaintext appears in exactly one API response each, never
  persisted, never logged.
- **Remote command routing**: `/api/remote/displays/:displayId/*` (simulate,
  simulate/queue, pause, resume, stop, skip-current, open-gate, set-config),
  controller-token-authenticated — the auth check also verifies the token's
  pairing is for *that specific* displayId, 403ing otherwise. Every
  `SimulationCommand` now carries `displayId`/`source`/
  `createdByControllerId`; `commandsRepo.listPending(displayId?)` branches
  at the SQL level so a display only ever sees its own commands and the
  local/global listener never sees remote ones.
- **Display Mode command listener**: `useDisplayCommandListener` — same
  poll/claim/execute/report shape as the Phase 4 Local API listener, scoped
  to `/api/displays/:displayId/commands/*`, authenticated with both the
  global API key and the display's own secret, plus a 20s heartbeat.
  Registration persists to `localStorage`.
- **Controller Mode**: `useRemoteController` — pairs with (multiple)
  displays, persists `{displayId, controllerToken}` pairs to `localStorage`,
  and fires single-shot commands at the remote routes — no polling, the
  target display's listener does the work.
- **`set_config` now genuinely implemented** (was permanently
  `not_implemented` in Phase 4) — a shared `commandExecutor.ts` extracted
  from `useApiCommandListener` (now reused by both the local and display
  listeners) applies partial config changes via an optional `onSetConfig`
  callback.
- **Three usage modes** in the frontend header (Local / Display /
  Controller) — Local Mode's layout and hooks are completely untouched;
  Display Mode reuses the same `SimulationScene` plus a new
  `DisplayModePanel`; Controller Mode has no large scene view, just a
  full-width `ControllerModePanel`.
- **Hardening**: global 1MB Fastify `bodyLimit`; `PLATE_RUNNER_CORS_ORIGINS`
  allowlist replacing `origin: true` (defaults to localhost with a
  `console.warn` if unset); pairing routes rate-limited to 10/min, remote
  command routes to 30/min (general API stays 100/min); `.env.example`
  added at the repo root.

### Files Changed

- `packages/shared/src/types/remote.ts` — created (RemoteRole, PairingSessionStatus, CommandSource, DisplayDevice, PairingSession, DevicePairingSummary)
- `packages/shared/src/types/simulationCommand.ts` — displayId/source/createdByControllerId, SetConfigPayload
- `packages/shared/src/index.ts` — new export
- `apps/server/src/storage/db.ts` — four new tables, idempotent column migration
- `apps/server/src/storage/remoteRepo.ts` — created
- `apps/server/src/storage/commandsRepo.ts` — new columns, displayId-scoped listPending
- `apps/server/src/security/tokens.ts`, `displayAuth.ts`, `controllerAuth.ts` — created
- `apps/server/src/services/displayService.ts`, `pairingService.ts` — created
- `apps/server/src/services/validation.ts` — validateName, validateSetConfigPayload
- `apps/server/src/services/commandService.ts` — options bag for displayId/source/createdByControllerId
- `apps/server/src/routes/displays.ts`, `controllers.ts`, `remote.ts` — created
- `apps/server/src/routes/simulate.ts`, `simulationControl.ts`, `simulationCommands.ts`, `lists.ts` — pass `source: 'local_api'`
- `apps/server/src/config.ts`, `index.ts` — CORS allowlist, bodyLimit, new route registration
- `apps/web/src/features/api/commandExecutor.ts` — created (shared dispatch core)
- `apps/web/src/features/api/useApiCommandListener.ts` — uses the shared core, onSetConfig prop
- `apps/web/src/features/display/useDisplayCommandListener.ts` — created
- `apps/web/src/features/controller/useRemoteController.ts` — created
- `apps/web/src/components/controls/DisplayModePanel.tsx`, `ControllerModePanel.tsx` — created
- `apps/web/src/App.tsx` — usage-mode tabs, Display/Controller layouts, applyPartialConfig
- `docker-compose.yml` — PLATE_RUNNER_CORS_ORIGINS pass-through
- `.env.example`, `.gitignore` — created / `!.env.example` exception added
- `docs/REMOTE_MODE_SPEC.md`, `PAIRING_SPEC.md`, `REMOTE_COMMANDS_SPEC.md` — created
- `docs/BACKEND_API_SPEC.md`, `API_COMMANDS_SPEC.md`, `LOCAL_API_MODE.md`, `DOCKER_SETUP.md`, `SECURITY_NOTES.md`, `SECURITY_SPEC.md` — updated

### Decisions

- **Server-internal secret/token types never enter `@plate-runner/shared`**
  — only hash-free, frontend-safe shapes (`DisplayDevice`,
  `DevicePairingSummary`) are exported; `secretHash`/`tokenHash`-bearing
  records live only in `apps/server/src/storage/remoteRepo.ts`.
- **SHA-256, not bcrypt/scrypt, for secret/token hashing** — the inputs are
  already uniformly-random 256-bit values, not low-entropy passwords, so a
  slow KDF adds cost without adding real protection.
- **Idempotent `ALTER TABLE` migration, not a migration framework** —
  matches the project's existing "no heavy ORM" philosophy; a
  `PRAGMA table_info` check before each `ADD COLUMN` is enough for this
  scale and is trivially safe to re-run.
- **Two-layer auth** (global API key + per-device secret/token) — the API
  key proves "allowed to talk to this backend at all," the device
  credential proves "is specifically this display/controller." Documented
  explicitly rather than left implicit.
- **`displayId`-scoped pending queues enforced in SQL**
  (`WHERE displayId IS NULL` vs `WHERE displayId = ?`), not just filtered
  client-side — a display cannot accidentally see another display's or the
  local queue's commands even if the frontend had a bug.
- **Auto-approve pairing, no manual Display-side confirmation this phase**
  — `PairingSessionStatus` already has room for an `approved` state between
  `pending` and `used` so a future phase can add manual confirmation
  without a breaking schema change.
- **"Send List" on Controller reuses `/api/remote/displays/:id/simulate/queue`**
  rather than a new endpoint — the spec's endpoint list has no dedicated
  remote list-run route, and a `PlateList`'s shape already maps 1:1 onto
  `simulate/queue`'s body.
- **`set_config` implemented via a shared `commandExecutor.ts` extraction**
  — rather than duplicating the dispatch switch a second time for Display
  Mode, the existing Local Mode listener's switch was factored out first,
  and both hooks now call the same function.

### Manual Testing (30/30 scenarios)

1. Local Mode regression-checked — unchanged, still fully functional.
2. `GET /health` — `200`, no auth.
3. `GET /api/status` with API key — `200`.
4. Display registers via `POST /api/displays/register` — confirmed via curl and the UI's Register form.
5. Display generates a 6-digit pairing code — confirmed format and `expiresAt`.
6. Code expiry — manually expired a session's `expiresAt` in SQLite and confirmed `POST /api/controllers/pair` returns `410`; the UI shows a live countdown from `expiresAt`.
7. Controller enters a valid code — paired successfully via both curl and the two-tab Playwright UI test.
8. Controller receives a `controllerToken` — confirmed in the pair response.
9. Token never appears in logs — grepped server logs after multiple pairing/remote-command flows, zero matches, in both raw-process and Docker runs.
10. Controller sends a single plate — confirmed via curl and the two-tab UI test (display actually ran the plate, screenshot confirms).
11. Display listener claims only its own displayId's commands — confirmed the global `/api/simulation/commands/pending` does NOT see a remote-targeted command, and a display's own `pending` endpoint does.
12. Display runs the vehicle from a remote command — confirmed visually (screenshot) in both the single-display and two-tab tests.
13. Command reaches `completed` — confirmed via `GET /api/commands/:id` (the same table backs both local and remote commands).
14. Controller sends a remote queue (`run_queue`) — command created and visible in the display's pending list.
15. Display runs the remote queue — same dispatch path as `run_plate`, confirmed via the shared `commandExecutor`.
16. Controller sends pause/resume — both confirmed via curl and the two-tab UI test (Pause button, "Sent" badge shown).
17. Controller sends open-gate — confirmed via curl; command created and completable.
18. Controller sends stop — confirmed via curl.
19. Controller tries to control an unpaired display — `403` confirmed via curl ("this controller is not paired with that display").
20. Invalid pairing code — `400` (malformed) and `404` (well-formed but unknown) both confirmed via curl.
21. Expired pairing code — `410` confirmed (see #6).
22. Revoke a pairing — `POST /api/displays/:id/pairings/:pairingId/revoke` confirmed via curl.
23. Revoked token no longer works — confirmed: a remote command with the same token immediately after revocation returns `401`.
24. Camera Mode hides the Display panel but keeps the listener running — confirmed via Playwright: panel hidden, a remote command sent while in Camera Mode still reached `completed`.
25. `docker compose restart plate-runner-server` preserves display/pairing data — confirmed: registered a display and paired a controller, restarted the container, `GET .../pairings` still showed the pairing.
26. CORS allowlist works for localhost — confirmed an allowed origin gets `Access-Control-Allow-Origin`, a disallowed one does not.
27. Oversized payload fails — a 2MB body returns `413 FST_ERR_CTP_BODY_TOO_LARGE`.
28. Invalid API key fails — `401` confirmed on both `/api/status` and pairing routes.
29. Local API Mode (Phase 4) still works — the two-tab and single-display Playwright tests all ran alongside it with zero regressions; typecheck/build clean throughout.
30. No console errors — every Playwright run (single-display, two-tab Display+Controller, Camera Mode) reported zero console errors.

### Known Limitations

- No manual Display-side pairing confirmation this phase (auto-approve
  only) — see Recommended Next Phase.
- Pairing brute-force protection is a flat rate limit, not a
  lockout/backoff scheme.
- No pairing/token expiry beyond explicit revocation.
- Frontend/backend plate-list and execution-history stores remain
  independent and unsynced (unchanged from Phase 4) — Controller Mode's
  "Send List" reads the controller's own local browser lists, not
  anything display-side.
- `GET /api/displays/:id/pairings` requires the display's own secret — a
  controller can't self-inspect or self-revoke its own pairing.
- Payload limits are a single flat 1MB cap, not per-endpoint-type tiers.
- No WebSocket/push — Display Mode's 1.5s poll interval is the same
  latency ceiling Local Mode has always had.

### Next Steps

- Manual Display-side pairing confirmation (the `PairingSessionStatus`
  state machine already supports inserting an `approved` step).
- Cloud deployment, user accounts, and multi-tenant hosting remain
  explicitly out of scope until a future phase requests them.

---

## Phase 1.0 — Remote Mode Hardening + Manual Pairing Approval (Macro Phase 5.1)

### Goal

Close out Remote Mode with a short hardening/UX pass: replace pairing's
auto-approve with explicit Display-side approval, add a failed-attempt
guard on top of the existing rate limits, and leave Remote Mode ready for
real LAN testing. No cloud, no WebSocket, no user accounts, no list/history
sync, no render/scene work — pure pairing hardening.

### Implemented

- **New pairing states**: `PairingSessionStatus` gains `approval_pending`
  (a controller claimed the code, awaiting the display) and `rejected`.
  Kept `'pending'` rather than renaming it — a cosmetic change with no
  behavioral gain.
- **Token minting deferred to `finalize`, not `approve`** — approving only
  flips a status column; no `controller_devices`/`device_pairings` row
  exists until the controller explicitly finalizes. A controller that
  never finalizes (crash, closed tab) leaves nothing orphaned.
- **`POST /api/controllers/pair`** now creates an `approval_pending`
  request and returns no token. **`GET
  /api/controllers/pairing-requests/:id`** lets the controller poll status
  (never returns a token). **`POST .../finalize`** is the one place a
  plaintext `controllerToken` is ever produced — a second call 409s with
  `token_already_issued`.
- **`GET /api/displays/:displayId/pairing-requests`**,
  **`POST .../approve`**, **`POST .../reject`** — display-secret-
  authenticated, let the Display owner see and decide on pending requests.
- **Lazy expiry**: a shared `resolveSession` helper expires
  `pending`/`approval_pending`/`approved` sessions past their `expiresAt`
  on every read/write — an `approval_pending` or `approved` request
  expires on the *same* TTL as the original code, no separate timer.
- **Failed-attempt guard**: in-memory sliding-window tracker, 5 failed
  `POST /api/controllers/pair` attempts / 5 minutes / IP → `429`, stacking
  with the existing 10/min route rate limit.
- **Frontend**: `useDisplayCommandListener` gains `pairingRequests` (polled
  every 2s, independent of the command-listener toggle) and
  `approveRequest`/`rejectRequest`; `DisplayModePanel` gets a "Pairing
  Requests" card. `useRemoteController`'s one-shot pairing call became a
  stateful `requestPairing` → poll → auto-finalize flow
  (`pairingRequest.phase`); `ControllerModePanel`'s Pair section now shows
  "Waiting for display approval…" → "Paired successfully" /
  "Pairing rejected by display" / "Pairing code expired" / an error, each
  with a way back to retry.

### Files Changed

- `packages/shared/src/types/remote.ts` — `approval_pending`/`rejected` statuses, `PairingSession.controllerName`, new `PairingRequestSummary`
- `apps/server/src/storage/db.ts` — additive `pairing_sessions.controllerName` column (idempotent migration)
- `apps/server/src/storage/remoteRepo.ts` — `getSessionById`, `listApprovalPendingForDisplay`, `updateSession` persists `controllerName`
- `apps/server/src/services/pairingService.ts` — rewritten: `resolveSession`, `createPairingRequest`, `getRequestStatus`, `approveRequest`, `rejectRequest`, `finalizePairing`, `listPendingRequestsForDisplay`
- `apps/server/src/security/failedPairingAttempts.ts` — created
- `apps/server/src/routes/controllers.ts` — rewritten for the new flow
- `apps/server/src/routes/displays.ts` — three new pairing-request routes
- `apps/server/src/index.ts` — wires the failed-attempt tracker
- `apps/web/src/features/display/useDisplayCommandListener.ts` — pairing-request state/polling/approve/reject
- `apps/web/src/components/controls/DisplayModePanel.tsx` — "Pairing Requests" card
- `apps/web/src/features/controller/useRemoteController.ts` — rewritten pairing flow
- `apps/web/src/components/controls/ControllerModePanel.tsx` — pairing state-machine UI
- `docs/PAIRING_SPEC.md` — rewritten for the new flow (state machine, errors reference, backward compatibility)
- `docs/REMOTE_MODE_SPEC.md`, `docs/SECURITY_NOTES.md`, `docs/BACKEND_API_SPEC.md` — updated

### Decisions

- **`'pending'` kept, not renamed to `code_pending`** — see above.
- **Token minting deferred to `finalize`** — see above; this is the single
  most important design decision this phase, since it's what makes
  approval meaningfully safer than the old auto-approve flow rather than
  just adding a UI speed bump in front of the same outcome.
- **Double-finalize guard reuses the existing `status` field** (`'used'`
  means already issued) rather than adding a dedicated
  `tokenIssued`/`pairingId` bookkeeping column — one less thing to keep in
  sync.
- **Controller polling (`GET .../pairing-requests/:id`) needs no auth
  beyond the API key** — the `pairingRequestId` is a UUID capability token
  in its own right, and nothing sensitive (no token, no `controllerId`) is
  returned by it before finalize.
- **Failed-attempt tracking is in-memory**, matching the spec's explicit
  "puede ser in-memory" allowance — documented as resetting on restart.

### Manual Testing (23/23 scenarios)

1. Local Mode regression-checked via `pnpm typecheck`/`pnpm build` and the Playwright runs below running alongside it — unaffected.
2. Display registers via `POST /api/displays/register` — confirmed via curl and the UI.
3. Display generates a 6-digit code — confirmed format, `expiresAt`, and the live countdown in the UI.
4. Controller submits a valid code — `POST /api/controllers/pair` returns `approval_pending`, no token, confirmed via curl and the two-tab Playwright UI test.
5. Controller shows "Waiting for display approval…" — confirmed in the UI screenshot.
6. Display sees the pending request — confirmed via `GET .../pairing-requests` (curl) and the UI ("Approval Controller" shown on the Display tab).
7. Display approves — `POST .../approve` confirmed via curl and clicking Approve in the UI.
8. Controller finalizes and receives the token — confirmed via curl (`POST .../finalize` → `controllerToken`) and the UI showing "Paired successfully".
9. Controller sends a plate to the Display — confirmed via the UI ("Sent — command ...").
10. Display executes the command — confirmed via screenshot (top bar shows the controller-supplied plate `APRV001`).
11. Display rejects a second request — confirmed via curl and a dedicated Playwright test clicking Reject.
12. Controller sees "Pairing rejected by display" — confirmed in that same test.
13. Expired code can't create a request — manually expired a session in SQLite, confirmed `410 code has expired`.
14. Expired `approval_pending` request can't be approved — manually expired a request in SQLite, confirmed `410 request has expired` on approve, and the controller's poll shows `status: 'expired'`.
15. Second finalize returns no token — confirmed `409 token_already_issued` via curl.
16. Token never appears in logs — grepped server logs after every test run (raw process and Docker); zero real matches (one false-positive substring in a floating-point `responseTime` value, verified not the actual code).
17. Revoking a (finalize-created) pairing invalidates its token — confirmed via curl: a remote command worked before revoke, `401`'d immediately after.
18. Same as #17 — confirmed the revoked-token 401 explicitly with a follow-up remote command attempt.
19. Controller with a valid token for a different display gets `403` — confirmed via curl (`this controller is not paired with that display`).
20. Docker restart preserves pairings created via the new flow — registered, requested, approved, and finalized a pairing entirely inside `docker compose`, restarted the server container, confirmed `GET .../pairings` still showed it.
21. Pre-5.1 pairings still work — started the server against a Phase 5 (auto-approve-era) database; it started cleanly, `/api/status` and display/pairing reads succeeded with the old rows intact.
22. Camera Mode hides the pairing UI but approval still functions — confirmed via Playwright: "Pairing Requests" card hidden in Camera Mode, and a request created/approved from outside while the display stayed in Camera Mode both succeeded.
23. No console errors — zero across every Playwright run this phase (single-display, two-tab approve flow, two-tab reject flow, Camera Mode).

### Known Limitations

- Pairing brute-force protection is a flat rate limit + in-memory
  failed-attempt counter, not a lockout/backoff scheme; the counter resets
  on server restart.
- No pairing/token expiry beyond explicit revocation once finalized.
- A controller cannot self-cancel a request it created, or self-inspect/
  self-revoke its own pairing — those remain display-secret-authenticated
  only.
- `DisplayModePanel`'s "Paired Controllers" count doesn't auto-refresh the
  instant a controller finalizes elsewhere — it refreshes on approve and on
  manual "↻ refresh", which is enough for the approval flow itself to work
  correctly but can show a stale count until the next refresh trigger.

### Next Steps

- Cloud deployment, user accounts, and WebSocket remain explicitly out of
  scope until a future phase requests them.
- If real multi-device LAN testing surfaces a need for a controller to
  cancel its own pending request, that's a small, additive follow-up (a
  `POST /api/controllers/pairing-requests/:id/cancel` mirroring `reject`).

---

## Real LAN Manual Testing — Validation Session

Not a new macro phase — a support/debugging session validating the "Real
LAN Manual Testing Readiness" work with actual physical hardware (a Mac
running the backend + frontend, a phone as the second device, connected via
the phone's own personal hotspot after a router-level client-isolation
issue ruled out testing on the original home network).

### Result

Full Display ↔ Controller remote-control flow confirmed working
end-to-end across two real devices: pairing request → approval → finalize
→ `Send Plate` / `Send Queue` / `Pause` / `Resume` / `Open Gate` / `Stop`,
Camera Mode keeping the listener active with the panel hidden, and a
backend restart preserving the display/pairing/token without needing to
re-pair.

### Bugs found and fixed

1. **Vite dev server wasn't LAN-reachable** — `apps/web/vite.config.ts` had
   no `server.host` config, so `pnpm dev`/`pnpm dev:web` only bound to
   `localhost`, unlike the backend (which already bound `0.0.0.0`
   unconditionally). A second device could reach the backend but couldn't
   load the frontend page at all. Fixed with `server: { host: true }`.
   Commit `6243cfd`.
2. **Documentation gap**: on iOS Safari, a CORS-rejected request (origin
   missing from `PLATE_RUNNER_CORS_ORIGINS`) surfaces as the generic "Load
   failed" — no mention of CORS anywhere, easy to misdiagnose as a
   connectivity problem. Documented the exact wording plus a `curl -X
   OPTIONS` diagnostic command in `MANUAL_TESTING_GUIDE.md`'s
   troubleshooting table. Commit `f85ce24`.

Neither required touching pairing logic, the API, or any architecture —
both were config/docs-level, per this session's explicit constraints (no
new features, no automated tests, no refactors).

### Known limitation confirmed in practice

Router-level client/AP isolation (common on ISP-provided routers) can
silently block device-to-device LAN traffic even when both devices show
the same Wi-Fi network — symptoms look identical to a firewall or CORS
problem but aren't fixable from the app side. Workaround used here: a
phone personal hotspot, where the phone itself is the access point and
isolation between "itself and a connected client" doesn't apply. Worth
keeping in mind for anyone else running this same test on a network they
don't control.

---

## Phase — App Shell Navigation

**Date:** 2026-08-06

### Goal

Replace the three-tab (Local/Display/Controller) header + single mega
control panel with a real app shell: a top header, a left sidebar with 8
modules, a Home screen with entry cards, and persistence of the last
screen visited. Pure frontend navigation/shell work — no backend, API,
pairing, command routing, or render/scene changes.

### Implemented

- New `AppScreen` type (`home | local | display | controller | lists |
  scheduler | history | settings`) replacing the old `UsageMode`.
- `usePersistentAppScreen` hook persisting the active screen to
  `localStorage["plate-runner:last-screen:v1"]`, falling back to `home` on
  a missing/corrupted/unknown value — `appMode` (Camera/Fullscreen) is
  deliberately never persisted, so a reload never comes back into
  Camera Mode/Fullscreen.
- `AppShell` (header + status chips + sidebar + content) and `SidebarNav`
  (Modes / Data / Settings grouped nav) as pure layout components.
- Eight screen components under `apps/web/src/screens/`, each a thin
  wrapper around an existing, unmodified panel component.
  `LocalModeScreen.tsx` absorbs the old `ControlPanel.tsx` minus the four
  sections (Plate Lists, Scheduler, Execution History, Local API) that
  became their own screens; `ControlPanel.tsx` was deleted.
  `PlateListsScreen`/`SchedulerScreen` wrap `runList`/`runNow` to also
  navigate to the Local screen so the running car stays visible.
- Header status chips (Local API, Display, Queue) surface background
  listener/queue activity regardless of which screen is active.
- `App.tsx` rewritten to own all 8 singleton hooks exactly as before (same
  instantiation order, no duplication) and hand the relevant subset to
  whichever screen is active; the Camera Mode/Fullscreen `expandedLayout`
  is untouched and still bypasses the entire shell.

### Files Changed

- `apps/web/src/navigation/appScreens.ts` — new: `AppScreen` type,
  `APP_SCREENS` metadata, `isAppScreen` guard.
- `apps/web/src/hooks/usePersistentAppScreen.ts` — new: last-screen
  persistence hook.
- `apps/web/src/components/layout/AppShell.tsx` — new: header + sidebar +
  content shell.
- `apps/web/src/components/layout/SidebarNav.tsx` — new: grouped nav.
- `apps/web/src/screens/HomeScreen.tsx` — new: module cards with live
  status.
- `apps/web/src/screens/LocalModeScreen.tsx` — new: absorbs
  `ControlPanel.tsx`'s simulator/plate/gate/vehicle/playback/queue
  controls.
- `apps/web/src/screens/DisplayModeScreen.tsx` — new: scene + display
  panel, moved verbatim out of `App.tsx`.
- `apps/web/src/screens/ControllerModeScreen.tsx` — new: thin
  `ControllerModePanel` wrapper.
- `apps/web/src/screens/PlateListsScreen.tsx` — new: thin
  `PlateListsPanel` wrapper with navigate-on-run.
- `apps/web/src/screens/SchedulerScreen.tsx` — new: thin `SchedulerPanel`
  wrapper with navigate-on-run.
- `apps/web/src/screens/ExecutionHistoryScreen.tsx` — new: thin
  `ExecutionHistoryPanel` wrapper.
- `apps/web/src/screens/SettingsScreen.tsx` — new: thin `LocalApiPanel`
  wrapper + version footer.
- `apps/web/src/App.tsx` — rewritten: drops `UsageMode`/inline tab
  switcher, wires `AppShell` + `usePersistentAppScreen`, keeps every hook
  instantiation and the Camera Mode/Fullscreen layout unchanged.
- `apps/web/src/components/controls/ControlPanel.tsx` — deleted (content
  absorbed by `LocalModeScreen.tsx` and the 4 extracted screens).
- `docs/APP_NAVIGATION_SPEC.md` — new.
- `docs/MANUAL_TESTING_GUIDE.md` — updated: sidebar navigation replaces
  tab-switching language throughout.
- `docs/LOCAL_API_MODE.md` — updated: Local API controls now live on the
  Settings / API screen.

### Decisions

- `AppScreen` stays a frontend-only concern in `apps/web/src/navigation/`
  — not added to `packages/shared`, since it has no backend counterpart.
- No Context/Provider introduced — one level of prop-drilling from
  `App.tsx` to the active screen was enough at this size; every singleton
  hook is still instantiated exactly once, in the same place, in the same
  order as before this phase.
- `appMode` intentionally excluded from persistence so a reload can never
  land the user in Camera Mode/Fullscreen with no visible way back in.
- "Run List"/"Run Now" auto-navigate to the Local screen — the underlying
  hooks aren't touched, only the screen-level wrapper passed to the panel,
  so this is presentation-only and doesn't change what actually runs.

### Manual Testing

Ran a scripted Playwright pass (not committed — matches this session's
established ad hoc QA pattern) against `pnpm --filter web dev`, covering:
cold load → Home; navigating to Local/Display/Controller and confirming
each survives a reload; a corrupted `localStorage` value falling back to
Home; the plate input, Plate Queue section, Plate Lists/Scheduler/
Execution History screens, and Settings screen (Test Connection + Local
API listener controls) all loading; the Display screen's registration/
listener controls; Camera Mode hiding the header; Fullscreen showing the
fullscreen overlay; and Home cards navigating to their screens. All
scenarios passed. `pnpm typecheck` and `pnpm --filter web build` both
clean.

### Known Limitations

- No dedicated mobile breakpoints for the sidebar — this phase targets
  desktop/laptop, matching the request; narrow viewports won't collapse
  the sidebar gracefully.
- The Settings screen doesn't duplicate the per-screen "Reset Storage"
  buttons already present on Lists/Scheduler/History — intentional, to
  avoid duplicated state/actions, per the phase's constraints.

### Next Steps

- Consider a collapsed/icon-only sidebar mode if the app is ever used on
  narrower viewports.
- Nothing backend-related is pending from this phase — Remote Mode's
  pairing/command-routing/CORS all remain exactly as validated in the
  prior LAN testing phase.

---

## Phase — App UX Polish

**Date:** 2026-08-06

### Goal

Short visual/UX polish pass on top of App Shell Navigation: unify
buttons, badges, empty states, and form styling app-wide; polish the
Home screen, header, and sidebar; do a light responsive/spacing check.
Pure UI/CSS/component polish — no backend, API, pairing,
command-routing, scheduler-engine, queue-logic, or render/scene changes.

### Implemented

- New shared UI kit at `apps/web/src/components/ui/`: `Button` (tones
  neutral/primary/danger/warn; variants pill/solid/ghost), `Badge`
  (tones neutral/success/info/warning/danger, optional pulse), `Label`,
  `EmptyState` (message + hint + optional action), `FieldError`.
- All 7 control panels (`DisplayModePanel`, `ControllerModePanel`,
  `LocalApiPanel`, `ExecutionHistoryPanel`, `SchedulerPanel`,
  `PlateListsPanel`, `PlateQueuePanel`) had their locally-duplicated
  `SmallButton`/`Label` and ad hoc status-color maps replaced with the
  shared components — no behavior changes, pure rendering swap around
  the exact same conditions.
- 5 empty states (Plate Lists, Scheduler, Execution History, Controller
  paired displays, Display pairing requests/paired controllers) now
  explain what to do next instead of a bare "No X yet." line.
- `LocalModeScreen.tsx` and `DisplayModeScreen.tsx`'s bespoke
  Start/Stop/Pause/Reset/gate-override/view-mode buttons now go through
  `Button` too.
- Home screen: Local Simulator card visually promoted as the primary
  entry point (gradient, `lg:col-span-2`, "Start here" badge), every
  card gets a two-letter monogram, status pills now use `Badge`.
- Sidebar: active items get a left accent bar in addition to the
  background fill, plus dividers between the Modes/Data/Settings groups.
- Header: status chip dot color now reflects the actual connection/queue
  status instead of always being static green (see Bugs/Risks).

### Files Changed

- `apps/web/src/components/ui/{Badge,Button,Label,EmptyState,FieldError}.tsx` — new shared UI kit.
- `apps/web/src/components/controls/{DisplayModePanel,ControllerModePanel,LocalApiPanel,ExecutionHistoryPanel,SchedulerPanel,PlateListsPanel,PlateQueuePanel}.tsx` — badge/button/empty-state/form polish, no logic changes.
- `apps/web/src/screens/LocalModeScreen.tsx`, `DisplayModeScreen.tsx` — button/badge polish.
- `apps/web/src/screens/HomeScreen.tsx` — card hierarchy, monograms, Badge status pills.
- `apps/web/src/components/layout/AppShell.tsx` — header spacing, status-chip tone.
- `apps/web/src/components/layout/SidebarNav.tsx` — active-item accent bar, group dividers.
- `apps/web/src/App.tsx` — computes `tone` for each status chip from real connection/queue state.
- `docs/UI_POLISH_NOTES.md` — new.
- `docs/APP_NAVIGATION_SPEC.md` — pointer to the new UI kit.

### Decisions

- Kept `Card`/`ToggleGroup` file-local rather than extracting — the
  Home nav-card and the compact data-item cards serve different jobs;
  forcing one abstraction would have blurred that distinction.
- Header status chips stay a distinct compound element, not `<Badge>` —
  they need more visual weight in that persistent-header role.
- Sidebar collapse/icon-only mode intentionally not implemented — no
  icon library in the project and no interactive collapse affordance
  was requested; documented as a known limitation instead.

### Manual Testing

Scripted Playwright pass (not committed) against `pnpm --filter web
dev` covering all 14 requested checks: Home renders with the promoted
Local Simulator card, sidebar active state, navigating every screen,
last-screen persistence survives a reload, Local Mode Start/Stop still
works, Display Mode still shows registration/pairing/listener,
Controller still shows Paired Displays + empty state, Plate Lists and
Scheduler empty states plus populated states after creating a test
list/schedule, Execution History renders, Settings/API Test Connection
visible, Camera Mode and Fullscreen both still hide the shell, and zero
browser console errors during the whole pass. All 14 passed.
`pnpm typecheck` and `pnpm --filter web build` both clean.

### Known Limitations

- No collapsed/icon-only sidebar for narrow viewports (see Decisions).
- Debug toggle in Local Mode now renders with the shared `primary`
  (blue) tone instead of its previous one-off purple — a deliberate
  simplification of the tone palette, not a functional change.

### Bugs/Risks

- Fixed one narrow, behavior-adjacent bug: the header's status-chip dot
  was always static green for any active chip, even when the underlying
  connection was actually `error`/`unauthorized`. It now reflects the
  real status color. No new state was introduced — only how existing
  state is displayed.

### Next Steps

- If the app later needs to run well on narrower screens, revisit the
  sidebar-collapse decision above (likely needs a small icon set).

---

## Phase — Operational Readiness

**Date:** 2026-08-06

### Goal

Closing "operational readiness" phase: System Status, per-domain local
storage reset, a local backup export/import, and a configurable idle
Screen Saver — plus a few small UX fixes that came up mid-phase. No
backend/API/pairing changes, no automated tests, no WebSocket/cloud, no
render/scene calibration.

### Implemented

- **System Status** (`SystemStatusPanel.tsx`, on Settings / API): app
  name, frontend mode (`import.meta.env.MODE`), API base URL/connection
  status, display registered, controller pairings/lists/schedules/
  history counts, queue status, vehicle color, last persisted screen,
  browser-storage-available check, Screen Saver enabled/timeout. A
  "Check Backend Status" button does a one-off `GET /api/status` call
  (reusing the existing Local API base URL/key — no new polling). Never
  renders the API key, tokens, secrets, or pairing codes.
- **Local Storage Management** (`LocalStorageManagementPanel.tsx`):
  confirm-gated resets for Plate Lists, Scheduler, Execution History,
  Remote Pairings local credentials (clears both the controller's
  paired displays and the display's own registration), App Preferences/
  Last Screen, Screen Saver Settings, and a stronger-worded "All Local
  Browser Data" (`localStorage.clear()` + reload). Every action reuses
  an existing reset function from its owning hook — no new hook-level
  reset APIs were added except where noted below.
- **Local Backup** (`features/backup/localBackup.ts` +
  `BackupPanel.tsx`): exports Plate Lists, Scheduler, Execution History,
  and non-secret preferences (last screen, Screen Saver settings) as one
  JSON file (`schemaVersion: 1`, `type:
  "plate_runner_local_backup"`). Import validates the schema, confirms
  before overwriting, writes the same localStorage keys the app already
  reads on mount, and reloads. Never reads or writes the API key,
  controller tokens, display secrets, or pairing codes.
- **Configurable Screen Saver** (`features/screensaver/useScreenSaver.ts` +
  `ScreenSaverOverlay.tsx` + `ScreenSaverSettingsPanel.tsx`): full-screen,
  CSS-only idle animation (`floating_plate` / `moving_logo` /
  `subtle_gradient`), default `{ enabled: true, timeoutMinutes: 10,
  style: 'floating_plate' }`, persisted to
  `plate-runner:screensaver:v1`. Activity detection covers both DOM
  events (mouse/keyboard/touch/wheel) and app-level signals (remote/API
  commands, queue/simulation starts, pairing requests, screen
  navigation) through one small `useEffect` in `App.tsx`. Suppressed
  while the app is "busy" (simulation running, at-gate/waiting-for-
  signal/gate-opening, queue active, or a pairing request is visible),
  and force-dismisses immediately if the app becomes busy while it's
  showing. Renders as a sibling above both the normal and expanded
  (Fullscreen/Camera Mode) layouts, so it works identically in Display
  Mode/Camera Mode. Full spec in `docs/SCREEN_SAVER_SPEC.md`.
- **Small UX fixes requested mid-phase**:
  - Anchor Bounds overlay in Local Mode's Visual QA now defaults to
    **off** (previously left on from an earlier calibration session).
  - Plate Lists' list form gained a **Random Plate Generator** (count,
    digit count, optional prefix) that fills the Plates box with that
    many unique, valid plates — prefixes are sanitized to A–Z0–9 (no
    hyphens, since the app's own plate validation forbids them; the
    example `GE-2323` from the request isn't a valid plate, so the
    generator produces `GE2323`-style plates instead).
  - Plate Lists gained an **ⓘ Format** button next to Import JSON that
    shows the two accepted JSON shapes (single-list vs. collection
    export) inline.
- Minor dedup: the `downloadJSON` helper, previously copy-pasted in
  `ExecutionHistoryPanel.tsx` and `PlateListsPanel.tsx`, moved to
  `apps/web/src/lib/downloadJSON.ts`; the plate-lists/schedules/
  execution-history localStorage key constants were exported from their
  storage modules instead of being re-declared for the backup feature.

### Files Modified

New: `components/controls/{SystemStatusPanel,LocalStorageManagementPanel,
BackupPanel,ScreenSaverSettingsPanel}.tsx`,
`features/screensaver/useScreenSaver.ts`,
`components/screensaver/ScreenSaverOverlay.tsx`,
`features/backup/localBackup.ts`, `lib/downloadJSON.ts`,
`features/lists/randomPlateGenerator.ts`, `vite-env.d.ts`,
`docs/{SCREEN_SAVER_SPEC,DEMO_CHECKLIST,OPERATIONS_GUIDE}.md`.
Modified: `screens/SettingsScreen.tsx`, `App.tsx`,
`components/controls/{ExecutionHistoryPanel,PlateListsPanel}.tsx`,
`features/lists/plateListStorage.ts`,
`features/scheduler/schedulerStorage.ts`,
`features/history/executionHistoryStorage.ts` (exported their
`STORAGE_KEY` consts), `hooks/usePersistentAppScreen.ts` (exported its
storage key), `docs/{APP_NAVIGATION_SPEC,MANUAL_TESTING_GUIDE,PROGRESS,
README,DOCKER_SETUP}.md`.

### Decisions

- Backend status is checked on-demand (a button), not polled — avoids
  adding a new always-on listener for a "nice to have" status field.
- Backup import overwrites via direct localStorage writes + page reload
  rather than adding a bulk-import API to each feature hook — simpler
  and safer, matches the phase's "no big refactor" constraint.
- Screen Saver's idle tick runs every 5s (not real-time) — negligible
  lag against a multi-minute timeout, keeps the implementation simple.
- Random plate generator sanitizes prefixes to A–Z0–9 rather than
  accepting the hyphenated example from the request verbatim, since
  hyphens are already invalid everywhere else in the app (plate
  validation, queue parsing) — introducing an exception here would have
  been inconsistent.

### Manual Testing

Scripted Playwright pass (not committed) covering all 23 requested
scenarios plus the mid-phase additions: Settings opens, System Status
shows data with no API key visible, Export Backup produces a valid,
secret-free JSON, every reset button confirms before acting (verified
by cancelling and by accepting), App Preferences reset returns to Home,
Screen Saver Settings reset restores defaults, Remote Pairings reset
doesn't crash, Local/Display/Controller Mode and Camera Mode all still
work, Screen Saver settings persist across reload, activates after a
real 1-minute timeout, stays suppressed for a full timeout window while
the vehicle is `waiting_for_signal`, dismisses on mouse and keyboard,
and — with the Local API listener enabled and a live backend — a `curl
POST /api/simulate` command both dismisses an active Screen Saver and
executes correctly afterward. Overlay content was inspected for
sensitive strings (none found). The Random Plate Generator and Import
Format button were also verified. All scenarios passed, zero console
errors. `pnpm typecheck`, `pnpm --filter web build`, `pnpm build`, and
`docker compose up --build` (containers started, `/health` responded,
frontend served) all clean.

### Known Limitations

- System Status's backend section requires a manual "Check Backend
  Status" click — it does not auto-refresh.
- Screen Saver's idle-check has up to ~5s of lag against the configured
  timeout.
- `subtle_gradient` and `moving_logo` Screen Saver styles are
  implemented but less visually tuned than the default `floating_plate`.
- Local Backup import is an all-or-nothing overwrite (Plate Lists +
  Scheduler + Execution History + preferences + Screen Saver together)
  — there's no selective/partial import.

### Bugs/Risks

None found beyond the pre-existing status-chip issue already fixed in
the prior UI Polish phase. No regressions detected in Local/Display/
Controller/Settings/Pairing/Remote commands/Plate Lists/Scheduler/
Execution History/Camera Mode/Fullscreen during this phase's QA pass.

### Next Steps

- Consider auto-refreshing System Status's backend section on an
  interval if it turns out to be useful during real demos.
- If selective backup import (e.g. "only Plate Lists") is ever needed,
  it would build on the same `parseLocalBackup`/`applyLocalBackup`
  primitives.
