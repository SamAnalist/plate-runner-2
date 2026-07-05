# Visual QA — Asset Renderer

**Phase:** 0.4c — Asset Renderer Visual Correction
**Date:** 2026-07-04
**Evaluator:** Technical Lead / Visual QA Owner
**Status:** PARTIAL — placeholder assets installed, photorealistic assets NOT YET PRODUCED

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
| center_front | YES | YES (symmetric) | YES | YES | ✓ | ✓ | 2 | 7 | **NO** | Placeholder SVG schematic. Must replace with photorealistic PNG. |
| driver_front | YES | YES (left-compressed 3/4) | YES | YES | ✓ | ✓ | 2 | 6 | **NO** | Placeholder shows distinct perspective. skewX=-7° on plate matches. |
| passenger_front | YES | YES (right-compressed 3/4) | YES | YES | ✓ | ✓ | 2 | 6 | **NO** | Mirror of driver_front. Plate anchor skewX=+7°. |
| center_back | YES | YES (symmetric red tail) | YES | YES | ✓ | ✓ | 2 | 7 | **NO** | Placeholder SVG. Red colour coding distinguishes from front views. |
| driver_back | YES | YES (left-compressed 3/4 rear) | YES | YES | ✓ | ✓ | 2 | 6 | **NO** | Placeholder shows distinct rear angle. |
| passenger_back | YES | YES (right-compressed 3/4 rear) | YES | YES | ✓ | ✓ | 2 | 6 | **NO** | Mirror of driver_back. |

**Realism score explanation:**
- 1–3: placeholder / schematic only
- 4–6: basic photorealism with some stylisation
- 7–8: convincing for production demo
- 9–10: broadcast-quality

**Current score of 2 is intentional and honest:** the assets are SVG placeholder schematics, not photorealistic images.

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
| Colour applied to asset | **NO** | Placeholder SVGs have fixed colour (blue front / red back). vehicleColor config does not affect the image. |
| APPROVED | **NO** | KNOWN LIMITATION: placeholder assets are single-colour schematics. Real photorealistic assets may use a neutral base image + SVG hue-rotate filter, or per-colour asset variants (36 files). |

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
| VQA-01 | CRITICAL | All 6 views are placeholder SVG schematics — not photorealistic. | Produce real PNG/WebP 3/4-angle renders. See docs/ASSET_RENDERER_STRATEGY.md §3. |
| VQA-02 | HIGH | vehicleColor does not affect asset appearance in placeholder mode. | Implement hue-rotate filter OR commission per-colour asset variants. |
| VQA-03 | MEDIUM | Plate skewX=±7° is a best-estimate calibration against placeholder geometry. May need adjustment when real assets arrive. | Re-run anchor calibration against each real asset image. |
| VQA-04 | LOW | Contact shadow under car (ellipse) does not match asset perspective for 3/4 views. | Adjust shadow ellipse centre/radius per view key, or switch to asset-specific shadow. |
| VQA-05 | LOW | Parking garage environment (AssetRealisticRenderer) has no ambient occlusion or HDRI-style lighting. | Consider a static ceiling/wall gradient adjustment, or wait for full environment pass. |

---

## Asset Production Checklist

Before marking any placement as APPROVED on realism:

- [ ] Photorealistic 3/4-front PNG/WebP for driver_front installed
- [ ] Photorealistic 3/4-front PNG/WebP for passenger_front installed
- [ ] Straight-on frontal PNG/WebP for center_front installed
- [ ] Photorealistic 3/4-rear PNG/WebP for driver_back installed
- [ ] Photorealistic 3/4-rear PNG/WebP for passenger_back installed
- [ ] Straight-on rear PNG/WebP for center_back installed
- [ ] All plate anchor skew values re-calibrated against each real asset
- [ ] Vehicle colour tinting implemented (filter or per-colour variants)
- [ ] All 6 placements re-evaluated with real cameras / ANPR software

---

## Summary

The **architecture** for per-view assets is complete and correct. Each placement:
- Has its own file slot in `ASSET_REGISTRY`
- Has its own independent `PlateAnchor` in `PLATE_ANCHORS`
- Shows a visually distinct placeholder schematic (blue for front, red for rear; symmetric vs 3/4 trapezoidal body)

The **gate arm animation** is fully approved: the translate-at-pivot + Framer Motion pattern produces reliable, physically correct rotation in all tested browsers.

**None of the 6 placements are approved for production use** because the placeholder schematics do not satisfy the project's photorealism requirement.
The system is ready to accept real assets the moment they are produced.
