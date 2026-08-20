/**
 * driverBack.config.ts — Scene config for driver_back placement.
 *
 * Copy of passengerFront.config.ts's road orientation and gate side (NOT
 * mirrored again) — same pattern as passengerBack.config.ts being an
 * unmirrored copy of driverFront.config.ts. Direction changed to 'away'
 * with the same away-specific fields passengerBack.config.ts uses
 * (entryT, finalT == readingT, etc.).
 *
 * Road geometry (must match DriverBackScene.tsx constants):
 *   RL_FAR  = VP_X - 580   road left at horizon (off-screen left)
 *   RR_FAR  = VP_X - 300   road right at horizon
 *   RL_NEAR = SCENE_W * 0.170   road left at bottom
 *   RR_NEAR = SCENE_W * 0.875   road right at bottom
 */
import type { SceneRenderConfig } from './types';
import { VP_X, SCENE_W }          from '../../../../../utils/depth';

// ── Road constants (must match DriverBackScene.tsx) ───────────────────────────
const DB_RL_FAR  = VP_X - 580;
const DB_RR_FAR  = VP_X - 300;
const DB_RL_NEAR = SCENE_W * 0.170;
const DB_RR_NEAR = SCENE_W * 0.875;

const DB_CX_FAR  = (DB_RL_FAR + DB_RR_FAR) / 2 - 220;
const DB_CX_NEAR = (DB_RL_NEAR + DB_RR_NEAR) / 2 - 220;

export const driverBackConfig: SceneRenderConfig = {
  direction: 'away',

  vehicle: {
    spawnT:      0.94,   // unused — see passengerBack.config.ts's note
    readingT:    0.89,   // t where car stops
    // Same reasoning as passengerBack.config.ts's entryT: must be >= readingT
    // so the away entry-slide offset is fully resolved by the time the car
    // stops, otherwise it collapses abruptly right as the gate opens.
    entryT:      0.84,
    gateT:       0.45,   // matches visual gate (gate.t and scene DB_GATE_T)
    decelOffset: 0.04,
    // Equal to readingT on purpose — see passengerBack.config.ts's note:
    // skips the 'afterStop' phase entirely, straight to 'final' on resume.
    finalT:      0.84,

    xFar:  DB_CX_FAR,
    xNear: DB_CX_NEAR,

    linearMotion:       true,   // diagonal road — constant lateral rate throughout
    entryDiagonal:      true,   // entry slide also moves X (car enters from lower-left)
    entryDiagonalScale: 1.0,

    rotationDeg: 6,      // same road tilt as passenger_front (copy, not mirrored)

    speed: {
      initial:   { min: 0.009, max: 0.04  },
      stopping:  { min: 0.005, max: 0.035  },
      afterStop: { min: 0.01, max: 0.04  },   // dead value — see finalT note above
      final:     { min: 0.12, max: 0.3   },
    },
    carScale: {
      initial:   1.44,
      stopping:  1.40,
      atGate:    1.20,
      afterStop: 2,
      final:     4,   // counteract natural depth shrink during receding phase
    },
  },

  gate: {
    t:                  0.45,   // must match scene DB_GATE_T
    // Post on the road's right edge (roadRight(t=0.45) ≈ 370 with this
    // scene's road constants) — same side as passenger_front's gate.
    explicitPostRightX: 388,
    armDirection:       'left',
    openAngleDeg:        84,
    closedAngleDeg:      0,
    armScale:            1.7,
  },
};
