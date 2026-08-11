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
  SCENE_H,
  GATE_T,
  getDepthValues,
  lerp,
} from '../../../../utils/depth';
import { INCOMING, AWAY } from '../../../../config/sceneParams';
import { getSceneConfig }  from './scene-configs/getSceneConfig';

// ─── POV entry / exit (sourced from sceneParams.ts) ──────────────────────────
export const POV_SPAWN_T      = INCOMING.spawnT;
export const POV_EXIT_T       = GATE_T;          // always in sync with gate
export const POV_ENTRY_T_AWAY = AWAY.entryT;

/**
 * Opacity is always 1 — no fade on entry or exit.
 * The car appears at the horizon naturally (tiny) and exits physically.
 */
export function getPovOpacity(_t: number): number {
  return 1;
}

/**
 * Additional Y offset (scene pixels) to physically slide the car in/out of
 * the bottom edge of the scene.
 *
 * Incoming exit (t > POV_EXIT_T):
 *   Slides the car DOWN until its top edge clears SCENE_H (fully off-screen).
 *
 * Away entry (t > POV_ENTRY_T_AWAY):
 *   Car starts off-screen below and slides UP into view as t decreases.
 *   At t=1.0 the car is fully below the frame; at POV_ENTRY_T_AWAY it is
 *   at its natural depth position with zero offset.
 *
 * @param direction  'incoming' | 'away' — from config.direction
 */
export function getPovYOffset(
  t: number,
  depthY: number,
  carH: number,
  direction: 'incoming' | 'away',
  /** Per-scene gate t — overrides global POV_EXIT_T for incoming exit. */
  exitGateT: number = POV_EXIT_T,
  /** Per-scene entry t — overrides global POV_ENTRY_T_AWAY for away entry. */
  entryT: number = POV_ENTRY_T_AWAY,
): number {
  if (direction === 'incoming' && t > exitGateT) {
    const progress = Math.min((t - exitGateT) / (1 - exitGateT), 1);
    return lerp(0, SCENE_H + 10 - (depthY - carH), progress);
  }
  if (direction === 'away' && t > entryT) {
    // progress: 0 when fully on-screen (entryT), 1 when fully off-screen (t=1.0)
    const progress = Math.min((t - entryT) / (1 - entryT), 1);
    return lerp(0, SCENE_H + 10 - (depthY - carH), progress);
  }
  return 0;
}

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

// ─── Path registry ────────────────────────────────────────────────────────────
// Sourced from per-scene configs (scene-configs/*.config.ts).
// driver_front uses a genuinely diagonal path (xFar=785, xNear=382).
// All other scenes retain their previous centred/offset values.

export const VIEW_MOTION_PATHS: Record<DetectorPlacement, ViewMotionPath> = (() => {
  const placements: DetectorPlacement[] = [
    'center_front', 'center_back',
    'driver_front', 'driver_back',
    'passenger_front', 'passenger_back',
  ];
  return Object.fromEntries(
    placements.map(p => {
      const cfg = getSceneConfig(p);
      return [p, { xFar: cfg.vehicle.xFar, xNear: cfg.vehicle.xNear }];
    }),
  ) as Record<DetectorPlacement, ViewMotionPath>;
})();

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
  const linear = getSceneConfig(placement).vehicle.linearMotion ?? false;
  return lerp(xFar, xNear, linear ? t : easeOut(t));
}

// ─── Debug support ────────────────────────────────────────────────────────────

export interface MotionPathPoint {
  x:     number;
  y:     number;
  t:     number;
  label: string;
}

// Sample points — include key POV transition t-values
const SAMPLE_T = [0.00, POV_SPAWN_T, 0.28, 0.46, GATE_T, 0.65, POV_EXIT_T, 0.98];

const LABEL_AT: Partial<Record<string, string>> = {
  '0.00':                       'FAR',
  [POV_SPAWN_T.toFixed(2)]:     'SPAWN',
  '0.46':                       'READ',
  [GATE_T.toFixed(2)]:          'GATE',
  [POV_EXIT_T.toFixed(2)]:      'EXIT',
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
