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
    readingT:    0.905,   // t where car stops
    // Own entry-slide threshold (overrides the shared global AWAY.entryT=0.90
    // — see entryT in types.ts). Equal to readingT so the "sliding up from
    // off-screen" entry offset is 100% resolved by the time the car reaches
    // its stop position — otherwise a residual chunk of that offset collapses
    // abruptly right when the car resumes after the gate opens (visible as a
    // jump/teleport in the t=0.925→0.90ish range).
    entryT:      0.86,
    gateT:       0.45,   // matches visual gate (gate.t and scene PB_GATE_T)
    decelOffset: 0.02,   // decelStart = 0.97 — between spawnT(0.98) and readingT(0.93) ✓
    // Equal to readingT on purpose: the 'afterStop' phase's window
    // (finalT < t <= readingT) becomes zero-width, so the instant the car
    // resumes after the gate opens it goes straight to 'final' speed — no
    // separate afterStop stage. speed.afterStop/carScale.afterStop below are
    // now dead values for this scene (kept only because the type requires
    // them) — tune speed.final / carScale.final instead.
    finalT:      0.86,

    xFar:  PB_CX_FAR,    //  1060 — car disappears upper-right
    xNear: PB_CX_NEAR,   //   602 — car enters lower-left

    linearMotion:       true,   // diagonal road — constant lateral rate throughout
    entryDiagonal:      true,   // entry slide also moves X (car enters from lower-left)
    entryDiagonalScale: 1.0,

    rotationDeg: -6,     // same road tilt as driver_front (mirrored road, same angle)

    speed: {
      initial:   { min: 0.015, max: 0.04  },
      stopping:  { min: 0.01, max: 0.04  },
      afterStop: { min: 0.008, max: 0.03  },   // brief transition before final phase
      final:     { min: 0.07, max: 0.25  },
    },
    carScale: {
      initial:   1.44,
      stopping:  1.37,
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
