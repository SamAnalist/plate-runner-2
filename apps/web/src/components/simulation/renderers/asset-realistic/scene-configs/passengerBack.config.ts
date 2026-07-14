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
    // Passenger-side offset: camera right → car appears left of centre.
    xFar:  VP_X + AWAY.lateral.passenger.xFar,    // 392
    xNear: VP_X + AWAY.lateral.passenger.xNear,   // 325
  },

  gate: {
    t:             AWAY.gateT,   // 0.35
    armDirection:  'left',
    openAngleDeg:   84,
    closedAngleDeg: 0,
  },
};
