# Plate Runner — Scene Variants Architecture

Version: 1.0 | Date: 2026-07-05

This document describes the scene variants system introduced in Phase 1.3.

---

## 1. Overview

The `AssetRealisticRenderer` delegates background rendering to a **scene variant**
selected from the active `DetectorPlacement`. This allows each camera POV to have a
physically appropriate environment rather than a single generic background.

---

## 2. Scene Variant Mapping

| Placement             | Scene              | Visual Character                      |
|-----------------------|--------------------|---------------------------------------|
| `center_front`        | `CenterFrontScene` | Parking entry — camera outside        |
| `center_back`         | `CenterBackScene`  | Parking exit — camera inside          |
| `driver_front`        | `GenericScene`     | Generic parking interior (fallback)   |
| `driver_back`         | `GenericScene`     | Generic parking interior (fallback)   |
| `passenger_front`     | `GenericScene`     | Generic parking interior (fallback)   |
| `passenger_back`      | `GenericScene`     | Generic parking interior (fallback)   |

Selector: `getSceneVariant(placement: DetectorPlacement): SceneVariantKey`
Location: `apps/web/src/components/simulation/renderers/asset-realistic/sceneVariants.ts`

---

## 3. File Structure

```
renderers/asset-realistic/
  sceneVariants.ts             ← selector function
  scenes/
    CenterFrontScene.tsx       ← parking entry environment
    CenterBackScene.tsx        ← parking exit environment
    GenericScene.tsx           ← generic fallback (driver/passenger)
  AssetRealisticRenderer.tsx   ← orchestrator: defs + scene + gate + vehicle
```

---

## 4. Ceiling Geometry Derivation

All scenes that render a ceiling use this derivation to keep perspective consistent
with the road polygon.

The road edges follow these lines (parametric by depth `t ∈ [0,1]`):
```
Left edge:  x = lerp(RL_FAR=390, RL_NEAR=140, t)   y = lerp(VP_Y=145, SCENE_H=500, t)
Right edge: x = lerp(RR_FAR=410, RR_NEAR=660, t)   y = lerp(VP_Y=145, SCENE_H=500, t)
```

The **ceiling** uses the same x-profile as the road but maps t into the **upper** half:
```
y_ceil(t) = lerp(VP_Y=145, 0, t)
```

This gives:
```
Ceiling left edge:   (RL_FAR=390, VP_Y=145) → (RL_NEAR=140, y=0)
Ceiling right edge:  (RR_FAR=410, VP_Y=145) → (RR_NEAR=660, y=0)
```

Resulting panels:
```
Ceiling overhead:  (140,0)→(660,0)→(410,145)→(390,145)   width 520px→20px
Left wall panel:   (0,0)→(140,0)→(390,145)→(0,145)
Right wall panel:  (660,0)→(800,0)→(800,145)→(410,145)
```

---

## 5. Shared SVG Defs

`AssetRealisticRenderer` defines these IDs, available to all scene components:

| ID            | Type      | Purpose                          |
|---------------|-----------|----------------------------------|
| `#arAsphalt`  | `pattern` | Road surface horizontal texture  |
| `#arVignette` | `radialGradient` | Radial vignette overlay   |

Each scene may define its own private defs with unique prefixed IDs
(`cf*` for CenterFront, `cb*` for CenterBack, `gs*` for Generic) to avoid
collisions in the SVG document.

---

## 6. Adding a New Scene Variant

To add a new scene (e.g., `driver_front`):

1. Create `scenes/DriverFrontScene.tsx` — self-contained SVG composition
2. Add `'driver_front'` to `SceneVariantKey` union in `sceneVariants.ts`
3. Add case in `getSceneVariant()` switch
4. Import and render in `AssetRealisticRenderer.tsx` scene selection block
5. Update this document

Scenes must:
- Not define `<svg>` — they render as SVG fragments inside the parent SVG
- Use unique def IDs (prefixed to avoid collision)
- Import road/depth constants from `../../../../utils/depth`
- Reference `#arAsphalt` and `#arVignette` from shared defs

---

## 7. Visual Design Reference

### CenterFrontScene

Camera: outside parking facility, looking inward.
Car direction: `incoming` (car approaches camera).

```
 ╔══════════════════════════════════════════════════════════════╗
 ║  [left wall]  [ ceiling overhead (ENTRADA sign + tubes) ]  [right wall] ║
 ║───────────────────────────────────────────────────────────────║ ← horizon
 ║         [shoulder]   [road + stop line + arrow]   [shoulder]  ║
 ╚══════════════════════════════════════════════════════════════╝
```

- Ceiling: cool concrete grey (#0f1115 → #181c21), 520 px wide at near
- Sign: green #1a5a28, text "ENTRADA"
- Arrow: upward, green tint rgba(180,195,80,0.17)
- Stop line at `GATE_T = 0.52`

### CenterBackScene

Camera: inside parking facility at exit gate, looking outward.
Car direction: `away` (car moves away from camera).

- Ceiling: warm sodium-vapor tone (#13110c → #1e1a13)
- Outdoor glow at horizon center (exit end) — `cbExitGlow` radialGradient
- Sign: amber/red #5c2018, text "SALIDA"
- Arrow: upward, amber tint rgba(200,170,60,0.17)

### GenericScene

Used for all angled (driver/passenger) placements.

- Flat dark concrete wall (#1d2126 → #282c32), three horizontal wall lines
- No structural detail (would not align with angled asset images)
