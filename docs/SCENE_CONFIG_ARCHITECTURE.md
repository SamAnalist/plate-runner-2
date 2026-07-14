# Plate Runner — Per-Scene Configuration Architecture

Version: 1.0 | Date: 2026-07-14

Implemented in Phase 1.5.

---

## 1. Overview

Each `DetectorPlacement` now has its own `SceneRenderConfig` file that specifies:

- Vehicle motion: spawn point, reading position, gate T, deceleration zone, and the **X path** (xFar → xNear)
- Gate: depth t, explicit post X (for diagonal scenes), arm direction, open/close angles

This replaces the previous approach of deriving X paths from `sceneParams.ts` lateral offsets inside `viewMotionPaths.ts`, and gate positions from the global `getDepthValues(gateT).roadRight`.

---

## 2. File Structure

```
renderers/asset-realistic/
  scene-configs/
    types.ts                  ← SceneVehicleMotionConfig, SceneGateConfig, SceneRenderConfig
    getSceneConfig.ts         ← resolver: DetectorPlacement → SceneRenderConfig
    centerFront.config.ts     ← center_front — symmetric, incoming
    centerBack.config.ts      ← center_back  — symmetric, away
    driverFront.config.ts     ← driver_front — diagonal road, incoming
    passengerFront.config.ts  ← passenger_front — offset right, incoming
    driverBack.config.ts      ← driver_back — offset left, away
    passengerBack.config.ts   ← passenger_back — offset right, away
```

---

## 3. Type Definitions

### `SceneVehicleMotionConfig`

| Field         | Type     | Description |
|---------------|----------|-------------|
| `spawnT`      | `number` | t where car first appears at horizon |
| `readingT`    | `number` | t where car stops for plate reading |
| `gateT`       | `number` | t of gate visual placement |
| `decelOffset` | `number` | t-units of deceleration zone before readingT |
| `xFar`        | `number` | Vehicle center X at t≈0 (horizon) |
| `xNear`       | `number` | Vehicle center X at t≈1 (near camera) |

### `SceneGateConfig`

| Field                 | Type                  | Description |
|-----------------------|-----------------------|-------------|
| `t`                   | `number`              | Gate depth value |
| `explicitPostRightX`  | `number \| undefined` | Override gate post X (diagonal scenes) |
| `armDirection`        | `'left' \| 'right'`  | Arm extension direction |
| `openAngleDeg`        | `number`              | Arm rotation when open |
| `closedAngleDeg`      | `number`              | Arm rotation when closed |

### `SceneRenderConfig`

```ts
interface SceneRenderConfig {
  direction: 'incoming' | 'away';
  vehicle: SceneVehicleMotionConfig;
  gate: SceneGateConfig;
}
```

---

## 4. Scene Config Values

| Placement         | dir      | xFar | xNear | gate.t | explicitPostRightX |
|-------------------|----------|------|-------|--------|--------------------|
| `center_front`    | incoming | 400  | 400   | 0.99   | —                  |
| `center_back`     | away     | 400  | 400   | 0.35   | —                  |
| `driver_front`    | incoming | 785  | 382   | 0.99   | ≈666               |
| `passenger_front` | incoming | 392  | 325   | 0.99   | —                  |
| `driver_back`     | away     | 408  | 475   | 0.35   | —                  |
| `passenger_back`  | away     | 392  | 325   | 0.35   | —                  |

**`driver_front` is the only genuinely diagonal scene**: xFar=785 (road center at shifted VP,
upper-right) → xNear=382 (road center at near edge, lower-left). The vehicle sweeps diagonally
across the frame following the DriverFrontScene road geometry.

---

## 5. Data Flow

```
config.detectorPlacement
        │
        ▼
getSceneConfig(placement)  ←  scene-configs/getSceneConfig.ts
        │
        ├─► sceneConfig.gate.t
        │       → activeGateT in SimulationScene
        │       → vehicleBehindGate = vehicleT < activeGateT
        │
        ├─► sceneConfig.gate (SceneGateConfig)
        │       → AssetGate: explicitPostRightX ?? roadRight
        │       → AssetGate: openAngleDeg / closedAngleDeg
        │
        └─► sceneConfig.vehicle.xFar / xNear
                → VIEW_MOTION_PATHS[placement] in viewMotionPaths.ts
                → getViewAwareX(t, placement) → vehicle center X
```

---

## 6. `explicitPostRightX` — When and Why

The global `getDepthValues(t)` uses centered road constants (ROAD_L_NEAR=140, ROAD_R_NEAR=660).
For most scenes this gives the correct gate post X via `roadRight`.

`driver_front` uses a **shifted road VP** (RL_FAR=720, RR_FAR=850) so the road right at t=0.99
is ~666 (vs ~658 from global model). Without an explicit override the gate post would be 8px to
the left of the scene's stop line — visible on close inspection. `explicitPostRightX` corrects this.

If the road geometry in `DriverFrontScene.tsx` ever changes, update `driverFront.config.ts`:

```ts
const DF_GATE_POST_RIGHT_X = Math.round(lerp(DF_RR_FAR, DF_RR_NEAR, INCOMING.gateT));
```

---

## 7. Adding or Modifying a Scene Config

1. Edit `scene-configs/<name>.config.ts`
2. Tune `xFar`/`xNear` for the vehicle X path
3. Set `explicitPostRightX` if the scene road differs from global depth constants
4. Verify gate alignment visually: stop line in scene vs gate post should match
5. No other files need to change — all consumers read through `getSceneConfig()`

---

## 8. Known Limitations

- `getCarScale()` in `VehicleAssetLayer` still uses global `READING_T_INCOMING`,
  `GATE_T`, and `GATE_T_BACK` for scale interpolation. Since all scenes currently
  share the same readingT/gateT values, this is not a problem. If scenes ever need
  different phase timing, `getCarScale` should also be refactored to use `getSceneConfig`.
- `armDirection: 'right'` is typed but not implemented in `AssetGate`. All current
  scenes use `'left'`. Implement when a right-side gate placement is needed.
