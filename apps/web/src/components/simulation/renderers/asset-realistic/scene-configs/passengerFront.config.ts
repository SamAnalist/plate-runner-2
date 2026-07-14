/**
 * passengerFront.config.ts — Scene config for passenger_front placement.
 *
 * Camera on passenger/right side, looking diagonally inward (incoming direction).
 * Mirror counterpart of driverFront.
 *
 * PassengerFrontScene uses the same centered road as CenterFrontScene
 * (RL_FAR=390, RR_FAR=410, RL_NEAR=140, RR_NEAR=660). The diagonal perspective
 * is conveyed through asymmetric ceiling geometry and tube light sweep, not the
 * road VP. The vehicle therefore uses a small lateral offset from scene centre.
 *
 * Camera is on the right → car appears slightly left of centre in frame.
 * Gate post uses roadRight from the global depth model (no explicit override).
 */
import type { SceneRenderConfig } from './types';
import { INCOMING }               from '../../../../../config/sceneParams';
import { VP_X }                   from '../../../../../utils/depth';

export const passengerFrontConfig: SceneRenderConfig = {
  direction: 'incoming',

  vehicle: {
    spawnT:      INCOMING.spawnT,
    readingT:    INCOMING.readingT,
    gateT:       INCOMING.gateT,
    decelOffset: INCOMING.decelOffset,
    // Passenger-side offset: camera right → car appears left of centre.
    xFar:  VP_X + INCOMING.lateral.passenger.xFar,    // 392
    xNear: VP_X + INCOMING.lateral.passenger.xNear,   // 325
  },

  gate: {
    t:             INCOMING.gateT,   // 0.99
    armDirection:  'left',
    openAngleDeg:   84,
    closedAngleDeg: 0,
  },
};
