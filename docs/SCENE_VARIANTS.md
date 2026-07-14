# Plate Runner — Scene Variants Architecture

Version: 2.0 | Date: 2026-07-14

This document describes the scene variants system. Updated in Phase 1.4 to add
dedicated diagonal-POV scenes for all six DetectorPlacement values.

---

## 1. Overview

The `AssetRealisticRenderer` delegates background rendering to a **scene variant**
selected from the active `DetectorPlacement`. This allows each camera POV to have a
physically appropriate environment rather than a single generic background.

The mapping is now 1-to-1: every `DetectorPlacement` has its own scene component.
`getSceneVariant(placement)` simply casts the placement to `SceneVariantKey`.

---

## 2. Scene Variant Mapping

| Placement             | Scene                  | Direction  | Visual Character                                  | Status   |
|-----------------------|------------------------|------------|---------------------------------------------------|----------|
| `center_front`        | `CenterFrontScene`     | incoming   | Parking entry — camera centered outside           | Approved |
| `center_back`         | `CenterBackScene`      | away       | Parking exit — camera centered inside             | Approved |
| `driver_front`        | `DriverFrontScene`     | incoming   | Parking entry — camera on driver/left side        | New      |
| `passenger_front`     | `PassengerFrontScene`  | incoming   | Parking entry — camera on passenger/right side    | New      |
| `driver_back`         | `DriverBackScene`      | away       | Parking exit — camera on driver/left side         | New      |
| `passenger_back`      | `PassengerBackScene`   | away       | Parking exit — camera on passenger/right side     | New      |

Selector: `getSceneVariant(placement: DetectorPlacement): SceneVariantKey`
Location: `apps/web/src/components/simulation/renderers/asset-realistic/sceneVariants.ts`

---

## 3. File Structure

```
renderers/asset-realistic/
  sceneVariants.ts              ← selector function (1-to-1 mapping)
  scenes/
    CenterFrontScene.tsx        ← parking entry, centered camera
    CenterBackScene.tsx         ← parking exit, centered camera
    DriverFrontScene.tsx        ← parking entry, driver/left side camera  [NEW]
    PassengerFrontScene.tsx     ← parking entry, passenger/right side camera  [NEW]
    DriverBackScene.tsx         ← parking exit, driver/left side camera  [NEW]
    PassengerBackScene.tsx      ← parking exit, passenger/right side camera  [NEW]
    GenericScene.tsx            ← retained for reference (no longer used)
  AssetRealisticRenderer.tsx    ← orchestrator: defs + scene + gate + vehicle
```

---

## 4. Ceiling Geometry Derivation

### Center Scenes (symmetric)

Road edges at horizon: `RL_FAR=390`, `RR_FAR=410`.
Ceiling near edges: `CL_NEAR_X=140` (left), `CR_NEAR_X=660` (right).

```
Ceiling overhead:  (140,0)→(660,0)→(410,145)→(390,145)   — 520px→20px symmetric
Left wall panel:   (0,0)→(140,0)→(390,145)→(0,145)
Right wall panel:  (660,0)→(800,0)→(800,145)→(410,145)
```

### Diagonal Scenes (asymmetric near edge)

Road far edges stay the same (RL_FAR=390, RR_FAR=410) — road and ceiling agree at
the horizon for visual continuity. The asymmetry comes from the **near** ceiling edge.

**Driver-side scenes** (camera on LEFT wall):
```
CL_NEAR_X = 60     (camera close to left wall — thin near-left ceiling edge)
CR_NEAR_X = 660    (standard right extent)

Ceiling:      (60,0)→(660,0)→(410,145)→(390,145)   — wide right, narrow left
Left wall:    (0,0)→(60,0)→(390,145)→(0,145)        — thin near wedge
Right wall:   (660,0)→(800,0)→(800,145)→(410,145)  — full panel
```

**Passenger-side scenes** (camera on RIGHT wall):
```
CL_NEAR_X = 140    (standard left extent)
CR_NEAR_X = 740    (camera close to right wall — thin near-right ceiling edge)

Ceiling:      (140,0)→(740,0)→(410,145)→(390,145)  — wide left, narrow right
Left wall:    (0,0)→(140,0)→(390,145)→(0,145)       — full panel
Right wall:   (740,0)→(800,0)→(800,145)→(410,145)  — thin near wedge
```

### Ceiling depth grid lines (parametric)

For any scene, at depth `t ∈ [0,1]` the ceiling left/right edges are:
```
lx(t) = lerp(RL_FAR, CL_NEAR_X, t)
rx(t) = lerp(RR_FAR, CR_NEAR_X, t)
```

This drives the horizontal depth grid lines at t = 0.25, 0.50, 0.75.

---

## 5. Shared SVG Defs

`AssetRealisticRenderer` defines these IDs, available to all scene components:

| ID            | Type             | Purpose                          |
|---------------|------------------|----------------------------------|
| `#arAsphalt`  | `pattern`        | Road surface horizontal texture  |
| `#arVignette` | `radialGradient` | Radial vignette overlay          |

Each scene defines its own private defs with unique prefixed IDs to avoid
SVG-document collisions:

| Prefix | Scene                 |
|--------|-----------------------|
| `cf*`  | CenterFrontScene      |
| `cb*`  | CenterBackScene       |
| `df*`  | DriverFrontScene      |
| `pf*`  | PassengerFrontScene   |
| `db*`  | DriverBackScene       |
| `pb*`  | PassengerBackScene    |

---

## 6. Visual Design Reference

### CenterFrontScene (approved)

Camera: outside parking facility, looking inward (incoming direction).

- Ceiling: cool concrete grey (#0f1115 → #181c21), symmetric 520px→20px
- Tube lights: symmetric, centered over lane
- Arrow: green tint, pointing toward VP (into facility)
- Stop line at `GATE_T`
- Archway depth cue at horizon

### CenterBackScene (approved)

Camera: inside parking facility at exit gate, looking outward (away direction).

- Ceiling: warm sodium-vapor (#13110c → #1e1a13), symmetric
- Outdoor daylight glow at horizon center (`cbExitGlow`)
- Arrow: amber tint, pointing toward VP (exit direction)
- Stop line at `GATE_T_BACK`

### DriverFrontScene (new — pending visual verification)

Camera: elevated on driver/left side, looking diagonally inward (incoming).

- Ceiling: cool grey palette matching CenterFrontScene
- Left wall: thin near wedge (CL_NEAR_X=60) — camera close to left wall
- Right wall: full dominant panel
- Tube lights: near ends swept LEFT (toward camera)
- Near-camera pillar: structural column detail on left edge (x=0–16)
- Floor pools: shifted left (cx≈320–330)
- Arrow: green tint at road center
- Stop line at `GATE_T`

### PassengerFrontScene (new — pending visual verification)

Camera: elevated on passenger/right side, looking diagonally inward (incoming).
Mirror of DriverFrontScene.

- Right wall: thin near wedge (CR_NEAR_X=740) — camera close to right wall
- Left wall: full dominant panel
- Tube lights: near ends swept RIGHT
- Near-camera pillar: right edge column (x=784–800)
- Floor pools: shifted right (cx≈470–490)
- Stop line at `GATE_T`

### DriverBackScene (new — pending visual verification)

Camera: elevated on driver/left side, looking at exiting cars (away).
Same geometry as DriverFrontScene, warm amber palette.

- Ceiling: warm sodium-vapor matching CenterBackScene
- Outdoor daylight glow at horizon (`dbExitGlow`, offset right)
- Arrow: amber tint at road center
- Stop line at `GATE_T_BACK`

### PassengerBackScene (new — pending visual verification)

Camera: elevated on passenger/right side, looking at exiting cars (away).
Mirror of DriverBackScene.

- Same warm amber palette
- Outdoor daylight glow (`pbExitGlow`, offset left)
- Stop line at `GATE_T_BACK`

---

## 7. Gate Integration

The gate component (`AssetGate` in `AssetRealisticRenderer`) is scene-independent.
It is positioned at `roadRight(GATE_T)` for front scenes and `roadRight(GATE_T_BACK)`
for back scenes, derived from the same road geometry all scenes share.

This means gate alignment is consistent across all six scenes without per-scene
configuration.

---

## 8. Adding a New Scene Variant

If a new placement is ever needed:

1. Create `scenes/NewScene.tsx` — self-contained SVG fragment
2. Add key to `SceneVariantKey` union in `sceneVariants.ts`
3. Add case in `getSceneVariant()` (or update the cast if still 1-to-1)
4. Import and render in `AssetRealisticRenderer.tsx` scene block
5. Update this document

Scenes must:
- Not define `<svg>` — render as fragments inside parent SVG
- Use unique def ID prefix to avoid SVG collision
- Import depth constants from `../../../../utils/depth`
- Reference `#arAsphalt` from shared defs

---

## 9. Known Limitations

- Diagonal scenes use the same centered road VP (400) as center scenes. The
  asymmetry is achieved only at the ceiling/wall near edge. A full two-point
  perspective road would require a different depth model and break vehicle
  positioning — not attempted in this phase.
- Gate post is always on roadRight — for diagonal scenes the post may appear
  slightly offset from where a real-world driver-side camera would expect it,
  but it does not block the plate and the visual is acceptable for LPR purposes.
- `GenericScene.tsx` is retained in the filesystem but no longer used. It can
  be deleted once diagonal scenes are verified and approved.
