/**
 * passengerFront.config.ts — Scene config for passenger_front placement.
 *
 * True horizontal mirror of driverFront.config.ts — same elements, same
 * timings/speeds, everything spatial (positions, tilt, gate side) flipped.
 * All values are independent — do NOT reference INCOMING/AWAY globals.
 *
 * Road geometry (must match PassengerFrontScene.tsx constants):
 *   RL_FAR  = VP_X - 580   road left at horizon (off-screen left)
 *   RR_FAR  = VP_X - 300   road right at horizon
 *   RL_NEAR = SCENE_W * 0.170   road left at bottom
 *   RR_NEAR = SCENE_W * 0.875   road right at bottom (exits left)
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

// ── Road constants (must match PassengerFrontScene.tsx) ──────────────────────
const PF_RL_FAR  = VP_X - 580;
const PF_RR_FAR  = VP_X - 400;
const PF_RL_NEAR = SCENE_W * 0.170;
const PF_RR_NEAR = SCENE_W * 0.875;

const PF_CX_FAR  = (PF_RL_FAR + PF_RR_FAR) / 2 - 100;
const PF_CX_NEAR = (PF_RL_NEAR + PF_RR_NEAR) / 2 - 260;

export const passengerFrontConfig: SceneRenderConfig = {
  direction: 'incoming',

  vehicle: {
    spawnT:       0.07,   // t where car first appears (lower = farther back)
    readingT:     0.93,   // t where car stops at gate for plate reading
    gateT:        0.93,   // t of gate visual position (exit range = 7% of t, smooth ramp)
    decelOffset:  0.14,   // t-units of decel zone before readingT
    finalT:       0,      // incoming — not used

    xFar:  PF_CX_FAR,
    xNear: PF_CX_NEAR,

    linearMotion:       true,  // keep moving diagonally throughout — no easeOut
    yFar:               0,    // road extends to top of screen — car spawns from y=0
    exitDiagonal:       true, // exit slide follows road diagonal, not straight down
    exitDiagonalScale:  1.6,  // amplify lateral drift so car exits further right (mirrored)

    rotationDeg: 6,       // tilt to match diagonal road (mirrored sign vs driver_front's -6)

    speed: {
      initial:   { min: 0.033, max: 0.30  },
      stopping:  { min: 0.028, max: 0.38  },
      afterStop: { min: 0.010, max: 0.030  },
      final:     { min: 0.0005, max: 0.0008 },
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
    t:                  1.05,
    // Post on the road's right edge (roadRight(t=1.05) ≈ 735 with this
    // scene's current road constants), arm sweeps left across the lane.
    explicitPostRightX: 758,
    armDirection:       'left',
    openAngleDeg:        84,
    closedAngleDeg:      0,
  },
};
