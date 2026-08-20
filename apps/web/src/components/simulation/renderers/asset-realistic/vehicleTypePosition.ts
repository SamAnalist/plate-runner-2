import type { DetectorPlacement, VehicleType } from '@plate-runner/shared';

/**
 * Per-(vehicleType, placement) position nudge, on top of the normal depth/
 * motion-path placement — NOT a replacement for it. Most (type, placement)
 * pairs need no adjustment at all (sedan needs none anywhere, by
 * definition — every scene was calibrated against it), so this table only
 * needs an entry where a specific type visibly sits in the wrong spot for
 * a specific placement.
 *
 * xPct/yPct are fractions of the car's OWN current width/height (carW/carH),
 * not fixed scene pixels — so the nudge scales naturally with the car's
 * size through the whole depth range instead of only looking right at one
 * distance. Positive yPct moves the car down (further into the ground);
 * negative moves it up. Positive xPct moves right; negative moves left.
 *
 * First entry: 'suv' sits visibly too low ("sunken into the ground") in
 * the center_front scene specifically — nudged up. Starting value, not
 * measured precisely; adjust the number directly if it's still off once
 * seen on screen. Add more (type, placement) entries here the same way if
 * other scenes turn out to need it too — don't special-case this in
 * VehicleAssetLayer.tsx, just add a table entry.
 */
export const VEHICLE_TYPE_POSITION_OFFSET: Partial<Record<VehicleType, Partial<Record<DetectorPlacement, { xPct: number; yPct: number }>>>> = {
  suv: {
    center_front: { xPct: 0, yPct: -0.13 },
  },
};

/** Looks up the (xPct, yPct) nudge for a (type, placement) pair — {0, 0} if none is defined. */
export function getVehicleTypePositionOffset(type: VehicleType, placement: DetectorPlacement): { xPct: number; yPct: number } {
  return VEHICLE_TYPE_POSITION_OFFSET[type]?.[placement] ?? { xPct: 0, yPct: 0 };
}
