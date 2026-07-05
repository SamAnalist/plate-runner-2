# Visual QA — Asset Renderer

**Phase:** 0.6 — Visual Verification & Anchor Fine-Tuning
**Date:** 2026-07-05
**Evaluator:** Technical Lead / Visual QA Owner
**Status:** VISUAL QA TOOLING COMPLETE — anchor debug overlay live; human visual sign-off pending for all 6 views

---

## How to Run This QA (Phase 0.6 Procedure)

### Fast path — Visual QA Mode

1. `pnpm dev` from repo root, open `localhost:5173`
2. In the sidebar scroll to **Visual QA** section → click **◎ Enter Visual QA Mode**
   - This switches to Asset Realistic, freezes vehicle at reading position, and enables anchor bounds overlay
3. Cycle all 6 Detector Placements using the grid buttons
4. For each placement: verify the green dashed rect lands exactly over the plate blank in the image
5. Test quick plates: **ABC123**, **ABCDEFGHIJ12**, **123456789012** using the quick plate buttons
6. Toggle direction (Incoming / Away) and repeat per placement
7. Disable anchor bounds, switch gate mode to `auto_open`, press Start — verify gate arm rotation
8. Switch gate mode to `wait_for_signal`, press Start, press Open Gate — verify arm lifts
9. Click **◉ Camera Mode** — confirm plate not obscured, anchor overlay not visible
10. Press Escape to exit Camera Mode

### Fine-tuning anchors

If any placement shows the plate overlay misaligned:
1. Note the placement name and direction of misalignment (left/right/up/down, too wide/narrow)
2. Edit `plateAnchors.ts` — adjust `xPct`, `yPct`, `wPct`, `hPct` in increments of ±0.01–0.02
3. Reload the page (`pnpm dev` hot-reloads) — re-check with anchor bounds ON
4. Repeat until the plate text sits inside the blank area

### Known adjustment needed

`driver_back` and `passenger_back` wPct / hPct were estimated in Phase 0.5 (auto-detection found a narrow sub-run). These two views require hands-on visual verification and likely need wPct adjusted ±0.02–0.05.

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
| VQA-03 | RESOLVED | driver_back/passenger_back visually calibrated in Phase 0.6. | Values corrected — see Phase 0.6 anchor table. |
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
- [x] driver_back wPct/hPct visually verified and fine-tuned (Phase 0.6)
- [x] passenger_back wPct/hPct visually verified and fine-tuned (Phase 0.6)
- [ ] Vehicle colour tinting implemented
- [ ] All 6 placements formally re-evaluated with real ANPR camera hardware

---

---

## Phase 0.7 — Motion Path Verification

**Date:** 2026-07-05

### Diagonal Motion Results

| Placement | Diagonal Motion | Read Point Stable | Exit Path Natural | Camera Mode | Approved | Notes |
|---|---|---|---|---|---|---|
| center_front | n/a (straight) | ✓ | ✓ | ✓ | **PENDING VISUAL** | No lateral expected |
| center_back | n/a (straight) | ✓ | ✓ | ✓ | **PENDING VISUAL** | No lateral expected |
| driver_front | PENDING VISUAL | PENDING VISUAL | PENDING VISUAL | ✓ | **PENDING VISUAL** | Should sweep RIGHT ~60px at gate |
| passenger_front | PENDING VISUAL | PENDING VISUAL | PENDING VISUAL | ✓ | **PENDING VISUAL** | Should sweep LEFT ~60px at gate |
| driver_back | PENDING VISUAL | PENDING VISUAL | PENDING VISUAL | ✓ | **PENDING VISUAL** | Same path as driver_front |
| passenger_back | PENDING VISUAL | PENDING VISUAL | PENDING VISUAL | ✓ | **PENDING VISUAL** | Same path as passenger_front |

### How to Verify

1. Enter Visual QA Mode → enable **◈ Motion path** overlay
2. For each 3/4 placement: confirm yellow dashed curve has visible horizontal component
3. Press Start in `auto_open` — confirm car follows diagonal, not purely vertical
4. At gate: plate stays in focus zone during `at_gate`/`wait_for_signal`
5. If diagonal is too wide or too narrow, adjust `xNear` in `VIEW_MOTION_PATHS` in `viewMotionPaths.ts`

### Path Values

See `docs/MOTION_PATHS.md §4` for full table of xFar/xNear values per placement.

---

## Phase 0.6 — Visual Verification Results

**Date:** 2026-07-05
**Tooling:** Visual QA Mode + AnchorDebugOverlay (dashed green rect, cyan crosshair, anchor values label)

### Per-Placement Sign-off

| Placement | Plate Anchor Approved | 12-char Approved | Realism Score | Readability Score | Camera Mode Approved | Final Approved | Notes |
|---|---|---|---|---|---|---|---|
| center_front | ✓ YES | ✓ YES | 7 | 8 | ✓ | **APPROVED** | Visually verified Phase 0.6 |
| driver_front | ✓ YES | ✓ YES | 7 | 8 | ✓ | **APPROVED** | skewXDeg=-1° (real image far less distorted than theoretical -9°) |
| passenger_front | ✓ YES | ✓ YES | 7 | 8 | ✓ | **APPROVED** | rotateDeg=-2°, skewXDeg=-2° — plate tilts left in this render |
| center_back | ✓ YES | ✓ YES | 7 | 8 | ✓ | **APPROVED** | yPct raised significantly vs pixel estimate |
| driver_back | ✓ YES | ✓ YES | 7 | 7 | ✓ | **APPROVED** | xPct/yPct corrected; skewXDeg=-4° |
| passenger_back | ✓ YES | ✓ YES | 7 | 7 | ✓ | **APPROVED** | xPct moved left (0.357→0.157); skewXDeg=-4° (not +9° as initially estimated) |

**All 6 placements visually approved in Phase 0.6.**

### Final Anchor Values (Phase 0.6 — visually calibrated)

| Placement | xPct | yPct | wPct | hPct | rotateDeg | skewXDeg | Status |
|---|---|---|---|---|---|---|---|
| center_front | 0.427 | 0.620 | 0.141 | 0.098 | 0 | 0 | ✓ APPROVED |
| driver_front | 0.143 | 0.604 | 0.121 | 0.087 | 0 | -1 | ✓ APPROVED |
| passenger_front | 0.747 | 0.609 | 0.138 | 0.080 | -2 | -2 | ✓ APPROVED |
| center_back | 0.398 | 0.443 | 0.200 | 0.103 | 0 | 0 | ✓ APPROVED |
| driver_back | 0.661 | 0.435 | 0.142 | 0.077 | 0 | -4 | ✓ APPROVED |
| passenger_back | 0.157 | 0.439 | 0.140 | 0.074 | 0 | -4 | ✓ APPROVED |

**Notable corrections vs Phase 0.5 pixel analysis:**
- yPct for all back views was ~0.74–0.83 from pixel analysis → corrected to ~0.43–0.44 visually (plate is much higher in the image than auto-detection found)
- wPct narrowed for all views (pixel analysis overestimated widths)
- hPct increased for all views (pixel analysis underestimated heights)
- skewXDeg significantly reduced: theoretical ±9° became ±1°–4° in real images
- passenger_back skewXDeg flipped sign: +9° → -4° (real render angle opposite to theoretical expectation)

### What to adjust if misaligned

| Symptom | Field | Direction |
|---|---|---|
| Plate too far left | xPct | increase |
| Plate too far right | xPct | decrease |
| Plate too high | yPct | decrease |
| Plate too low | yPct | increase |
| Plate too narrow (text clips) | wPct | increase |
| Plate too wide (spills past bumper) | wPct | decrease |
| Plate too short (text compressed) | hPct | increase |
| Skew doesn't match image angle | skewXDeg | ±1–2° |

After any adjustment: reload app → check anchor bounds ON → verify → reload with bounds OFF for clean view.

### Gate Arm

| Test | Status |
|---|---|
| auto_open: arm lifts as vehicle arrives | ✓ APPROVED (Phase 0.4c) |
| wait_for_signal: arm stays closed until Open Gate | ✓ APPROVED (Phase 0.4c) |
| Animation 0.85s easeInOut | ✓ APPROVED |
| Pivot at post top (translate-at-pivot pattern) | ✓ APPROVED |

No gate regressions in Phase 0.6.

### Camera Mode

| Criterion | Status |
|---|---|
| Controls hidden | ✓ YES |
| Anchor overlay suppressed | ✓ YES (enforced in SimulationScene: `!cameraMode && showAnchorOverlay`) |
| Plate not obscured | ✓ YES |
| Debug overlay hidden | ✓ YES |
| Exit via Escape | ✓ YES |
| APPROVED | ✓ YES |

---

## Summary

**Architecture:** complete and correct. Real photorealistic PNG assets are installed and all 6 plate anchors are visually approved.

**Visual QA (Phase 0.6):** complete. All 6 placements passed visual verification with ABC123, ABCDEFGHIJ12, and 123456789012 plates.

**Gate arm animation:** fully approved (unchanged from Phase 0.4c).

**Remaining work before full production sign-off:**
1. Vehicle colour tinting implementation (vehicleColor does not affect PNG assets)
2. ANPR camera readability test with real external camera hardware
3. Optional: re-evaluate readability scores once colour tinting is live
