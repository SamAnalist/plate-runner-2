/**
 * driverBack.config.ts — Scene config for driver_back placement.
 *
 * Camera on driver/left side of exit lane, looking toward exiting cars (away).
 *
 * DriverBackScene uses the same centered road as CenterBackScene
 * (RL_FAR=390, RR_FAR=410, RL_NEAR=140, RR_NEAR=660). The left-side
 * perspective is conveyed through asymmetric ceiling geometry (CL_NEAR_X=60)
 * and warm amber palette — the road VP is standard.
 *
 * Camera is on the left → car appears slightly right of centre in frame.
 */
import type { SceneRenderConfig } from './types';
import { AWAY }                   from '../../../../../config/sceneParams';
import { VP_X }                   from '../../../../../utils/depth';

export const driverBackConfig: SceneRenderConfig = {
  direction: 'away',

  vehicle: {
    spawnT:      AWAY.entryT,
    readingT:    AWAY.readingT,
    gateT:       AWAY.gateT,
    decelOffset: AWAY.decelOffset,
    finalT:      AWAY.finalT,   // 0.30
    // Driver-side offset: camera left → car appears right of centre.
    xFar:        VP_X + AWAY.lateral.driver.xFar,    // 408
    xNear:       VP_X + AWAY.lateral.driver.xNear,   // 475
    rotationDeg: 0,
    speed: {
      initial:   { min: 0.01, max: 0.09 },
      stopping:  { min: 0.01, max: 0.09 },
      afterStop: { min: 0.12, max: 0.4  },
      final:     { min: 0.1,  max: 0.2  },
    },
    carScale: {
      initial:   1.4,
      stopping:  1.0,
      atGate:    1.0,
      afterStop: 1.0,
      final:     1.0,
    },
  },

  gate: {
    t:             AWAY.gateT,   // 0.35
    armDirection:  'left',
    openAngleDeg:   84,
    closedAngleDeg: 0,
  },
};
