/**
 * driverFront.config.ts — Scene config for driver_front placement.
 *
 * All values are independent — do NOT reference INCOMING/AWAY globals.
 * Tune everything here without affecting other placements.
 *
 * Road geometry (must match DriverFrontScene.tsx constants):
 *   RL_FAR  = VP_X + 900   road left at horizon
 *   RR_FAR  = VP_X + 428   road right at horizon
 *   RL_NEAR = SCENE_W * 0.255   road left at bottom
 *   RR_NEAR = SCENE_W * 1.530   road right at bottom (exits right)
 *
 * Vehicle path: road center at horizon → road center at bottom.
 *   xFar  = (RL_FAR + RR_FAR) / 2
 *   xNear = (RL_NEAR + RR_NEAR) / 2
 *
 * linearMotion: true — X moves at constant rate throughout, so the car
 * follows the diagonal road direction all the way to the gate.
 */
import type { SceneRenderConfig } from './types';
import { VP_X, SCENE_W }          from '../../../../../utils/depth';

// ── Road constants (must match DriverFrontScene.tsx) ─────────────────────────
const DF_RL_FAR  = VP_X + 900;
const DF_RR_FAR  = VP_X + 428;
const DF_RL_NEAR = SCENE_W * 0.255;
const DF_RR_NEAR = SCENE_W * 1.530;

const DF_CX_FAR  = (DF_RL_FAR + DF_RR_FAR) / 2;
const DF_CX_NEAR = (DF_RL_NEAR + DF_RR_NEAR) / 2;

export const driverFrontConfig: SceneRenderConfig = {
  direction: 'incoming',

  vehicle: {
    spawnT:       0.07,   // t where car first appears (lower = farther back)
    readingT:     0.93,   // t where car stops at gate for plate reading
    gateT:        0.93,   // t of gate visual position (exit range = 7% of t, smooth ramp)
    decelOffset:  0.14,   // t-units of decel zone before readingT
    finalT:       0,      // incoming — not used

    xFar:  DF_CX_FAR,
    xNear: DF_CX_NEAR,

    linearMotion:       true,  // keep moving diagonally throughout — no easeOut
    yFar:               0,    // road extends to top of screen — car spawns from y=0
    exitDiagonal:       true, // exit slide follows road diagonal, not straight down
    exitDiagonalScale:  1.6,  // amplify lateral drift so car exits further left

    rotationDeg: -6,      // tilt to match diagonal road

    speed: {
      initial:   { min: 0.033, max: 0.30  },
      stopping:  { min: 0.028, max: 0.38  },
      afterStop: { min: 0.023, max: 0.060  },
      final:     { min: 0.001, max: 0.021 },
    },
    carScale: {
      initial:   1.4,
      stopping:  1.4,
      atGate:    1.4,
      afterStop: 1.4,   // same as stopping — no scale change while waiting at gate
      final:     1.9,   // gradual ramp during exit (now over 10% of t range)
    },
  },

  gate: {
    t:                  0.93,
    explicitPostRightX: 140,
    armDirection:       'right',
    openAngleDeg:        84,
    closedAngleDeg:      0,
  },
};
