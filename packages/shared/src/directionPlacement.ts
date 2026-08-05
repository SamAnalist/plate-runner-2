/**
 * Direction ↔ DetectorPlacement constraint rules.
 *
 * Business rule:
 *   incoming — vehicle approaches camera → front face is visible → front placements only
 *   away     — vehicle recedes from camera → rear face is visible  → back placements only
 *
 * There are no valid cross-direction placements (e.g. incoming + center_back is invalid).
 */
import type { Direction, DetectorPlacement } from './types/simulation';

export const PLACEMENTS_BY_DIRECTION: Record<Direction, DetectorPlacement[]> = {
  incoming: ['driver_front', 'center_front', 'passenger_front'],
  away:     ['driver_back',  'center_back',  'passenger_back'],
};

/** All valid detector placements, across both directions. */
export const DETECTOR_PLACEMENTS: DetectorPlacement[] = [
  ...PLACEMENTS_BY_DIRECTION.incoming,
  ...PLACEMENTS_BY_DIRECTION.away,
];

/** Returns the allowed placements for a given direction. */
export function getPlacementsForDirection(direction: Direction): DetectorPlacement[] {
  return PLACEMENTS_BY_DIRECTION[direction];
}

/** True only when the placement is valid for the given direction. */
export function isPlacementAllowedForDirection(
  direction: Direction,
  placement: DetectorPlacement,
): boolean {
  return PLACEMENTS_BY_DIRECTION[direction].includes(placement);
}

/**
 * Maps the current placement to its equivalent when direction changes.
 *
 * Remap table:
 *   driver_front    ↔ driver_back
 *   center_front    ↔ center_back
 *   passenger_front ↔ passenger_back
 *
 * Always returns a valid placement for nextDirection.
 */
export function remapPlacementForDirection(
  current: DetectorPlacement,
  nextDirection: Direction,
): DetectorPlacement {
  const REMAP: Record<DetectorPlacement, DetectorPlacement> = {
    driver_front:    'driver_back',
    center_front:    'center_back',
    passenger_front: 'passenger_back',
    driver_back:     'driver_front',
    center_back:     'center_front',
    passenger_back:  'passenger_front',
  };

  const candidate = nextDirection === 'incoming'
    ? (current.endsWith('_front') ? current : REMAP[current])
    : (current.endsWith('_back')  ? current : REMAP[current]);

  // Defensive: if for any reason candidate is still invalid, fall back to center
  return isPlacementAllowedForDirection(nextDirection, candidate)
    ? candidate
    : (nextDirection === 'incoming' ? 'center_front' : 'center_back');
}
