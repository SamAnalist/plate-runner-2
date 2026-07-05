# Renderer Architecture — Plate Runner

**Phase:** 0.3 (renderer separation) + 0.4 (asset-based layer)
**Date:** 2026-07-03

---

## 1. Overview

The simulation is split into two independent layers:

```
Simulation Engine   ──►  SimulationScene  ──►  Active Renderer
(useSimulation hook)     (renderer-agnostic)   (pure SVG function)
```

- **Simulation Engine** (`useSimulation`): manages phase transitions, vehicleT, gate open state. Has no knowledge of visual output.
- **SimulationScene**: owns the SVG canvas, renderer selection, focus zone overlay, debug overlay, and status text. Passes a `SceneRendererProps` bundle to the active renderer.
- **Active Renderer**: receives props, draws background + road + vehicle + gate. Nothing else. It does not manage state, phases, or overlays.

---

## 2. Renderer Registry

```ts
// SimulationScene.tsx
const RENDERERS: Record<VisualStyle, React.FC<SceneRendererProps>> = {
  classic:           ClassicSvgRenderer,
  realistic:         RealisticRenderer,
  'gate-camera':     GateCameraRenderer,
  overhead:          OverheadRenderer,
  cinematic:         CinematicRenderer,
  'asset-realistic': AssetRealisticRenderer,
};
```

Active renderer is selected at runtime via `visualStyle` prop (default `'classic'`). Switching renderers is zero-cost — no state is held by individual renderers.

---

## 3. SceneRendererProps Contract

```ts
interface SceneRendererProps {
  config: SimulationConfig;     // plate, vehicleColor, detectorPlacement, gateMode, direction
  vehicleT: number;             // 0–1 animation progress
  vehicleDepth: DepthValues;    // roadWidth, y, scale for current vehicleT
  gateDepth: DepthValues;       // roadWidth, y, scale at GATE_T (constant)
  gateOpen: boolean;            // drives gate arm animation
  phase: SimulationPhase;       // idle | running | at_gate | done
  vehicleBehindGate: boolean;   // controls Z-order of gate vs vehicle
}
```

Renderers must not consume or import from the simulation hook directly.

---

## 4. What Stays in SimulationScene (Renderer-Agnostic)

| Element | Why Not In Renderer |
|---|---|
| `FocusZoneOverlay` | Used for calibration regardless of visual style |
| `DebugOverlay` | Debug data is engine-level, not visual-style-level |
| Status text (READY, WAITING FOR SIGNAL, VEHICLE PASSED) | Semantic UI, independent of visual theme |
| Camera mode suppression | A display mode flag, not a renderer concern |

---

## 5. Asset-Based Renderer Layer (Phase 0.4)

`AssetRealisticRenderer` introduces a sub-architecture within the renderer:

```
AssetRealisticRenderer
│
├── Environment (inline SVG): concrete wall, asphalt, road, centre dashes
│
├── AssetGate (inline component)
│     ├── Post: gunmetal body, bolt details, base plate
│     ├── Status LED (green open / red closed)
│     └── Arm: yellow/black safety stripes — Framer Motion rotate animation
│
└── VehicleAssetLayer
      ├── Ground shadow ellipse
      ├── Perspective transform group
      │     translate(pivot) · skewX(deg) · translate(-pivot) · translate(carX,carY) · scale(scaleX,scaleY)
      │
      ├── Car body asset
      │     ASSET_REGISTRY[viewKey].render(palette)   ← SVG prototype today
      │     <image href={src} .../>                    ← raster PNG/WebP in future
      │
      └── DynamicPlateOverlay
            anchorToLocalRect(anchor, carLW, carLH)   ← percentage → pixels
            <LicensePlate text={config.plate} .../>   ← safe SVG text, never HTML
```

### Key invariant

The car body asset **must never include a license plate**. The `DynamicPlateOverlay` is the single path through which plate text is rendered, ensuring:

1. Sanitisation rules (A-Z 0-9, max 12 chars, uppercase) are always applied by `LicensePlate`.
2. Plate text is never baked into a static image or SVG file.
3. Swapping the car asset (SVG → PNG) has zero effect on plate rendering.

---

## 6. Depth Model

All renderers share the same depth utilities from `utils/depth.ts`:

| Constant / Function | Value |
|---|---|
| `SCENE_W` | 800 |
| `SCENE_H` | 500 |
| `VP_X` | 400 (vanishing point X) |
| `VP_Y` | 145 (vanishing point Y) |
| `GATE_T` | 0.72 |
| `CAR_LW` | 100 (car local width) |
| `CAR_LH` | 72 (car local height) |
| `getDepthValues(t)` | `{ roadWidth, y, scale }` at position t |
| `getVehicleX(t, placement)` | scene X of vehicle centre |
| `getSkewDeg(placement)` | skewX degrees for driver/passenger angles |
| `isFrontView(placement)` | whether front or rear asset is used |

---

## 7. Animation

All gate arm animation uses **Framer Motion**:

```tsx
<motion.g
  style={{ transformOrigin: `${pivotX}px ${pivotY}px` }}
  animate={{ rotate: gateOpen ? -76 : 0 }}
  transition={{ duration: 0.85, ease: [0.4, 0, 0.2, 1] }}
>
```

Gate arm rotation is the only animated element in the renderers. Vehicle movement is driven by `vehicleT` — a value updated by `useSimulation`, not by Framer Motion.

---

## 8. SVG Gradient ID Namespacing

Each renderer prefixes its gradient and pattern IDs to avoid collisions when multiple renderer SVGs coexist in the DOM (e.g., dual-pane comparison views):

| Renderer | Prefix |
|---|---|
| ClassicSvgRenderer | `cls` |
| RealisticRenderer | `rl` |
| GateCameraRenderer | `gc` |
| OverheadRenderer | `ov` |
| CinematicRenderer | `cn` |
| AssetRealisticRenderer | `ar` |

---

## 9. Extension Points

- **New visual style**: add to `VisualStyle` union, add label to `VISUAL_STYLE_LABELS`, add entry to `RENDERERS` record, create `MyRenderer.tsx` implementing `SceneRendererProps`.
- **New car view**: add to `AssetViewKey`, add `AssetEntry` to `ASSET_REGISTRY`, add `PlateAnchor` to `PLATE_ANCHORS`.
- **New vehicle color**: add to `CAR_PALETTES` in `types.ts`.
- **Raster asset swap**: update `ASSET_REGISTRY[viewKey]` to `{ type: 'raster', src, naturalW, naturalH }`.
