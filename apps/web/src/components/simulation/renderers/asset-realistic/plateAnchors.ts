/**
 * Plate anchors — where the license plate sits within the car asset.
 *
 * Local coordinate space is 100 × 72 units (CAR_LW × CAR_LH).
 * Current plate constants: x=29, y=54, w=42, h=13
 * → xPct = 29/100, yPct = 54/72, wPct = 42/100, hPct = 13/72
 *
 * All six detector placements use the same plate position within the car body.
 * The skew/offset for driver vs passenger is applied externally via the scene
 * transform (skewX), so the anchor does not need a separate value for it.
 *
 * When real raster assets are introduced, these percentages remain valid — they
 * just get multiplied by the actual asset pixel dimensions instead of 100×72.
 */
import type { DetectorPlacement } from '@plate-runner/shared';
import type { PlateAnchor } from './types';

const STANDARD_FRONT: PlateAnchor = {
  xPct:    29 / 100,   // 0.29
  yPct:    54 / 72,    // 0.75
  wPct:    42 / 100,   // 0.42
  hPct:    13 / 72,    // ≈ 0.181
  isFront: true,
};

const STANDARD_REAR: PlateAnchor = {
  xPct:    29 / 100,
  yPct:    54 / 72,
  wPct:    42 / 100,
  hPct:    13 / 72,
  isFront: false,
};

/**
 * Maps every detector placement to its plate anchor.
 *
 * The plate position within the car is the same for all placements.
 * What differs is whether the front or rear plate is shown (isFront).
 */
export const PLATE_ANCHORS: Record<DetectorPlacement, PlateAnchor> = {
  center_front:    STANDARD_FRONT,
  driver_front:    STANDARD_FRONT,
  passenger_front: STANDARD_FRONT,
  center_back:     STANDARD_REAR,
  driver_back:     STANDARD_REAR,
  passenger_back:  STANDARD_REAR,
};

/**
 * Converts a PlateAnchor to absolute pixel coordinates within the car's
 * current local coordinate space (width × height).
 *
 * @param anchor   – anchor percentage values
 * @param carLW    – car local width (default 100)
 * @param carLH    – car local height (default 72)
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
