/**
 * passengerBack.config.ts — Scene config for passenger_back placement.
 *
 * All values are independent — do NOT reference INCOMING/AWAY globals.
 *
 * Road geometry (must match PassengerBackScene.tsx constants):
 *   RL_FAR  = VP_X + 300 = 700
 *   RR_FAR  = VP_X + 580 = 980
 *   RL_NEAR = SCENE_W × 0.125 = 100
 *   RR_NEAR = SCENE_W × 0.830 = 664
 *
 * Direction: 'away' — car enters from below-left (t≈1, near/bottom-left) and
 * recedes toward the upper-right horizon (t→0, far/small).
 *
 * xNear (t=1, bottom-left of scene) → xFar (t=0, upper-right horizon).
 * As t decreases, car moves LEFT → RIGHT (diagonal away from camera).
 */
import type { SceneRenderConfig } from './types';
import { VP_X, SCENE_W }          from '../../../../../utils/depth';

// ── Road constants (must match PassengerBackScene.tsx) ───────────────────────
const PB_RL_FAR  = VP_X + 300;
const PB_RR_FAR  = VP_X + 580;
const PB_RL_NEAR = SCENE_W * 0.125;
const PB_RR_NEAR = SCENE_W * 0.830;

const PB_X_OFFSET = 240;  // shift the entire motion path right
const PB_CX_FAR  = (PB_RL_FAR + PB_RR_FAR) / 2 + PB_X_OFFSET;   //  1060 (upper-right horizon)
const PB_CX_NEAR = (PB_RL_NEAR + PB_RR_NEAR) / 2 + PB_X_OFFSET;  //   602 (lower-left, near camera)

export const passengerBackConfig: SceneRenderConfig = {
  direction: 'away',

  vehicle: {
    spawnT:      0.94,   // must be > decelStart (0.97)
    readingT:    0.93,   // t where car stops
    gateT:       0.45,   // matches visual gate (gate.t and scene PB_GATE_T)
    decelOffset: 0.009,   // decelStart = 0.97 — between spawnT(0.98) and readingT(0.93) ✓
    finalT:      0.84,   // afterStop runs 0.93→0.80 (0.13 units), then final for the rest

    xFar:  PB_CX_FAR,    //  1060 — car disappears upper-right
    xNear: PB_CX_NEAR,   //   602 — car enters lower-left

    linearMotion:       true,   // diagonal road — constant lateral rate throughout
    entryDiagonal:      true,   // entry slide also moves X (car enters from lower-left)
    entryDiagonalScale: 1.0,

    rotationDeg: -6,     // same road tilt as driver_front (mirrored road, same angle)

    speed: {
      initial:   { min: 0.013, max: 0.30  },
      stopping:  { min: 0.010, max: 0.40  },
      afterStop: { min: 0.007, max: 0.06  },   // brief transition before final phase
      final:     { min: 0.045, max: 0.15  },
    },
    carScale: {
      initial:   1.39,
      stopping:  1.35,
      atGate:    1.10,
      afterStop: 2.1,   // no dip — smooth ramp into final
      final:     4,   // counteract natural depth shrink during receding phase
    },
  },

  gate: {
    t:                  0.45,   // must match scene PB_GATE_T
    explicitPostRightX: 410,
    armDirection:       'right',
    openAngleDeg:        84,
    closedAngleDeg:      0,
    armScale:            1.7,
  },
};
