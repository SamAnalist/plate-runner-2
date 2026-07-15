/**
 * passengerBack.config.ts — Scene config for passenger_back placement.
 *
 * Camera on passenger/right side of exit lane, looking toward exiting cars (away).
 * Mirror counterpart of driverBack.
 *
 * PassengerBackScene uses the same centered road as CenterBackScene.
 * Camera is on the right → car appears slightly left of centre in frame.
 */
import type { SceneRenderConfig } from './types';
import { AWAY }                   from '../../../../../config/sceneParams';
import { VP_X }                   from '../../../../../utils/depth';

export const passengerBackConfig: SceneRenderConfig = {
  direction: 'away',

  vehicle: {
    spawnT:      AWAY.entryT,
    readingT:    AWAY.readingT,
    gateT:       AWAY.gateT,
    decelOffset: AWAY.decelOffset,
    finalT:      AWAY.finalT,   // 0.30
    // Passenger-side offset: camera right → car appears left of centre.
    xFar:        VP_X + AWAY.lateral.passenger.xFar,    // 392
    xNear:       VP_X + AWAY.lateral.passenger.xNear,   // 325
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
