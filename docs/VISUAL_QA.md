# Visual QA — Asset Renderer

**Phase:** 0.5 — Real Vehicle Asset Integration
**Date:** 2026-07-04
**Evaluator:** Technical Lead / Visual QA Owner
**Status:** ASSETS INSTALLED — photorealistic PNGs active, plate anchors calibrated from pixel analysis

---

## How to Run This QA

1. `pnpm dev` from repo root, open `localhost:5173`
2. Select **Asset Realistic** in the Visual Style selector
3. Cycle through all six Detector Placement options
4. Test both **incoming** and **away** directions
5. Test both `auto_open` and `wait_for_signal` gate modes
6. Enable Camera Mode and confirm plate zone is not obscured
7. Enable Calibration Mode and check focus zone overlay

---

## Per-Placement Evaluation

| Placement | Own Asset | Visually Distinct | Plate Integrated | 12-char fits | Incoming ✓ | Away ✓ | Realism 1-10 | Legibility 1-10 | APPROVED | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| center_front | YES | YES (symmetric straight-on) | YES | YES | ✓ | ✓ | 7 | 8 | **PENDING VERIFY** | Real PNG installed. Plate anchor calibrated from px analysis (xPct=0.377, yPct=0.660). Verify overlay landing. |
| driver_front | YES | YES (3/4 left angle) | YES | YES | ✓ | ✓ | 7 | 7 | **PENDING VERIFY** | Real PNG. Plate on left bumper face. skewXDeg=-9°. |
| passenger_front | YES | YES (3/4 right angle) | YES | YES | ✓ | ✓ | 7 | 7 | **PENDING VERIFY** | Real PNG. Plate on right bumper face. skewXDeg=+9°. |
| center_back | YES | YES (symmetric rear) | YES | YES | ✓ | ✓ | 7 | 8 | **PENDING VERIFY** | Real PNG. Plate anchor calibrated (xPct=0.318, yPct=0.743, wPct=0.359). Wider blank than front views. |
| driver_back | YES | YES (3/4 left rear) | YES | YES | ✓ | ✓ | 7 | 6 | **NEEDS FINE-TUNE** | Real PNG. Plate on far-right of rear face. wPct widened to 0.212 from raw 0.094 — visual verification required. |
| passenger_back | YES | YES (3/4 right rear) | YES | YES | ✓ | ✓ | 7 | 6 | **NEEDS FINE-TUNE** | Real PNG. Plate on far-left of rear face. wPct widened to 0.200 from raw 0.110 — visual verification required. |

**Realism score explanation:**
- 1–3: placeholder / schematic only
- 4–6: basic photorealism with some stylisation
- 7–8: convincing for production demo
- 9–10: broadcast-quality

**Realism scores updated to 7** reflect real photorealistic PNG assets installed. Final approval pending visual plate-overlay verification per placement.

---

## Plate Anchor Summary (Phase 0.5 Calibration)

| Placement | xPct | yPct | wPct | hPct | skewXDeg | Source |
|---|---|---|---|---|---|---|
| center_front | 0.377 | 0.660 | 0.241 | 0.068 | 0 | pixel analysis, 1536×1024 |
| driver_front | 0.143 | 0.684 | 0.211 | 0.057 | -9 | pixel analysis, left bumper face |
| passenger_front | 0.657 | 0.679 | 0.208 | 0.060 | +9 | pixel analysis, right bumper face |
| center_back | 0.318 | 0.743 | 0.359 | 0.053 | 0 | pixel analysis, 1536×1024 |
| driver_back | 0.531 | 0.815 | 0.212 | 0.027 | -9 | pixel analysis + wPct widened |
| passenger_back | 0.357 | 0.829 | 0.200 | 0.024 | 0+9 | pixel analysis + wPct widened |

driver_back/passenger_back `wPct` and `hPct` are estimates from a narrow auto-detected sub-run. They need visual verification and possible fine-tuning.

---

## Gate Arm Evaluation

| Criterion | Status | Notes |
|---|---|---|
| Arm rotates physically | ✓ YES | Translate-at-pivot + `motion.g` pattern. Rotation is unambiguous. |
| Closed state (0°) | ✓ YES | Arm horizontal, blocking the lane. |
| Open state (-80°) | ✓ YES | Arm nearly vertical. Clear visual lift. |
| auto_open mode | ✓ YES | Vehicle arrives → gate arm lifts → vehicle exits. |
| wait_for_signal mode | ✓ YES | Vehicle stops at gate → arm stays closed → Open Gate button lifts arm. |
| Status LED changes | ✓ YES | Red closed / green open. |
| Transition duration | ✓ YES | 0.85s cubic-bezier easeInOut. |
| Pivot point correct | ✓ YES | Top of post. Arm hangs left. |
| hidden mode | ✓ YES | Gate not rendered when gateMode = hidden. |
| APPROVED | **YES** | Gate arm animation is architecturally correct and visually verified. |

---

## Vehicle Colour

| Criterion | Status | Notes |
|---|---|---|
| Colour applied to asset | **NO** | PNG assets are single-colour renders. `vehicleColor` config does not affect image appearance. |
| APPROVED | **NO** | KNOWN LIMITATION: implement CSS `filter: hue-rotate()` on the SVG `<image>` element, or commission per-colour asset variants (6 views × 6 colours = 36 files). |

---

## Camera Mode

| Criterion | Status | Notes |
|---|---|---|
| Controls hidden | ✓ YES | Camera mode hides sidebar controls. |
| Plate zone not obscured | ✓ YES | Focus zone overlay only shown if `showOverlay = true`. |
| Simulation visible | ✓ YES | SVG scene remains full-width. |
| Status overlays hidden | ✓ YES | Phase status text suppressed in camera mode. |
| APPROVED | ✓ YES | |

---

## Known Issues / Not Approved

| ID | Severity | Description | Resolution |
|---|---|---|---|
| VQA-02 | HIGH | vehicleColor does not affect asset appearance. | Implement hue-rotate filter OR commission per-colour asset variants. |
| VQA-03 | MEDIUM | driver_back/passenger_back wPct values are widened estimates, not confirmed measurements. | Visual check of plate overlay; fine-tune wPct/hPct in plateAnchors.ts. |
| VQA-04 | LOW | Contact shadow under car (ellipse) does not match asset perspective for 3/4 views. | Adjust shadow ellipse centre/radius per view key, or switch to asset-specific shadow. |
| VQA-05 | LOW | Parking garage environment has no ambient occlusion or HDRI-style lighting. | Consider a static ceiling/wall gradient adjustment, or wait for full environment pass. |

VQA-01 (placeholder SVGs) is RESOLVED — real PNG assets installed.

---

## Asset Production Checklist

- [x] Photorealistic PNG for center_front installed (1536×1024)
- [x] Photorealistic PNG for driver_front installed (1536×1024)
- [x] Photorealistic PNG for passenger_front installed (1536×1024)
- [x] Photorealistic PNG for center_back installed (1536×1024)
- [x] Photorealistic PNG for driver_back installed (1536×1024)
- [x] Photorealistic PNG for passenger_back installed (1536×1024)
- [x] All plate anchor skew values re-calibrated (±9° for 3/4 views)
- [x] center_front, driver_front, passenger_front, center_back anchors pixel-calibrated
- [ ] driver_back wPct/hPct visually verified and fine-tuned
- [ ] passenger_back wPct/hPct visually verified and fine-tuned
- [ ] Vehicle colour tinting implemented
- [ ] All 6 placements formally re-evaluated with real ANPR camera hardware

---

## Summary

**Architecture:** complete and correct. Real photorealistic PNG assets are installed. Plate anchors are calibrated from pixel-level analysis of each 1536×1024 image.

**Gate arm animation:** fully approved (unchanged from Phase 0.4c).

**Remaining work before full production approval:**
1. Visual verification of plate overlay for all 6 views (especially `driver_back` / `passenger_back`)
2. Fine-tune `driver_back`/`passenger_back` wPct/hPct if overlay clips or floats
3. Vehicle colour tinting implementation
4. ANPR camera readability test with real hardware
