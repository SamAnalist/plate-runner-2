/**
 * Per-view plate anchors — one independent anchor per AssetViewKey.
 *
 * Coordinate space: 100 × 72 car local units (CAR_LW × CAR_LH).
 *
 * CALIBRATION HISTORY:
 *   Phase 0.6 — calibrated for ground-level studio renders (SUPERSEDED)
 *   Phase 1.2 — INITIAL estimates for camera-aware LPR/ANPR assets (2–3 m height, downward tilt)
 *               PENDING VISUAL VERIFICATION — use anchor debug overlay to recalibrate
 *
 * RECALIBRATION WORKFLOW:
 *   1. Run pnpm dev in apps/web
 *   2. Enable Visual QA overlays in the sidebar → Visual QA → Anchor bounds: ON
 *   3. For each placement, adjust xPct/yPct/wPct/hPct until the green dashed rect
 *      lands exactly over the plate blank area in the asset image
 *   4. Test with ABC123, ABCDEFGHIJ12, and 123456789012
 *   5. Commit updated values
 *
 * READABILITY RULE:
 *   |skewXDeg| must stay ≤ 12° so 12-character plates remain readable by
 *   external cameras. Do not increase skew for visual effect alone.
 */
import type { DetectorPlacement } from '@plate-runner/shared';
import type { PlateAnchor } from './types';

// ─── Center-front ─────────────────────────────────────────────────────────────
// Straight-on frontal view. Camera elevated ~2–3 m, downward tilt.
// INITIAL CALIBRATION — PENDING VISUAL VERIFICATION
const CENTER_FRONT: PlateAnchor = {
  xPct:      0.445,
  yPct:      0.680,
  wPct:      0.100,
  hPct:      0.080,
  rotateDeg: 0,
  skewXDeg:  0,
  skewYDeg:  0,
  side:      'front',
};

// ─── Driver-front ─────────────────────────────────────────────────────────────
// Angled view from driver's side (front-left). Camera elevated ~2–3 m, downward tilt.
// INITIAL CALIBRATION — PENDING VISUAL VERIFICATION
const DRIVER_FRONT: PlateAnchor = {
  xPct:      0.240,
  yPct:      0.678,
  wPct:      0.090,
  hPct:      0.060,
  rotateDeg: 8,
  skewXDeg:  10,
  skewYDeg:  0,
  side:      'front',
};

// ─── Passenger-front ─────────────────────────────────────────────────────────
// Angled view from passenger's side (front-right). Camera elevated ~2–3 m, downward tilt.
// INITIAL CALIBRATION — PENDING VISUAL VERIFICATION
const PASSENGER_FRONT: PlateAnchor = {
  xPct:      0.720,
  yPct:      0.625,
  wPct:      0.130,
  hPct:      0.085,
  rotateDeg: 0,
  skewXDeg:  2,
  skewYDeg:  0,
  side:      'front',
};

// ─── Center-back ─────────────────────────────────────────────────────────────
// Straight-on rear view. Camera elevated ~2–3 m, downward tilt.
// INITIAL CALIBRATION — PENDING VISUAL VERIFICATION
const CENTER_BACK: PlateAnchor = {
  xPct:      0.445,
  yPct:      0.580,
  wPct:      0.115,
  hPct:      0.085,
  rotateDeg: 0,
  skewXDeg:  0,
  skewYDeg:  0,
  side:      'rear',
};

// ─── Driver-back ─────────────────────────────────────────────────────────────
// Angled view from driver's side of rear face. Camera elevated ~2–3 m, downward tilt.
// INITIAL CALIBRATION — PENDING VISUAL VERIFICATION
const DRIVER_BACK: PlateAnchor = {
  xPct:      0.650,
  yPct:      0.610,
  wPct:      0.140,
  hPct:      0.080,
  rotateDeg: 0,
  skewXDeg:  -3,
  skewYDeg:  0,
  side:      'rear',
};

// ─── Passenger-back ──────────────────────────────────────────────────────────
// Angled view from passenger's side of rear face. Camera elevated ~2–3 m, downward tilt.
// INITIAL CALIBRATION — PENDING VISUAL VERIFICATION
const PASSENGER_BACK: PlateAnchor = {
  xPct:      0.275,
  yPct:      0.540,
  wPct:      0.110,
  hPct:      0.070,
  rotateDeg: 4,
  skewXDeg:  2,
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
