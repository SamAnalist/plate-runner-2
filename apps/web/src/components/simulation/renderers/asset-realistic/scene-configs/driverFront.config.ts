/**
 * driverFront.config.ts — Scene config for driver_front placement.
 *
 * Camera on driver/left side, looking diagonally inward (incoming direction).
 *
 * DriverFrontScene uses a shifted road VP (upper-right) giving a genuinely
 * diagonal perspective:
 *
 *   RL_FAR  = VP_X + 320 = 720    road left at horizon (upper-right)
 *   RR_FAR  = VP_X + 450 = 850    road right at horizon (exits scene right)
 *   RL_NEAR = SCENE_W * 0.125 = 100   road left at bottom
 *   RR_NEAR = SCENE_W * 0.830 = 664   road right at bottom
 *
 * Vehicle X path follows the road center:
 *   xFar  = (720 + 850) / 2 = 785   — car starts upper-right at horizon
 *   xNear = (100 + 664) / 2 = 382   — car arrives lower-left near camera
 *
 * Gate post uses an explicit X derived from the diagonal road's right edge at
 * GATE_T, rather than the global getDepthValues result (which uses the center
 * road geometry and would be ~8px off at this depth).
 */
import type { SceneRenderConfig } from './types';
import { INCOMING }               from '../../../../../config/sceneParams';
import { VP_X, SCENE_W, lerp }    from '../../../../../utils/depth';

// ── DriverFrontScene road constants (must match DriverFrontScene.tsx) ─────────
const DF_RL_FAR  = VP_X + 380;          // 720
const DF_RR_FAR  = VP_X + 490;          // 850
const DF_RL_NEAR = SCENE_W * 0.125;     // 100
const DF_RR_NEAR = SCENE_W * 0.830;     // 664

// Road center at horizon and near edge — defines the diagonal vehicle path
const DF_CX_FAR  = (DF_RL_FAR + DF_RR_FAR) / 2;    // 785
const DF_CX_NEAR = (DF_RL_NEAR + DF_RR_NEAR) / 2;   // 382

// Gate road right at GATE_T — used as explicit gate post anchor
const DF_GATE_POST_RIGHT_X = Math.round(
  lerp(DF_RR_FAR, DF_RR_NEAR, INCOMING.gateT),       // ≈ 666 at t=0.99
);

export const driverFrontConfig: SceneRenderConfig = {
  direction: 'incoming',

  vehicle: {
    spawnT:      INCOMING.spawnT,
    readingT:    INCOMING.readingT,
    gateT:       INCOMING.gateT,
    decelOffset: INCOMING.decelOffset,
    // Diagonal road center — car sweeps right-to-left as it approaches camera.
    xFar:  DF_CX_FAR,    // 785 — horizon, upper-right
    xNear: DF_CX_NEAR,   // 382 — near edge, lower-left
  },

  gate: {
    t:                  INCOMING.gateT,
    // Explicit post position aligned to DriverFrontScene's diagonal road right edge.
    explicitPostRightX: DF_GATE_POST_RIGHT_X,  // ≈ 666
    armDirection:       'left',
    openAngleDeg:        84,
    closedAngleDeg:      0,
  },
};
