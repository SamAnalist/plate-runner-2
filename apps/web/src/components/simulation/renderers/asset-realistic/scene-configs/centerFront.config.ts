/**
 * centerFront.config.ts — Scene config for center_front placement.
 *
 * Camera centred outside parking facility, looking inward (incoming direction).
 * Road is symmetric around VP_X=400; vehicle travels purely on the depth axis.
 * Gate post sits at roadRight from the global depth model — no explicit override.
 */
import type { SceneRenderConfig } from './types';
import { INCOMING }               from '../../../../../config/sceneParams';
import { VP_X }                   from '../../../../../utils/depth';

export const centerFrontConfig: SceneRenderConfig = {
  direction: 'incoming',


  vehicle: {
    spawnT:      0.3,
    readingT:    0.93,
    gateT:       0.99,
    decelOffset: 0.12,
    finalT:      0,   // incoming — never used
    // Centered road — no lateral sweep.
    xFar:        VP_X + INCOMING.lateral.center.xFar,   // 400
    xNear:       VP_X + INCOMING.lateral.center.xNear,  // 400
    rotationDeg: 0,
    speed: {
      initial:   { min: 0.050, max: 0.30  },
      stopping:  { min: 0.050, max: 0.40  },
      afterStop: { min: 0.050, max: 0.18  },
      final:     { min: 0.0004, max: 0.0025 },
    },
    carScale: {
      initial:   1.1,
      stopping:  1.1,
      atGate:    1.1,
      afterStop: 1.1,
      final:     2.7,
    },
  },

  gate: {
    t:             0.99,   // 0.99
    explicitPostRightX: 700,
    // Uses roadRight from getDepthValues — matches CenterFrontScene road exactly.
    armDirection:  'left',
    openAngleDeg:   84,
    closedAngleDeg: 0,
  },
};
