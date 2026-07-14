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
