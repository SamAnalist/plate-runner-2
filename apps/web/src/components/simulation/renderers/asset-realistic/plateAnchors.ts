/**
 * Per-view plate anchors — one independent anchor per AssetViewKey.
 *
 * Coordinate space: 100 × 72 car local units (CAR_LW × CAR_LH).
 *
 * CALIBRATION HISTORY:
 *   Phase 0.5 — initial values derived from pixel-level analysis of 1536×1024 PNGs
 *   Phase 0.6 — all values visually verified and corrected in-browser using the
 *               AnchorDebugOverlay (green dashed rect + crosshair) with real assets
 *
 * FINAL VALUES (Phase 0.6 — visually approved):
 *   All placements confirmed: plate text lands on blank area, ABC123 centred,
 *   ABCDEFGHIJ12 and 123456789012 fit without overflow.
 *
 * SKEW NOTES (from visual calibration, not theoretical geometry):
 *   center views:    skewXDeg = 0   (straight-on, no distortion)
 *   driver_front:    skewXDeg = -1  (mild — real image shows less distortion than expected)
 *   passenger_front: skewXDeg = -2  (mild negative — bumper face in this render angles left)
 *   driver_back:     skewXDeg = -4  (moderate — rear plate face recedes)
 *   passenger_back:  skewXDeg = -4  (same as driver_back — both rear 3/4 views converge)
 *   passenger_front also carries rotateDeg = -2 to match the plate tilt in that render.
 *
 * READABILITY RULE:
 *   |skewXDeg| must stay ≤ 12° so 12-character plates remain readable by
 *   external cameras. Do not increase skew for visual effect alone.
 *
 * RE-CALIBRATION: if a new asset version ships, use Visual QA Mode in the app
 *   (sidebar → Visual QA → Enter Visual QA Mode) to verify each view with the
 *   anchor bounds overlay on before committing new values.
 */
import type { DetectorPlacement } from '@plate-runner/shared';
import type { PlateAnchor } from './types';

// ─── Center-front ─────────────────────────────────────────────────────────────
// Straight-on frontal view. Symmetric. No perspective distortion.
// Visually calibrated Phase 0.6: shifted right and up vs pixel analysis estimate.
const CENTER_FRONT: PlateAnchor = {
  xPct:      0.427,
  yPct:      0.620,
  wPct:      0.141,
  hPct:      0.098,
  rotateDeg: 0,
  skewXDeg:  0,
  skewYDeg:  0,
  side:      'front',
};

// ─── Driver-front ─────────────────────────────────────────────────────────────
// 3/4 view from the driver's side (front-left angle).
// Plate on the left side of the bumper face.
// Visually calibrated Phase 0.6: yPct raised, wPct narrowed, hPct increased.
// skewXDeg reduced from -9° (theoretical) to -1° (real image shows very mild distortion).
const DRIVER_FRONT: PlateAnchor = {
  xPct:      0.143,
  yPct:      0.604,
  wPct:      0.121,
  hPct:      0.087,
  rotateDeg: 0,
  skewXDeg:  -1,
  skewYDeg:  0,
  side:      'front',
};

// ─── Passenger-front ─────────────────────────────────────────────────────────
// 3/4 view from the passenger's side (front-right angle).
// Plate on the right side of the bumper face.
// Visually calibrated Phase 0.6: xPct shifted right, skew corrected to -2° (not +9°),
// rotateDeg = -2° to match the slight plate tilt visible in this render angle.
const PASSENGER_FRONT: PlateAnchor = {
  xPct:      0.747,
  yPct:      0.609,
  wPct:      0.138,
  hPct:      0.080,
  rotateDeg: -2,
  skewXDeg:  -2,
  skewYDeg:  0,
  side:      'front',
};

// ─── Center-back ─────────────────────────────────────────────────────────────
// Straight-on rear view. Symmetric. No perspective distortion.
// Visually calibrated Phase 0.6: yPct raised significantly (0.743 → 0.443),
// wPct narrowed (0.359 → 0.200), hPct increased (0.053 → 0.103).
const CENTER_BACK: PlateAnchor = {
  xPct:      0.398,
  yPct:      0.443,
  wPct:      0.200,
  hPct:      0.103,
  rotateDeg: 0,
  skewXDeg:  0,
  skewYDeg:  0,
  side:      'rear',
};

// ─── Driver-back ─────────────────────────────────────────────────────────────
// 3/4 view from the driver's side of the rear face.
// Plate on the right portion of the rear face as seen in this render.
// Visually calibrated Phase 0.6: xPct shifted right, yPct raised substantially,
// wPct narrowed, hPct increased. skewXDeg reduced from -9° to -4°.
const DRIVER_BACK: PlateAnchor = {
  xPct:      0.661,
  yPct:      0.435,
  wPct:      0.142,
  hPct:      0.077,
  rotateDeg: 0,
  skewXDeg:  -4,
  skewYDeg:  0,
  side:      'rear',
};

// ─── Passenger-back ──────────────────────────────────────────────────────────
// 3/4 view from the passenger's side of the rear face.
// Plate on the left portion of the rear face as seen in this render.
// Visually calibrated Phase 0.6: xPct shifted left (0.357 → 0.157), yPct raised,
// skewXDeg corrected to -4° (was +9° theoretical — real image shows opposite tilt).
const PASSENGER_BACK: PlateAnchor = {
  xPct:      0.157,
  yPct:      0.439,
  wPct:      0.140,
  hPct:      0.074,
  rotateDeg: 0,
  skewXDeg:  -4,
  skewYDeg:  0,
  side:      'rear',
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const PLATE_ANCHORS: Record<DetectorPlacement, PlateAnchor> = {
  center_front:    CENTER_FRONT,
  driver_front:    DRIVER_FRONT,
  passenger_front: PASSENGER_FRONT,
  center_back:     CENTER_BACK,
  driver_back:     DRIVER_BACK,
  passenger_back:  PASSENGER_BACK,
};

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Converts a PlateAnchor's percentage fields to absolute pixel coordinates
 * within the car's current local coordinate space.
 *
 * The returned rect is the bounding box of the plate BEFORE any rotation/skew
 * transform is applied. The transform is applied separately in DynamicPlateOverlay.
 */
export function anchorToLocalRect(
  anchor: PlateAnchor,
  carLW = 100,
  carLH = 72,
): { x: number; y: number; w: number; h: number } {
  return {
    x: anchor.xPct * carLW,
    y: anchor.yPct * carLH,
    w: anchor.wPct * carLW,
    h: anchor.hPct * carLH,
  };
}
