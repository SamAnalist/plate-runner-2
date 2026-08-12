/**
 * centerBack.config.ts — Scene config for center_back placement.
 *
 * Camera centred inside parking facility at exit gate, looking outward (away).
 * Road is symmetric; vehicle recedes toward the horizon.
 */
import type { SceneRenderConfig } from './types';
import { VP_X }                   from '../../../../../utils/depth';

export const centerBackConfig: SceneRenderConfig = {
  direction: 'away',

    // ── Depth / Y positions ────────────────────────────────────────────────────
  /** Gate visual position for the away scene (higher up = smaller t value). */

  vehicle: {
    spawnT:      0.3,
    readingT:    0.9,
    gateT:       0.35,
    decelOffset: 0.05,
    finalT:      0.30,   // 0.30 — below this t, car uses final (slow) speed
    xFar:        VP_X + 0.0,   // 400
    xNear:       VP_X + 0.0,  // 400
    rotationDeg: 0,
    speed: {
      initial:   { min: 0.01, max: 0.09 },
      stopping:  { min: 0.01, max: 0.09 },
      afterStop: { min: 0.12, max: 0.4  },
      final:     { min: 0.1,  max: 0.2  },
    },
    carScale: {
      initial:   1.6,
      stopping:  1.0,
      atGate:    1.0,
      afterStop: 1.0,
      final:     1.0,
    },
  },

  gate: {
    t:             0.35,   // 0.35
    armDirection:  'right',
    explicitPostRightX: 280,
    openAngleDeg:   84,
    closedAngleDeg: 0,
    // Status LED sits a touch lower here than in the other scenes at this
    // post height — nudge it up to match.
    lightYOffset: -2,
  },
};
