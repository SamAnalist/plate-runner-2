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
    spawnT:      INCOMING.spawnT,
    readingT:    INCOMING.readingT,
    gateT:       INCOMING.gateT,
    decelOffset: INCOMING.decelOffset,
    finalT:      0,   // incoming — never used
    // Centered road — no lateral sweep.
    xFar:  VP_X + INCOMING.lateral.center.xFar,   // 400
    xNear: VP_X + INCOMING.lateral.center.xNear,  // 400
  },

  gate: {
    t:             INCOMING.gateT,   // 0.99
    // Uses roadRight from getDepthValues — matches CenterFrontScene road exactly.
    armDirection:  'left',
    openAngleDeg:   84,
    closedAngleDeg: 0,
  },
};
