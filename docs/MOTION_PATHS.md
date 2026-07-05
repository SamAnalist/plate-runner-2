# View-Aware Motion Paths — Plate Runner

**Phase:** 0.7 — View-Aware Motion Paths
**Date:** 2026-07-05

---

## 1. Problem

The standard depth model (`depth.ts`) places all vehicles along a centred
perspective axis. The road centre X is **always 400** (half of SCENE_W=800),
regardless of depth t. The only lateral offset for driver/passenger views was
`±10% of roadWidth`, giving a maximum of ~28px at the gate position — barely
perceptible as a diagonal.

When a photorealistic 3/4-angle asset is shown, the image clearly depicts the
vehicle from an angled camera. But because the movement was almost purely vertical
(Y only), the result looked like a photograph of a car moving straight toward the
camera — the asset composition contradicted the motion trajectory.

---

## 2. Why Asset Image Alone Is Not Enough

The asset image captures a static perspective angle. The simulation _movement_
must reinforce that angle by sweeping the vehicle laterally across the scene
as it approaches or recedes.

Without lateral motion:
- The image says "camera is to my left"
- The motion says "car is coming straight at you"
- Result: visually incoherent

With view-aware lateral motion:
- The image says "camera is to my left"
- The motion says "car is sweeping right-to-left as it approaches the left-side camera"
- Result: physically believable

---

## 3. Model: Far / Read / Exit

Each placement has a `ViewMotionPath { xFar, xNear }`:

| Point  | t value       | Description                          |
|--------|---------------|--------------------------------------|
| Far    | t ≈ 0.04      | Vehicle appears at vanishing depth   |
| Read   | t ≈ 0.46      | Reading/gate approach position       |
| Gate   | t = GATE_T (0.52) | Gate position                    |
| Exit   | t ≈ 0.96      | Vehicle exits scene                  |

Y and scale at all points come from `getDepthValues(t)` unchanged. Only X is
overridden by `getViewAwareX(t, placement)`.

---

## 4. Path Values By Placement

SCENE: W=800, H=500. VP_X=400 (road centre, always constant).

| Placement       | xFar  | xNear | Lateral dir | x at gate (t=0.52) | Diagonal? |
|-----------------|-------|-------|-------------|---------------------|-----------|
| center_front    | 400   | 400   | none        | 400                 | No        |
| center_back     | 400   | 400   | none        | 400                 | No        |
| driver_front    | 408   | 475   | RIGHT →     | ≈ 460               | Yes       |
| driver_back     | 408   | 475   | RIGHT →     | ≈ 460               | Yes       |
| passenger_front | 392   | 325   | LEFT ←      | ≈ 340               | Yes       |
| passenger_back  | 392   | 325   | LEFT ←      | ≈ 340               | Yes       |

**Camera-side logic:**
- `driver_front/back`: camera is to the LEFT of the lane. The vehicle appears
  to be to the RIGHT of the camera's axis, so it sweeps rightward as it
  approaches. The driver_front asset image (shot from the left) confirms this.
- `passenger_front/back`: mirror — camera to the RIGHT, vehicle sweeps LEFT.

**Road boundary check at gate (t=0.52):**
- roadWidth(0.52) ≈ 270, carW = 270 × 0.62 ≈ 167, halfW ≈ 83
- driver: x=460, car spans [377, 543], road right=540. 3px margin.
- passenger: x=340, car spans [257, 423], road left=260. Within bounds.

---

## 5. Easing

Lateral X uses `easeOut(t) = 1 − (1−t)²`:
- The car sweeps quickly at the start (small t, car is tiny/far)
- Decelerates toward the gate reading position
- The plate is stable and legible during `at_gate` / `wait_for_signal`

Y and scale use the existing `Math.pow(t, 0.8)` non-linear scale from depth.ts.

---

## 6. Direction Handling

`getViewAwareX(t, placement)` is **direction-agnostic**. The simulation's
`vehicleT` naturally:
- increases (0→1) for `incoming` — car sweeps from xFar toward xNear
- decreases (1→0) for `away` — car sweeps from xNear back toward xFar

Both directions feel physically consistent with the lateral path.

---

## 7. Reading Position Stability

When the vehicle is frozen at `READING_T_INCOMING ≈ 0.46` or
`READING_T_AWAY ≈ 0.58`, the view-aware X is:
- driver at 0.46: easeOut(0.46) ≈ 0.73 → x ≈ 449
- driver at 0.58: easeOut(0.58) ≈ 0.82 → x ≈ 455

The lateral position is fully stable — `vehicleT` is a constant so X does not
change while frozen. The plate stays in the focus zone.

---

## 8. Gate Alignment

The gate post sits at `roadRight(GATE_T) ≈ 540` (right edge of road).
The arm extends LEFT across the full road width.

At GATE_T (t=0.52):
- center cars: x=400, arm spans [270, 540] → car well under arm ✓
- driver cars:  x=460, arm still covers from 270 → car (right edge ≈543) ✓
- passenger cars: x=340, arm covers from 270 → car (left edge ≈257) — marginal
  but visually acceptable (arm covers nearly the whole road)

No gate position changes were needed — the arm covers the full road width.

---

## 9. How to Test Diagonal Motion

1. `pnpm dev` → `localhost:5173`
2. Select **Asset Realistic** visual style
3. Select **driver_front** placement → press **Start**
   - Watch the vehicle sweep from slightly left-of-centre toward the RIGHT as it approaches
   - The car should appear clearly diagonal, not purely vertical
4. Select **passenger_front** → press **Start**
   - Mirror of step 3 — sweeps LEFT
5. Repeat for **driver_back** and **passenger_back**
6. Verify `center_front` and `center_back` remain vertical (no lateral drift)
7. Test direction **Away** for each placement — lateral motion reverses

### Using the Motion Path overlay

Visual QA section → **◈ Motion path: ON**

Shows the yellow dashed trajectory curve with key points:
- FAR (blue): vanishing depth
- READ (cyan): reading/gate approach position
- GATE (red): gate position
- EXIT (white): exit depth
- Magenta dot: current vehicleT position

---

## 10. Known Limitations

- The **readability focus zone** (`getPlateReadability`) still uses
  `getVehicleX()` from `depth.ts` (centred axis). For 3/4 views the plate X
  in scene space now differs by up to ~60px. This causes minor inaccuracy in
  the GOOD/PARTIAL/POOR overlap percentage displayed in the header badge.
  Acceptable for this phase; a `getViewAwarePlateReadability()` function should
  be added before camera-hardware readability testing.

- The `driver_front` and `driver_back` paths are currently identical; same for
  `passenger_front/back`. Future real-camera analysis may find these need
  independent tuning. The registry (`VIEW_MOTION_PATHS` in `viewMotionPaths.ts`)
  supports independent values per key.

- Path values are currently symmetric (driver and passenger are mirror-equal).
  If the physical camera mounting positions differ between front and rear
  installations, independent calibration will be needed.

---

## 11. File Reference

| File | Purpose |
|------|---------|
| `apps/web/src/components/simulation/renderers/asset-realistic/viewMotionPaths.ts` | Path registry, `getViewAwareX()`, POV functions, debug data |
| `apps/web/src/components/simulation/renderers/asset-realistic/VehicleAssetLayer.tsx` | Uses `getViewAwareX`, `getPovOpacity`, `getPovYOffset` |
| `apps/web/src/components/simulation/renderers/asset-realistic/AssetRealisticRenderer.tsx` | `MotionPathDebugOverlay` component |
| `apps/web/src/hooks/useSimulation.ts` | `startT` values updated for POV |
| `apps/web/src/utils/depth.ts` | Unchanged — `getVehicleX` still used by all other renderers |

---

## 12. Phase 0.8 — POV Entry/Exit Improvement

**Date:** 2026-07-05

### Problem

Before Phase 0.8, the simulation started the vehicle already visible at t=0.04 (near the vanishing point) and ended it abruptly at t=0.98 (car still fully on screen). This broke the illusion that the vehicle was driving through a real camera's field of view.

### Solution

Two functions in `viewMotionPaths.ts` control POV behaviour:

#### `getPovOpacity(t)`

```
t ∈ [0, POV_SPAWN_T]   →  linear 0 → 1  (fade in from horizon)
t ∈ [POV_SPAWN_T, POV_EXIT_T]  →  1.0  (fully visible)
t ∈ [POV_EXIT_T, 1.0]  →  linear 1 → 0  (fade out as car exits frame)
```

#### `getPovYOffset(t, depthY, carH)`

```
t < POV_SPAWN_T:
  progress = t / POV_SPAWN_T
  yOffset  = lerp(-(depthY + 1), 0, progress)
  → car slides from just above the horizon down to its normal position

t > POV_EXIT_T:
  progress = (t − POV_EXIT_T) / (1 − POV_EXIT_T)
  yOffset  = lerp(0, SCENE_H + 10 − (depthY − carH), progress)
  → car slides off the bottom of the scene until fully off-screen

otherwise: 0
```

### Key Constants

| Constant | Value | Meaning |
|---|---|---|
| `POV_SPAWN_T` | 0.07 | Vehicle fully visible from this depth onward |
| `POV_EXIT_T`  | 0.90 | Vehicle begins leaving scene at this depth |
| `startT('incoming')` | 0.0 | Simulation starts before vehicle is on screen |
| `startT('away')` | 1.0 | Simulation starts below the visible frame |
| away done condition | t ≤ 0.02 | Stops after opacity ≈ 0 at horizon |

### Direction Handling

Both functions are direction-agnostic. For `away` (t: 1 → 0):
- The exit zone (t > 0.90) fires at the start of the run: car enters from below the scene.
- The spawn zone (t < 0.07) fires at the end: car dissolves into the horizon distance.

### Debug Overlay Changes

The `MotionPathDebugOverlay` SAMPLE_T now includes t=0.00 (FAR), t=0.07 (SPAWN, yellow dot), t=0.90 (EXIT, white dot). SPAWN and EXIT key points are labelled and distinctly coloured so the POV transition zones are immediately visible in Visual QA.
