/**
 * Per-view plate anchors — one independent anchor per AssetViewKey.
 *
 * Coordinate space: 100 × 72 car local units (CAR_LW × CAR_LH).
 *
 * CENTER VIEWS (straight-on front / rear):
 *   No rotation, no skew. Plate is centred on the bumper, exactly as seen
 *   from directly in front / behind the vehicle.
 *
 * DRIVER VIEWS (3/4 angle from driver's side):
 *   Camera is slightly to the driver's left and forward/rear. The bumper
 *   face appears angled left-to-right. Plate is slightly right of centre in
 *   the image (more of the right/far side visible). A mild negative skewX
 *   matches the left-edge-receding perspective of the placeholder image.
 *
 * PASSENGER VIEWS (3/4 angle from passenger's side):
 *   Mirror of driver view. Positive skewX = right-edge-receding.
 *
 * CALIBRATION NOTES:
 *   skewXDeg values (±7°) are calibrated against the placeholder SVG geometry.
 *   When real photorealistic 3/4-angle PNG/WebP assets are installed, these
 *   values MUST be re-verified against the actual image perspective. A ±2–4°
 *   adjustment is likely needed per asset. Adjust xPct/yPct if the plate
 *   position in the real asset differs from the placeholder.
 *
 * READABILITY RULE:
 *   |skewXDeg| must stay ≤ 12° so 12-character plates remain readable by
 *   external cameras. Do not increase skew for visual effect alone.
 */
import type { DetectorPlacement } from '@plate-runner/shared';
import type { PlateAnchor } from './types';

// ─── Center-front ─────────────────────────────────────────────────────────────
// Straight-on frontal view. Symmetric. No perspective distortion.
const CENTER_FRONT: PlateAnchor = {
  xPct:      0.29,    // 29 / 100
  yPct:      0.75,    // 54 / 72
  wPct:      0.42,    // 42 / 100
  hPct:      0.181,   // 13 / 72
  rotateDeg: 0,
  skewXDeg:  0,
  skewYDeg:  0,
  side:      'front',
};

// ─── Driver-front ─────────────────────────────────────────────────────────────
// 3/4 view from the driver's side (front-left angle).
// The camera is positioned left-of-centre. The car's front face appears to
// recede toward the left. In the image, the plate sits slightly right of
// centre, and the left edge of the plate appears farther away → negative skewX.
const DRIVER_FRONT: PlateAnchor = {
  xPct:      0.32,    // plate sits slightly right in 3/4-left image
  yPct:      0.76,
  wPct:      0.38,    // foreshortened width in 3/4 view
  hPct:      0.173,
  rotateDeg: 0,
  skewXDeg:  -7,      // left edge recedes (driver-side camera)
  skewYDeg:  0,
  side:      'front',
};

// ─── Passenger-front ─────────────────────────────────────────────────────────
// 3/4 view from the passenger's side (front-right angle). Mirror of driver-front.
const PASSENGER_FRONT: PlateAnchor = {
  xPct:      0.30,    // plate sits slightly left in 3/4-right image
  yPct:      0.76,
  wPct:      0.38,
  hPct:      0.173,
  rotateDeg: 0,
  skewXDeg:  +7,      // right edge recedes (passenger-side camera)
  skewYDeg:  0,
  side:      'front',
};

// ─── Center-back ─────────────────────────────────────────────────────────────
// Straight-on rear view. Symmetric. No perspective distortion.
const CENTER_BACK: PlateAnchor = {
  xPct:      0.29,
  yPct:      0.75,
  wPct:      0.42,
  hPct:      0.181,
  rotateDeg: 0,
  skewXDeg:  0,
  skewYDeg:  0,
  side:      'rear',
};

// ─── Driver-back ─────────────────────────────────────────────────────────────
// 3/4 view from the driver's side of the rear face. Same geometry as driver-front.
const DRIVER_BACK: PlateAnchor = {
  xPct:      0.32,
  yPct:      0.76,
  wPct:      0.38,
  hPct:      0.173,
  rotateDeg: 0,
  skewXDeg:  -7,
  skewYDeg:  0,
  side:      'rear',
};

// ─── Passenger-back ──────────────────────────────────────────────────────────
// 3/4 view from the passenger's side of the rear face.
const PASSENGER_BACK: PlateAnchor = {
  xPct:      0.30,
  yPct:      0.76,
  wPct:      0.38,
  hPct:      0.173,
  rotateDeg: 0,
  skewXDeg:  +7,
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
