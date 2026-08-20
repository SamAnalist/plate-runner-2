import type { VehicleType } from '@plate-runner/shared';

/**
 * Uniform size multiplier applied on top of each scene-config's
 * hand-calibrated per-phase `carScale` curve (see scene-configs/*.config.ts)
 * — NOT a replacement for it. The per-placement carScale values stay the
 * single source of truth for how the car grows/shrinks through a run;
 * this just scales the whole curve up or down for a given vehicle type,
 * so e.g. the SUV (a physically larger body than the sedan) renders
 * slightly bigger at every phase/placement without duplicating all six
 * scene configs per vehicle type.
 *
 * `1` = no change (the sedan is the baseline every scene config was
 * calibrated against). The `suv` value is an approximation, not measured
 * against the real asset geometry — adjust here (a single number) if the
 * SUV still looks visibly too small/large once seen on screen; this does
 * NOT need per-placement tuning the way plate anchors do, since it's a
 * uniform multiplier applied identically everywhere.
 */
export const VEHICLE_TYPE_SCALE_MULTIPLIER: Record<VehicleType, number> = {
  sedan: 1,
  suv: 0.85,
};
