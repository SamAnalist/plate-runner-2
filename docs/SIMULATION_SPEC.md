# Plate Runner — Simulation Visual Spec

Version: 0.2 | Date: 2025-07-03

This document is the authoritative contract for how the visual simulation must behave.
Any future rendering backend, test harness, or remote controller must satisfy these constraints.

---

## 1. Scene Coordinate System

| Property | Value |
|---|---|
| Internal coordinate space | 800 × 500 (SVG viewBox) |
| Rendering | SVG element, `width="100%"` inside `aspect-ratio: 800/500` container |
| Vanishing point | (400, 145) — horizontal center, ≈29% from top |
| Depth 0 | Near vanishing point — small, high on screen |
| Depth 1 | Near bottom edge — large, low on screen |

---

## 2. Road Geometry

```
Horizon: left=(390, 145)  right=(410, 145)
Bottom:  left=(140, 500)  right=(660, 500)
```

Road width formula: `roadWidth(t) = 20 + 500t`

Lane markings:
- Two solid white edge lines (left & right)
- 9 dashed center-line segments; line width scales with depth

---

## 3. Depth / Perspective Model

```
roadLeft(t)  = lerp(390, 140, t)
roadRight(t) = lerp(410, 660, t)
roadWidth(t) = roadRight(t) − roadLeft(t)  = 20 + 500t
y(t)         = lerp(145, 460, t)
scale(t)     = lerp(0.04, 1.0, t^0.8)   // non-linear
```

---

## 4. Gate

| Property | Value |
|---|---|
| Gate T position | 0.52 |
| Arm rotation closed | 0° (horizontal) |
| Arm rotation open | −76° |
| Open animation | 0.85s, easeInOut (Framer Motion) |
| Post side | Right edge of road |

### Gate Modes (final naming)

| Mode | Value | Behavior |
|---|---|---|
| Auto open | `auto_open` | Arm opens when vehicle is 0.09t ahead of gate |
| Wait for signal | `wait_for_signal` | Vehicle stops at reading position; gate stays closed until signal |
| Hidden | `hidden` | Gate not rendered |

---

## 5. Vehicle

### Dimensions

```
carWidth  = roadWidth(t) × 0.62
carHeight = carWidth × (72 / 100) = carWidth × 0.72
carBottom = y(t)
carTop    = y(t) − carHeight
carCenterX = (roadLeft(t) + roadRight(t)) / 2  [adjusted for detector side]
```

Local coordinate space: 100 × 72

### View by detector placement

| Placement suffix | Car face | Plate |
|---|---|---|
| `_front` | Front fascia, headlights, grille | Front bumper |
| `_back`  | Rear fascia, tail lights, trunk  | Rear bumper  |

### Detector side offset

| Side | X offset | SkewX |
|---|---|---|
| `driver_*`    | +10% of roadWidth | +3° |
| `center_*`    | 0                 | 0   |
| `passenger_*` | −10% of roadWidth | −3° |

---

## 6. License Plate

### Safety rules (MUST be satisfied at all times)

1. Plate text **always** rendered as SVG `<text>` — never as HTML or `innerHTML`.
2. Text validated and normalized to uppercase before display.
3. Only `A–Z` and `0–9` accepted (max 12 characters).
4. Text **always stays within plate rectangle** — guaranteed by `textLength` attribute.

### Plate rect in car local space (100×72)

```
x=29, y=54, width=42, height=13
```

### Font size formula

```
maxByHeight = plateHeight × 0.66
maxByWidth  = (plateWidth × 0.88) / max(1, charCount) / 0.62
fontSize    = min(maxByHeight, maxByWidth)
textLength  = plateWidth × 0.86  (hard clamp via SVG attribute)
lengthAdjust = "spacingAndGlyphs"
```

Font family: `"JetBrains Mono", "Courier New", monospace` (monospace required).

---

## 7. Reading Positions

```
GATE_T              = 0.52  (gate depth)
READING_T_INCOMING  = 0.46  (GATE_T − 0.06)
READING_T_AWAY      = 0.58  (GATE_T + 0.06)
```

### Plate legibility by mode

| Mode | When plate is legible | Duration |
|---|---|---|
| `auto_open` | Brief window as vehicle passes t≈0.46–0.52 | ≈0.5–1.5s at default speed |
| `wait_for_signal` | Vehicle frozen at READING_T | Indefinite until gate opens |
| Calibration | Vehicle frozen at READING_T | Permanent |

**Best practice**: use `wait_for_signal` mode for reliable external camera reads.

---

## 8. Animation

### Vehicle movement

| Direction | Start t | End t |
|---|---|---|
| `incoming` | 0.04 | 0.98 |
| `away`     | 0.96 | 0.04 |

### Speed mapping

```
t-units/second = 0.07 + (speed − 1) × (0.55 / 9)
speed=1  → 0.070 t/s
speed=5  → 0.314 t/s
speed=10 → 0.620 t/s
```

Frame budget: `requestAnimationFrame`, dt clamped to 100ms.

---

## 9. Focus Zone

```typescript
interface FocusZoneConfig {
  enabled: boolean;       // enables readability calculations
  showOverlay: boolean;   // shows visual overlay on scene
  xPercent: number;       // left edge (0–100% of scene width)
  yPercent: number;       // top edge (0–100% of scene height)
  widthPercent: number;
  heightPercent: number;
  borderColor: string;    // CSS hex color
  label: string;          // displayed label (max 24 chars)
}
```

### Default focus zone

Pre-calibrated to capture the plate at reading position for all 6 detector placements:

```
xPercent: 33,  yPercent: 47
widthPercent: 34,  heightPercent: 24
```

Covers plate center at:
- Incoming (t=0.46): (400, 272) → 50% / 54.4%
- Away    (t=0.58): (400, 306) → 50% / 61.2%

### Readability calculation

```
overlapPercent = (plate ∩ focusZone area) / plate area × 100
readability:
  ≥75% → good
  25–74% → partial
  <25% → poor
inZone = overlapPercent ≥ 50%
```

---

## 10. Simulation Phases

| Phase | Description |
|---|---|
| `idle` | Initial / after reset. Vehicle at start position, no animation. |
| `running` | Vehicle animating. Gate logic active. |
| `at_gate` | Vehicle stopped at reading position (wait_for_signal or holdAt()). |
| `done` | Vehicle completed the run. |

---

## 11. App Modes

| Mode | Description |
|---|---|
| `normal` | Standard layout with controls sidebar |
| `fullscreen` | Simulation fills viewport; controls hidden; status badge visible; Esc to exit |
| `camera` | Clean fullscreen; all UI overlays hidden; focus zone shown only if `showOverlay`; minimal exit |
| Calibration | Overlay on normal mode; vehicle frozen at reading_t; quick plate tests |

---

## 12. Manual Test Matrix

2 directions × 6 detector placements = 12 canonical test cases.

| # | Direction | Placement | Expected car face | Expected plate side |
|---|---|---|---|---|
| 1  | incoming | center_front    | Front, centered | Front plate, center |
| 2  | incoming | driver_front    | Front, shifted right, +skew | Front plate, slightly right |
| 3  | incoming | passenger_front | Front, shifted left, −skew | Front plate, slightly left |
| 4  | incoming | center_back     | Rear, centered | Rear plate, center |
| 5  | incoming | driver_back     | Rear, shifted right | Rear plate, slightly right |
| 6  | incoming | passenger_back  | Rear, shifted left | Rear plate, slightly left |
| 7  | away     | center_front    | Front, centered, shrinking | Front plate, center |
| 8  | away     | driver_front    | Front, shifted right, shrinking | Front plate |
| 9  | away     | passenger_front | Front, shifted left, shrinking | Front plate |
| 10 | away     | center_back     | Rear, centered, shrinking | Rear plate, center |
| 11 | away     | driver_back     | Rear, shifted right, shrinking | Rear plate |
| 12 | away     | passenger_back  | Rear, shifted left, shrinking | Rear plate |

**Known adjustment needed**: In cases 4–6 and 10–12 (back placements), the rear plate
is visible while the car is either approaching or going away. Verify that the plate is legible
from external camera at the reading position.

---

## 13. Plate Validation Rules

Implemented in `packages/shared/src/validators/plate.ts`:

| Rule | Constraint |
|---|---|
| No empty | `input.trim().length > 0` |
| Normalize | `toUpperCase()` before validate |
| Charset | `/^[A-Z0-9]+$/` |
| Max length | 12 characters |

---

## 14. Rendering Safety Rules

1. **No HTML rendering of plate text.** SVG `<text>` only.
2. **No `dangerouslySetInnerHTML`** anywhere in simulation components.
3. **Plate text is plain data**, not code or markup.
4. `textLength` + `lengthAdjust="spacingAndGlyphs"` prevent overflow.
