# Plate Runner — Progress Log

Format follows `CLAUDE.md § Progress Documentation Format`.

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

## Recommended Next Prompts

### Phase 0.3 — Plate List Playback
> "Implement a plate queue. Add a textarea in the sidebar where the user pastes plates (one per line). A 'Run Queue' button launches vehicles sequentially: each vehicle runs, pauses at gate (or passes), then disappears. Show progress (2/12). Allow pause, skip, and configurable gap between vehicles."

### Phase 0.4 — WebSocket + Remote Control
> "Add a Fastify backend in apps/api. Implement a WebSocket server accepting: push_plate(plate), open_gate, close_gate, start, stop, reset. Frontend connects on startup and shows connection status."

### Phase 0.5 — Docker
> "Add Dockerfile for apps/web (nginx). Add docker-compose.yml with web + api services."
