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

**Note:** `hidden` is a UI convenience extension beyond the two modes specified in AGENTS.md (`auto_open` and `wait_for_signal`). It is safe and intentional — it enables no-gate simulations and camera-only testing without the gate arm in view. It does not need to be supported by a future backend.

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

### Direction ↔ Placement constraint (Phase 1.1)

Each direction constrains which detector placements are valid:

| Direction | Allowed placements | Car face shown |
|---|---|---|
| `incoming` | `driver_front`, `center_front`, `passenger_front` | Front fascia |
| `away`     | `driver_back`,  `center_back`,  `passenger_back`  | Rear fascia  |

**Rationale:** an incoming vehicle is approaching the detector, so the camera sees the front. An away vehicle is receding, so the camera sees the rear. Cross-direction combinations (e.g. `incoming + center_back`) are invalid and must never be rendered.

**Remap on direction change:**

| Current placement | New direction | Remapped placement |
|---|---|---|
| `driver_front`    | `away`     | `driver_back`    |
| `center_front`    | `away`     | `center_back`    |
| `passenger_front` | `away`     | `passenger_back` |
| `driver_back`     | `incoming` | `driver_front`   |
| `center_back`     | `incoming` | `center_front`   |
| `passenger_back`  | `incoming` | `passenger_front`|

The UI filters placement options to only show the 3 valid for the current direction. App.tsx auto-remaps when direction changes. VehicleAssetLayer has a guardrail that silently remaps any invalid combination before rendering.

Utility functions live in `packages/shared/src/directionPlacement.ts`:
- `getPlacementsForDirection(direction)`
- `isPlacementAllowedForDirection(direction, placement)`
- `remapPlacementForDirection(current, nextDirection)`

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

### POV Entry/Exit (Phase 0.8 — asset-realistic renderer)

The asset-realistic renderer wraps the vehicle in a POV visibility model so it enters and exits the camera frame naturally, without abrupt appearance or disappearance.

#### t-range

```
startT(incoming) = 0.0   (simulation begins before car is on screen)
startT(away)     = 1.0   (simulation begins with car below visible frame)
done (incoming)  = t ≥ 0.98
done (away)      = t ≤ 0.02
```

#### Opacity

```
t < 0.07:   opacity = t / 0.07        (0 → 1, fade in at horizon)
0.07–0.90:  opacity = 1.0             (fully visible)
t > 0.90:   opacity = (1 − t) / 0.10 (1 → 0, fade out at near edge)
```

#### Y offset (slide in/out of frame)

```
t < 0.07:   yOffset = lerp(−(depthY + 1), 0, t / 0.07)
               → car slides down from above the horizon into position
t > 0.90:   yOffset = lerp(0, SCENE_H + 10 − (depthY − carH), (t − 0.90) / 0.10)
               → car slides off the bottom of the scene
otherwise:  yOffset = 0
```

For `away` direction (t: 1→0) these zones are traversed in reverse order — the exit-zone fires on entry (car comes from below) and the spawn-zone fires on exit (car dissolves at horizon).

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

### Current implementation (Phase 0.2)

| Phase | Description |
|---|---|
| `idle` | Initial / after reset. Vehicle at start position, no animation. |
| `running` | Vehicle animating. Gate logic active. |
| `at_gate` | Vehicle stopped at reading position (wait_for_signal or holdAt()). |
| `done` | Vehicle completed the run. |

### Preferred model (AGENTS.md target — migrate gradually)

```ts
type SimulationPhase =
  | "idle"
  | "queued"
  | "approaching"
  | "decelerating"
  | "stopped_at_gate"
  | "waiting_for_signal"
  | "gate_opening"
  | "exiting"
  | "completed"
  | "cancelled"
  | "failed";
```

### Migration mapping

| Current phase | Maps to preferred phase(s) | Notes |
|---|---|---|
| `idle` | `idle` | Direct equivalent |
| `running` | `approaching` → `decelerating` | Split when deceleration is implemented |
| `at_gate` | `stopped_at_gate` → `waiting_for_signal` | `waiting_for_signal` activates when mode is `wait_for_signal` |
| `done` | `gate_opening` → `exiting` → `completed` | Split into sub-phases when gate sequence is tracked |
| _(no current equivalent)_ | `queued` | Needed for Phase 0.3 plate queue |
| _(no current equivalent)_ | `cancelled` / `failed` | Needed for Phase 0.4+ API-driven runs |

Migration will happen incrementally as phases are added. The current 4-phase model is a valid subset.

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

> **Updated in Phase 1.1.** The previous 12-case matrix (2 directions × 6 placements) is
> now invalid — cross-direction combinations are forbidden by business rule.
> The canonical test set is 6 valid combinations only.

| # | Direction | Placement | Expected car face | Expected plate |
|---|---|---|---|---|
| 1 | incoming | center_front    | Front, centered | Front plate, center |
| 2 | incoming | driver_front    | Front, shifted right | Front plate, slightly right |
| 3 | incoming | passenger_front | Front, shifted left  | Front plate, slightly left |
| 4 | away     | center_back     | Rear, centered, shrinking | Rear plate, center |
| 5 | away     | driver_back     | Rear, shifted right, shrinking | Rear plate, slightly right |
| 6 | away     | passenger_back  | Rear, shifted left, shrinking  | Rear plate, slightly left |

**Remap test:** Switching direction should auto-map the equivalent side position
(driver ↔ driver, center ↔ center, passenger ↔ passenger).

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

---

## 15. Plate Queue Orchestration (Phase 0.4)

`usePlateQueue` (`apps/web/src/features/queue/usePlateQueue.ts`) drives this
same `useSimulation` state machine externally — it does not add new phases
or alter the transitions above. It works because `useSimulation` never reads
`config.plate`, only direction/placement/gate/speed fields, so the queue can
swap `config.plate` and call `start()` between runs with no race against the
simulator's internal state. See `docs/QUEUE_SPEC.md` for the full spec.

---

## 16. Pause / Resume Primitive (Phase 0.5)

`SimulationState` gained `isPaused: boolean`, orthogonal to `phase` — pausing
never changes which phase the machine is in, it only freezes whatever is
producing motion for that phase (the rAF loop during `running`, or the
active gate timer during `stopped_at_gate`/`gate_opening`). `SimulationControls`
gained `pause()`/`resume()`, both idempotent no-ops outside their valid
states. Full mechanics, the timer-pause utility, and the gate/queue
interaction are documented in `docs/SIMULATION_STATE_MACHINE.md` — read that
doc alongside this one for anything pause-related.
