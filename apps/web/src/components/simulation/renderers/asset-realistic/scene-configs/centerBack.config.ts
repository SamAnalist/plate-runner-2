/**
 * centerBack.config.ts — Scene config for center_back placement.
 *
 * Camera centred inside parking facility at exit gate, looking outward (away).
 * Road is symmetric; vehicle recedes toward the horizon.
 */
import type { SceneRenderConfig } from './types';
import { AWAY }                   from '../../../../../config/sceneParams';
import { VP_X }                   from '../../../../../utils/depth';

export const centerBackConfig: SceneRenderConfig = {
  direction: 'away',

  vehicle: {
    spawnT:      AWAY.entryT,
    readingT:    AWAY.readingT,
    gateT:       AWAY.gateT,
    decelOffset: AWAY.decelOffset,
    xFar:  VP_X + AWAY.lateral.center.xFar,   // 400
    xNear: VP_X + AWAY.lateral.center.xNear,  // 400
  },

  gate: {
    t:             AWAY.gateT,   // 0.35
    armDirection:  'left',
    openAngleDeg:   84,
    closedAngleDeg: 0,
  },
};
