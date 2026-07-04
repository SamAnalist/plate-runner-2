# Visual Redesign — Renderer Architecture

**Phase 0.3 — 2025-07-03**

---

## 1. Overview

Phase 0.3 introduces a pluggable renderer architecture for the simulation scene.
Instead of a single monolithic `SimulationScene` component, the scene is now split into:

- A **renderer selector** in `SimulationScene.tsx` that picks the active renderer.
- Five **renderer components**, each in its own file inside `renderers/`.
- A **shared props interface** (`SceneRendererProps`) so renderers are swappable.

The renderer handles: background, road, vehicle, gate, and any renderer-specific overlays.
The host (`SimulationScene`) handles: focus zone overlay, debug overlay, status text, and calibration banner — these are renderer-agnostic.

---

## 2. File Structure

```
apps/web/src/components/simulation/
├── renderers/
│   ├── types.ts                  — VisualStyle type, VISUAL_STYLE_LABELS, SceneRendererProps
│   ├── ClassicSvgRenderer.tsx    — Original look, reuses Road/Vehicle/Gate
│   ├── RealisticRenderer.tsx     — Parking garage aesthetic, yellow lines, inline car/gate
│   ├── GateCameraRenderer.tsx    — CCTV security camera view, scan overlay
│   ├── OverheadRenderer.tsx      — Bird's eye top-down lane view
│   └── CinematicRenderer.tsx     — Night cinematic scene, stars, headlight glow
├── SimulationScene.tsx           — Host: renderer selector + shared overlays
├── Vehicle.tsx                   — UNCHANGED
├── Road.tsx                      — UNCHANGED
├── Gate.tsx                      — UNCHANGED
└── LicensePlate.tsx              — UNCHANGED (never modify)
```

---

## 3. Renderer Descriptions

### Classic SVG (`classic`)

**What it is:** The original Phase 0.1/0.2 look. Dark navy sky gradient, blue-grey background, standard road with white edge lines.

**Components reused:** `Road`, `Vehicle`, `Gate` — imported as-is.

**Pros:**
- Proven stable. All depth math tested against this view.
- Highest contrast against plate text.
- Fast render (no custom SVG paths).

**Cons:**
- Not realistic enough for demo presentations.

**Legibility rating:** Excellent. Recommended default.

---

### Realistic 2D (`realistic`)

**What it is:** Parking entrance environment. Concrete wall top, dark asphalt floor. Yellow edge lines instead of white. Inline car and gate with richer detail.

**Components reused:** `LicensePlate` only. Car and gate are rendered inline with improved SVG.

**Pros:**
- More realistic parking facility look.
- Useful for management demos.
- Yellow lines match real parking garages.

**Cons:**
- Inline car SVG diverges from Vehicle.tsx — must be kept in sync manually if Vehicle.tsx changes.

**Legibility rating:** Very good. Yellow lines may add slight visual noise but plate remains clear.

---

### Gate Camera (`gate-camera`) — PRIMARY OCR STYLE

**What it is:** CCTV security camera simulation. Concrete wall, dark asphalt. Camera UI overlay (CAM-01 label, timestamp, REC indicator with pulsing animation, resolution badge, corner viewfinder brackets). When `phase === 'at_gate'`, a green scan box with corner brackets and "READING..." label appears around the plate.

**Components reused:** `Vehicle`, `Gate` — imported as-is.

**Pros:**
- Most realistic representation of what an OCR camera actually sees.
- Scan overlay provides visual confirmation of plate detection zone.
- Pulsing REC indicator adds realism for recordings.
- Useful for camera calibration testing workflows.

**Cons:**
- Camera UI text overlay adds visual elements not in the physical scene.
- Timestamp is static (hardcoded hint, not a live clock).

**Legibility rating:** Excellent. Recommended for OCR testing and camera-facing setups.

---

### Overhead 2.5D (`overhead`)

**What it is:** Top-down bird's eye view. Completely separate coordinate system — does not use the perspective depth model. Lane runs vertically down the center. Gate arm sweeps horizontally from the right edge of the lane.

**Components reused:** None (all inline). Uses `lerp` and `GATE_T` from depth.ts for Y-axis mapping.

**Pros:**
- Unique perspective for debugging vehicle positioning.
- Clear lane/gate relationship visualization.
- Useful for explaining detector placement to non-technical stakeholders.

**Cons:**
- Plate text is not visible (plate shown as a white indicator bar only).
- Vehicle position mapping uses a simplified linear interpolation, not the full perspective model.
- Not suitable for OCR camera use.

**Legibility rating:** N/A — plate not rendered in detail. Debug/demo use only.

---

### Cinematic Night (`cinematic`)

**What it is:** Night scene with near-black sky, hardcoded stars, amber horizon glow, city silhouette buildings, dark wet asphalt. Headlight or taillight glow ellipses render depending on front/rear view. Stronger vignette.

**Components reused:** `Vehicle`, `Gate` — imported as-is.

**Pros:**
- Visually impressive for demos and presentations.
- Headlight/taillight glow adds depth cues.
- Works well at night or in low-light testing environments.

**Cons:**
- Dark road may reduce contrast for very dark vehicle colors (black car on black asphalt).
- Not recommended for primary OCR testing.

**Legibility rating:** Good for white/light plates. Reduced for dark vehicles against dark road.

---

## 4. Recommendations

| Use Case                        | Recommended Style   |
|---------------------------------|---------------------|
| Default / everyday use          | `classic`           |
| OCR camera calibration          | `gate-camera`       |
| Realistic demo to management    | `realistic`         |
| Debugging vehicle positioning   | `overhead`          |
| Presentation / showcase video   | `cinematic`         |

**Gate Camera** is the recommended primary style for any work involving actual cameras pointed at the screen.
**Classic** remains the default because it has been validated against the full depth model across all phases.

---

## 5. SceneRendererProps Contract

```ts
export interface SceneRendererProps {
  config: SimulationConfig;      // plate, gateMode, vehicleColor, detectorPlacement, direction
  vehicleT: number;              // 0.0–1.0 depth position
  vehicleDepth: DepthValues;     // precomputed depth for vehicleT
  gateDepth: DepthValues;        // precomputed depth for GATE_T (constant)
  gateOpen: boolean;
  phase: SimulationPhase;        // 'idle' | 'running' | 'at_gate' | 'done'
  vehicleBehindGate: boolean;    // vehicleT < GATE_T — controls Z-order
}
```

All renderers receive the same props. Renderers that do not use perspective (e.g. OverheadRenderer) ignore `vehicleDepth` and `gateDepth` but still receive them for API consistency.

---

## 6. What Was Preserved

- `LicensePlate.tsx` — never modified.
- `Vehicle.tsx`, `Road.tsx`, `Gate.tsx` — never modified. Reused as-is in ClassicSvgRenderer, GateCameraRenderer, and CinematicRenderer.
- `FocusZoneOverlay` and `DebugOverlay` — remain in `SimulationScene` as renderer-agnostic overlays.
- All depth math (`depth.ts`) — unchanged.
- All simulation state (`useSimulation.ts`) — unchanged.
- `getPlateSceneRect` used by GateCameraRenderer for the scan box.

---

## 7. What Still Needs Improvement

- **OverheadRenderer plate rendering:** The plate is shown as a white bar, not the actual plate text. A future iteration could render the plate text in overhead space using a separate coordinate transform.
- **RealisticRenderer car sync:** The inline car SVG in RealisticRenderer will drift from Vehicle.tsx if Vehicle.tsx is updated. Consider extracting car body shapes into a shared sub-module.
- **GateCameraRenderer timestamp:** The timestamp is a hardcoded display string. A future iteration could use a live clock if desired (requires careful consideration of server vs client time for reproducibility).
- **CinematicRenderer dark cars:** Black vehicles on the dark cinematic road have reduced contrast. A subtle outline or rim light could improve legibility.
- **SVG gradient ID collisions:** Each renderer defines its own gradient IDs with unique prefixes to avoid SVG `<defs>` conflicts when multiple renderers are ever shown simultaneously. However, if two instances of the same renderer are rendered at once, IDs would collide. This is not an issue in the current single-scene layout.
