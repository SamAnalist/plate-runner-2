/**
 * Per-view, per-type, per-color plate anchors — one independent anchor per
 * (VehicleType, VehicleColor, AssetViewKey) triple, all edited in the single
 * PLATE_ANCHORS_BY_TYPE_AND_COLOR table below.
 *
 * Coordinate space: 100 × 72 car local units (CAR_LW × CAR_LH).
 *
 * CALIBRATION HISTORY:
 *   Phase 0.6 — calibrated for ground-level studio renders (SUPERSEDED)
 *   Phase 1.2 — INITIAL estimates for camera-aware LPR/ANPR assets (2–3 m height, downward tilt)
 *               PENDING VISUAL VERIFICATION — use anchor debug overlay to recalibrate
 *   Later phase — 'red'/'gray' PNGs added (see docs/VEHICLE_COLOR_VARIANTS.md).
 *               They're separately rendered images, not recolors of 'blue', so
 *               each color gets its own anchor per placement instead of sharing
 *               'blue's.
 *   Later phase — 'suv' vehicle type added. Its anchors are currently a
 *               DIRECT COPY of 'sedan's values per color — the SUV assets
 *               have not yet been visually calibrated (different body
 *               proportions and plate position than the sedan almost
 *               certainly mean these are wrong). PENDING VISUAL CALIBRATION,
 *               same workflow as below, scoped to the 'suv' block.
 *
 * RECALIBRATION WORKFLOW (per type, per color, per placement):
 *   1. Run pnpm dev in apps/web
 *   2. Enable Visual QA overlays in the sidebar → Visual QA → Anchor bounds: ON
 *   3. Select the vehicle type and color you're calibrating (Vehicle Type /
 *      Vehicle Color swatches)
 *   4. For each placement, adjust xPct/yPct/wPct/hPct in that type+color's
 *      block below until the green dashed rect lands exactly over the plate
 *      blank area in the asset image
 *   5. Test with ABC123, ABCDEFGHIJ12, and 123456789012
 *   6. Commit updated values
 *
 * READABILITY RULE:
 *   |skewXDeg| must stay ≤ 12° so 12-character plates remain readable by
 *   external cameras. Do not increase skew for visual effect alone.
 */
import type { DetectorPlacement, VehicleColor, VehicleType } from '@plate-runner/shared';
import type { PlateAnchor } from './types';

// ─── Per-type, per-color anchor table ────────────────────────────────────────
//
// Every (type, color) pair is a full, independent peer here — nothing is
// merged/inherited from 'sedan'/'blue' at lookup time, so what you see in a
// block below is exactly what renders for that type+color. When adding a new
// placement for a type/color that hasn't been calibrated yet, the simplest
// starting point is to copy the same placement's values from sedan/blue.
//
// CALIBRATION STATUS:
//   - sedan/blue: fully calibrated (original Phase 1.2 baseline).
//   - sedan/red, sedan/gray, center_front: measured directly against the
//     blue asset by pixel inspection (small real offset, ~5-13px on the
//     1536×1024 canvas).
//   - sedan/red, sedan/gray, all other placements: being calibrated in-app
//     via the Anchor bounds overlay — edit freely below.
//   - suv (all colors): INITIAL estimate, direct copy of the matching
//     sedan/<color> values — PENDING VISUAL CALIBRATION, not yet verified
//     against the actual SUV asset images.
const SEDAN_ANCHORS: Record<VehicleColor, Record<DetectorPlacement, PlateAnchor>> = {

  blue: {
    // Straight-on frontal view. Camera elevated ~2–3 m, downward tilt.
    center_front: {
      xPct: 0.445, yPct: 0.680, wPct: 0.100, hPct: 0.080,
      rotateDeg: 0, skewXDeg: 0, skewYDeg: 0, side: 'front',
    },
    // Angled view from driver's side (front-left).
    driver_front: {
      xPct: 0.240, yPct: 0.678, wPct: 0.090, hPct: 0.060,
      rotateDeg: 10, skewXDeg: 10, skewYDeg: 0, side: 'front',
    },
    // Angled view from passenger's side (front-right).
    passenger_front: {
      xPct: 0.620, yPct: 0.645, wPct: 0.100, hPct: 0.065,
      rotateDeg: -6, skewXDeg: 0, skewYDeg: 0, side: 'front',
    },
    // Straight-on rear view.
    center_back: {
      xPct: 0.445, yPct: 0.580, wPct: 0.110, hPct: 0.075,
      rotateDeg: 0, skewXDeg: 0, skewYDeg: 0, side: 'rear',
    },
    // Angled view from driver's side of rear face.
    driver_back: {
      xPct: 0.595, yPct: 0.520, wPct: 0.09, hPct: 0.070,
      rotateDeg: -3, skewXDeg: -3, skewYDeg: 0, side: 'rear',
    },
    // Angled view from passenger's side of rear face.
    passenger_back: {
      xPct: 0.275, yPct: 0.540, wPct: 0.120, hPct: 0.070,
      rotateDeg: 5, skewXDeg: 2, skewYDeg: 0, side: 'rear',
    },
  },

  red: {
    // Measured ~+5.5px x, -13px y vs. blue on the 1536×1024 canvas.
    center_front: {
      xPct: 0.4486, yPct: 0.6673, wPct: 0.100, hPct: 0.080,
      rotateDeg: 0, skewXDeg: 0, skewYDeg: 0, side: 'front',
    },
    driver_front: {
      xPct: 0.262, yPct: 0.670, wPct: 0.090, hPct: 0.060,
      rotateDeg: 8, skewXDeg: 10, skewYDeg: 0, side: 'front',
    },
    passenger_front: {
      xPct: 0.620, yPct: 0.645, wPct: 0.100, hPct: 0.065,
      rotateDeg: -6, skewXDeg: 0, skewYDeg: 0, side: 'front',
    },
    center_back: {
      xPct: 0.445, yPct: 0.580, wPct: 0.110, hPct: 0.075,
      rotateDeg: 0, skewXDeg: 0, skewYDeg: 0, side: 'rear',
    },
    driver_back: {
      xPct: 0.630, yPct: 0.530, wPct: 0.097, hPct: 0.070,
      rotateDeg: -4, skewXDeg: -3, skewYDeg: 0, side: 'rear',
    },
    passenger_back: {
      xPct: 0.270, yPct: 0.550, wPct: 0.100, hPct: 0.070,
      rotateDeg: 5, skewXDeg: 2, skewYDeg: 0, side: 'rear',
    },
  },

  gray: {
    // Measured ~+5.5px x, -12.5px y vs. blue on the 1536×1024 canvas.
    center_front: {
      xPct: 0.4486, yPct: 0.6678, wPct: 0.100, hPct: 0.080,
      rotateDeg: 0, skewXDeg: 0, skewYDeg: 0, side: 'front',
    },
    driver_front: {
      xPct: 0.262, yPct: 0.670, wPct: 0.090, hPct: 0.060,
      rotateDeg: 8, skewXDeg: 10, skewYDeg: 0, side: 'front',
    },
    passenger_front: {
      xPct: 0.620, yPct: 0.645, wPct: 0.100, hPct: 0.065,
      rotateDeg: -6, skewXDeg: 0, skewYDeg: 0, side: 'front',
    },
    center_back: {
      xPct: 0.445, yPct: 0.540, wPct: 0.115, hPct: 0.085,
      rotateDeg: 0, skewXDeg: 0, skewYDeg: 0, side: 'rear',
    },
    driver_back: {
      xPct: 0.630, yPct: 0.530, wPct: 0.097, hPct: 0.070,
      rotateDeg: -4, skewXDeg: -3, skewYDeg: 0, side: 'rear',
    },
    passenger_back: {
      xPct: 0.270, yPct: 0.570, wPct: 0.100, hPct: 0.070,
      rotateDeg: 5, skewXDeg: 2, skewYDeg: 0, side: 'rear',
    },
  },
};

/**
 * SUV anchors — INITIAL values, copied from SEDAN_ANCHORS as a starting
 * point (written out explicitly, not derived, so each value can be edited
 * in place here without touching SEDAN_ANCHORS). PENDING VISUAL
 * CALIBRATION — see the module doc comment and RECALIBRATION WORKFLOW
 * above. Edit freely; nothing else in the codebase depends on these
 * matching sedan's values.
 */
const SUV_ANCHORS: Record<VehicleColor, Record<DetectorPlacement, PlateAnchor>> = {
  blue: {
    center_front: {
      xPct: 0.430, yPct: 0.750, wPct: 0.135, hPct: 0.090,
      rotateDeg: 0, skewXDeg: 0, skewYDeg: 0, side: 'front',
    },
    driver_front: {
      xPct: 0.250, yPct: 0.758, wPct: 0.110, hPct: 0.070,
      rotateDeg: 9, skewXDeg: 10, skewYDeg: 0, side: 'front',
    },
    passenger_front: {
      xPct: 0.655, yPct: 0.745, wPct: 0.120, hPct: 0.075,
      rotateDeg: -7, skewXDeg: -5, skewYDeg: 0, side: 'front',
    },
    center_back: {
      xPct: 0.435, yPct: 0.590, wPct: 0.130, hPct: 0.075,
      rotateDeg: 0, skewXDeg: 0, skewYDeg: 0, side: 'rear',
    },
    driver_back: {
      xPct: 0.655, yPct: 0.550, wPct: 0.12, hPct: 0.070,
      rotateDeg: -8, skewXDeg: -3, skewYDeg: 0, side: 'rear',
    },
    passenger_back: {
      xPct: 0.235, yPct: 0.550, wPct: 0.110, hPct: 0.070,
      rotateDeg: 10, skewXDeg: 2, skewYDeg: 0, side: 'rear',
    },
  },

  red: {
    center_front: {
      xPct: 0.430, yPct: 0.750, wPct: 0.135, hPct: 0.090,
      rotateDeg: 0, skewXDeg: 0, skewYDeg: 0, side: 'front',
    },
    driver_front: {
      xPct: 0.250, yPct: 0.758, wPct: 0.110, hPct: 0.070,
      rotateDeg: 9, skewXDeg: 10, skewYDeg: 0, side: 'front',
    },
    passenger_front: {
      xPct: 0.655, yPct: 0.745, wPct: 0.120, hPct: 0.075,
      rotateDeg: -7, skewXDeg: 0, skewYDeg: 0, side: 'front',
    },
    center_back: {
      xPct: 0.435, yPct: 0.590, wPct: 0.130, hPct: 0.075,
      rotateDeg: 0, skewXDeg: 0, skewYDeg: 0, side: 'rear',
    },
    driver_back: {
      xPct: 0.655, yPct: 0.550, wPct: 0.12, hPct: 0.070,
      rotateDeg: -8, skewXDeg: -3, skewYDeg: 0, side: 'rear',
    },
    passenger_back: {
      xPct: 0.235, yPct: 0.550, wPct: 0.110, hPct: 0.070,
      rotateDeg: 10, skewXDeg: 2, skewYDeg: 0, side: 'rear',
    },
  },

  gray: {
    center_front: {
      xPct: 0.426, yPct: 0.750, wPct: 0.145, hPct: 0.090,
      rotateDeg: 0, skewXDeg: 0, skewYDeg: 0, side: 'front',
    },
    driver_front: {
      xPct: 0.250, yPct: 0.758, wPct: 0.110, hPct: 0.070,
      rotateDeg: 9, skewXDeg: 10, skewYDeg: 0, side: 'front',
    },
    passenger_front: {
      xPct: 0.655, yPct: 0.745, wPct: 0.120, hPct: 0.075,
      rotateDeg: -7, skewXDeg: 0, skewYDeg: 0, side: 'front',
    },
    center_back: {
      xPct: 0.435, yPct: 0.590, wPct: 0.130, hPct: 0.075,
      rotateDeg: 0, skewXDeg: 0, skewYDeg: 0, side: 'rear',
    },
    driver_back: {
      xPct: 0.655, yPct: 0.550, wPct: 0.12, hPct: 0.070,
      rotateDeg: -8, skewXDeg: -3, skewYDeg: 0, side: 'rear',
    },
    passenger_back: {
      xPct: 0.235, yPct: 0.550, wPct: 0.110, hPct: 0.070,
      rotateDeg: 10, skewXDeg: 2, skewYDeg: 0, side: 'rear',
    },
  },
};

export const PLATE_ANCHORS_BY_TYPE_AND_COLOR: Record<VehicleType, Record<VehicleColor, Record<DetectorPlacement, PlateAnchor>>> = {
  sedan: SEDAN_ANCHORS,
  suv: SUV_ANCHORS,
};

/** Backwards-compatible alias — the sedan/'blue' anchor set on its own. */
export const PLATE_ANCHORS: Record<DetectorPlacement, PlateAnchor> = SEDAN_ANCHORS.blue;

/**
 * Resolves the plate anchor to use for a given vehicle type + color +
 * placement. Every (type, color, placement) triple in
 * PLATE_ANCHORS_BY_TYPE_AND_COLOR is a full, independent value — no merging
 * happens here.
 */
export function getPlateAnchor(type: VehicleType, color: VehicleColor, placement: DetectorPlacement): PlateAnchor {
  return PLATE_ANCHORS_BY_TYPE_AND_COLOR[type][color][placement];
}

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
