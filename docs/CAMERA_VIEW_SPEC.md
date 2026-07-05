# Camera View Specification — Plate Runner

**Phase:** 1.2
**Date:** 2026-07-05
**Status:** Camera-aware LPR/ANPR asset pack installed. Plate anchors are initial estimates — pending visual calibration.

---

## 1. Why the Assets Were Replaced

The Phase 0.5 / 0.6 assets were rendered from a ground-level studio perspective: the virtual camera was positioned at roughly eye height (approximately 1.0–1.5 m) and aimed horizontally at the vehicle. This produced aesthetically appealing images but did not reflect how a real parking access/exit camera sees a vehicle.

Real LPR/ANPR cameras at parking barriers are typically:
- Mounted at **2–3 m height** on a column or overhead beam
- Aimed **downward** at an angle (approximately 20–35 degrees from horizontal)
- Positioned to capture the **full plate** as the vehicle decelerates toward the gate

Calibrating the DynamicPlateOverlay against studio-level renders and then deploying the simulation for camera-based testing would introduce systematic alignment errors. The Phase 1.2 asset pack corrects this by providing six images rendered from a virtual camera that matches real parking camera geometry.

---

## 2. Virtual Camera Description

| Parameter | Value |
|---|---|
| Camera height | 2–3 m above the road surface |
| Vertical tilt | Downward, aimed at the front or rear of the vehicle |
| Target | License plate area at vehicle stop position |
| Horizontal position | Varies by placement (center, driver side, passenger side) |
| Lens model | Standard perspective (no fisheye correction) |
| Image size | 1536 × 1024 px |
| Format | RGB PNG |
| Background | Parking environment (lane, road surface) |

---

## 3. Visual Criteria — Center Views (Baseline)

`center_front` and `center_back` are the baseline views. The virtual camera is positioned directly ahead of the vehicle (center_front) or behind it (center_back), elevated and aimed downward.

Expected characteristics:
- Vehicle is centered in the frame
- Front or rear face of the vehicle is clearly visible
- License plate blank is visible slightly left-of-center or centered on the bumper/trunk
- No lateral angle distortion — plate appears as a near-rectangle
- Hood/trunk foreshortened due to downward tilt
- Road surface partially visible below the bumper

---

## 4. Visual Criteria — Driver and Passenger Views

`driver_front`, `driver_back`, `passenger_front`, `passenger_back` capture the vehicle from an off-center horizontal angle in addition to the elevated vertical angle.

Expected characteristics:
- Vehicle is offset in the frame — camera is to one side
- Front or rear face of the vehicle is angled (3/4 perspective)
- License plate blank is visible on the angled bumper/trunk face
- Plate appears trapezoidal due to horizontal perspective — one vertical edge is closer to the camera
- `driver_front` / `driver_back`: camera is on the driver's side; plate appears on the left portion of the face as seen from the camera
- `passenger_front` / `passenger_back`: camera is on the passenger's side; plate appears on the right portion of the face
- Mild skewX is expected for the plate overlay (target: ±2–4 degrees for these views)

---

## 5. Plate Legibility Requirements for ANPR/LPR

The simulation is designed for ANPR/LPR camera testing. The following requirements apply at the vehicle's stop/reading position:

| Requirement | Target |
|---|---|
| Plate text fully visible | All 12 characters must be within the plate blank area |
| Plate not obscured | No gate arm, overlay, or UI element covers the plate |
| Plate contrast | White plate background, black text — no inversion |
| Plate size in scene | Large enough for text to be read at realistic screen-to-camera distances |
| Skew within tolerance | `\|skewXDeg\|` ≤ 12° across all placements |
| Plate stable during stop | No animation or oscillation while vehicle is stopped at gate |

Test with these reference plates:
- `ABC123` — short plate, wide character spacing
- `ABCDEFGHIJ12` — maximum 12-character plate
- `123456789012` — numeric-only maximum plate

---

## 6. Validating Plate Overlay Alignment — Anchor Overlay Tool

The application has a built-in anchor debug overlay to validate plate anchor positions against the camera-aware images.

### How it works

When `showAnchorOverlay = true` (set in App.tsx), the `AnchorDebugOverlay` component renders inside the 100×72 car local coordinate space:
- **Green dashed rectangle**: the bounding box defined by `xPct/yPct/wPct/hPct` in `plateAnchors.ts`
- **Cyan crosshair**: centre of the plate anchor
- **Magenta corner dots**: corners of the anchor rect
- **White label**: placement key (e.g. `center_front`)
- **Lime label**: raw anchor values

The DynamicPlateOverlay renders the live plate text in the same coordinate space, so the green rect and the plate text should coincide exactly.

### What to look for

The green dashed rect should:
1. Cover the blank plate area in the PNG image
2. Not extend outside the blank (plate blank is visually distinct — lighter grey area on the bumper)
3. Have the plate text fully contained within it
4. Show no overflow when the plate is `ABCDEFGHIJ12`

---

## 7. Calibration Workflow (Step by Step)

This workflow must be followed after any new camera-aware asset pack is installed.

### Prerequisites

- `pnpm dev` running in `apps/web`
- Browser open at `http://localhost:5173`
- `showAnchorOverlay` is `true` in `App.tsx` (default ON for Phase 1.2)

### Steps

1. **Open the sidebar** → scroll to the **Visual QA** section
2. Click **Enter Visual QA Mode** — this freezes the vehicle at the reading position and enables the anchor overlay
3. **Select `center_front` placement** — this is the baseline; calibrate it first
4. In `plateAnchors.ts`, adjust `xPct` and `yPct` until the green dashed rect's top-left corner lands on the top-left corner of the plate blank in the image
5. Adjust `wPct` and `hPct` until the rect covers the full plate blank area
6. Set `skewXDeg = 0` for center views (no horizontal angle distortion expected)
7. Test with **ABC123** → plate text centred, no overflow
8. Test with **ABCDEFGHIJ12** → text fits, no clipping
9. Test with **123456789012** → same
10. **Select `driver_front`** and repeat steps 4–9
    - Expect `xPct` to be lower (plate is on the left portion of the angled bumper)
    - Adjust `skewXDeg` to a small negative value (plate face recedes to the right) — start at -2 and adjust
11. **Select `passenger_front`** and repeat
    - Expect `xPct` to be higher (plate is on the right portion)
    - Adjust `skewXDeg` to a small positive value — start at +2 and adjust
12. **Select `center_back`** and repeat steps 4–9
    - Rear plates are typically wider relative to the car width than front plates
13. **Select `driver_back`** and repeat
14. **Select `passenger_back`** and repeat
15. After calibrating all 6 placements, switch `showAnchorOverlay` back to `false` in App.tsx
16. Run `pnpm -C apps/web exec tsc --noEmit` to confirm no type errors
17. Commit the updated `plateAnchors.ts` values

### After calibration

- Test in **Camera Mode** (no anchor overlay) — confirm plate is visible and not obscured
- Test in **Fullscreen** — confirm plate is visible
- Run with `wait_for_signal` gate mode — confirm plate is stable while stopped

---

## 8. Known Limitations

- Plate anchor positions are initial estimates (Phase 1.2). Visual calibration is required before using the simulation for real ANPR/LPR camera testing.
- Calibration is currently a manual human-in-the-loop process. Automated pixel-level verification is not yet implemented.
- The virtual camera geometry (exact height, tilt angle, horizontal offset) is not documented by the asset producer. Skew values are derived empirically by visual inspection.
- `vehicleColor` config does not affect the PNG assets — colour is baked into the image. Tinting support is a future task.
