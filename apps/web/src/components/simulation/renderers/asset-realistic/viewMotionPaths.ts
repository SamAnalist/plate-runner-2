/**
 * viewMotionPaths.ts — view-aware lateral motion paths for the asset-realistic renderer.
 *
 * ── PROBLEM ──────────────────────────────────────────────────────────────────
 * The standard depth model (depth.ts) places all vehicles along a centred
 * perspective axis: roadCenterX is always 400, the horizontal offset for
 * driver/passenger placements is only ±10 % of roadWidth (~28px at the gate).
 * For 3/4-angle camera placements the car moves almost purely on the Y axis,
 * which contradicts the diagonal composition baked into the asset image.
 *
 * ── SOLUTION ─────────────────────────────────────────────────────────────────
 * Each DetectorPlacement gets a ViewMotionPath { xFar, xNear } pair.
 * getViewAwareX(t, placement) interpolates between those values using an
 * easeOut curve so the lateral sweep decelerates near the reading position.
 *
 * Y and scale are unchanged — still from getDepthValues(t).
 * Only X is overridden. This function replaces getVehicleX() inside
 * VehicleAssetLayer for the asset-realistic renderer only; all other renderers
 * continue using the centred depth model.
 *
 * ── DIRECTION HANDLING ───────────────────────────────────────────────────────
 * The function is direction-agnostic.
 *   incoming (t: 0 → 1): car sweeps from xFar toward xNear  (approaches)
 *   away     (t: 1 → 0): car sweeps from xNear back toward xFar  (recedes)
 * Both feel natural because lateral position is a function of depth, not
 * of animation intent.
 *
 * ── GATE ALIGNMENT ───────────────────────────────────────────────────────────
 * Gate post is fixed at roadRight(GATE_T ≈ 0.52) ≈ 540.
 * Gate arm extends LEFT across the full road width (~270px at that depth).
 * At GATE_T, driver/passenger cars are within ±60px of centre (340–460px).
 * Road spans 260–540px at that depth → all cars remain under the arm. ✓
 *
 * ── VALUE CALIBRATION ────────────────────────────────────────────────────────
 * For driver/passenger views:
 *   xFar  = VP_X ± 8   (car barely offset at vanishing depth)
 *   xNear = VP_X ± 75  (car clearly offset at near edge)
 *
 * At reading position (GATE_T ≈ 0.52, easeOut ≈ 0.77):
 *   driver:    x ≈ 460 px  (+60 from centre)
 *   passenger: x ≈ 340 px  (−60 from centre)
 *
 * Car half-width at gate ≈ 83px → car spans [377, 543] / [257, 423].
 * Road right at gate ≈ 540px → driver view 3px overlap — visually imperceptible.
 * Re-tune xNear if the road geometry constants change in depth.ts.
 */

import type { DetectorPlacement } from '@plate-runner/shared';
import {
  VP_X,
  GATE_T,
  getDepthValues,
  lerp,
} from '../../../../utils/depth';

// ─── Easing ──────────────────────────────────────────────────────────────────

/** Ease-out quadratic: fast start, decelerates smoothly toward the target. */
function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

// ─── Path type ────────────────────────────────────────────────────────────────

/**
 * Horizontal sweep descriptor for a single detector placement.
 *
 *  center views:    xFar ≈ xNear ≈ VP_X — purely depth motion
 *  driver views:    xNear > xFar — sweeps RIGHT (camera is to the LEFT)
 *  passenger views: xNear < xFar — mirror sweep LEFT
 */
export interface ViewMotionPath {
  /** Vehicle centre X at t ≈ 0 (vanishing-point depth, car tiny/far) */
  xFar: number;
  /** Vehicle centre X at t ≈ 1 (near edge of scene, car large/close) */
  xNear: number;
}

// ─── Path registry ─────────────────────────────────────────────────────────

export const VIEW_MOTION_PATHS: Record<DetectorPlacement, ViewMotionPath> = {
  // Straight-on — no lateral sweep needed
  center_front:    { xFar: VP_X,     xNear: VP_X      },
  center_back:     { xFar: VP_X,     xNear: VP_X      },

  // Driver-side: camera on the LEFT → car appears to drift RIGHT as it nears
  driver_front:    { xFar: VP_X + 8, xNear: VP_X + 75 },
  driver_back:     { xFar: VP_X + 8, xNear: VP_X + 75 },

  // Passenger-side: mirror of driver
  passenger_front: { xFar: VP_X - 8, xNear: VP_X - 75 },
  passenger_back:  { xFar: VP_X - 8, xNear: VP_X - 75 },
};

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Returns the vehicle centre X (scene coordinates) at depth t for a given
 * detector placement.
 *
 * Drop-in replacement for getVehicleX() in VehicleAssetLayer only.
 * Other renderers and readability utilities continue using the depth.ts version.
 */
export function getViewAwareX(t: number, placement: DetectorPlacement): number {
  const { xFar, xNear } = VIEW_MOTION_PATHS[placement];
  return lerp(xFar, xNear, easeOut(t));
}

// ─── Debug support ────────────────────────────────────────────────────────────

export interface MotionPathPoint {
  x:     number;
  y:     number;
  t:     number;
  label: string;
}

// Sample points across the full depth range
const SAMPLE_T = [0.04, 0.14, 0.25, 0.36, 0.46, GATE_T, 0.62, 0.75, 0.88, 0.96];

const LABEL_AT: Partial<Record<string, string>> = {
  '0.04':                       'FAR',
  '0.46':                       'READ',
  [GATE_T.toFixed(2)]:          'GATE',
  '0.96':                       'EXIT',
};

/**
 * Returns sampled (x, y) points along the motion path for the debug overlay.
 * Includes labelled key points: FAR, READ, GATE, EXIT.
 */
export function getMotionPathDebugPoints(placement: DetectorPlacement): MotionPathPoint[] {
  return SAMPLE_T.map(t => {
    const { y } = getDepthValues(t);
    const key    = t.toFixed(2);
    return {
      x:     getViewAwareX(t, placement),
      y,
      t,
      label: LABEL_AT[key] ?? '',
    };
  });
}
