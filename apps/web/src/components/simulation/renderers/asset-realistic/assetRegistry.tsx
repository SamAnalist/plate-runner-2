/**
 * Asset registry — one raster entry per (VehicleColor, AssetViewKey).
 *
 * CURRENT STATE: camera-aware LPR/ANPR PNG assets installed for all three
 *   colors ('blue', 'red', 'gray'). All eighteen views are 1536×1024 RGB
 *   images rendered from a virtual camera at 2–3 m height with a downward
 *   tilt — matching a real parking access/exit camera perspective. Each
 *   image contains a blank plate area for the DynamicPlateOverlay to render
 *   live plate text on top of.
 *
 * Files live at: public/assets/vehicles/main-car/<color>/<view>.png
 *
 * getVehicleAsset() still falls back to the blue asset for any (color,
 * placement) pair that's missing from VEHICLE_ASSET_REGISTRY, reporting
 * fallbackUsed: true — see docs/VEHICLE_COLOR_VARIANTS.md for the fallback
 * policy and how to add a new color's assets later (just populate that
 * color's object below — VehicleAssetLayer and this resolver need no
 * changes).
 *
 * TO UPDATE AN ASSET:
 *   Replace the PNG file and update naturalW/naturalH if dimensions change.
 *   Re-calibrate PlateAnchor in plateAnchors.ts against the new image geometry.
 */
import type { VehicleColor } from '@plate-runner/shared';
import type { AssetEntry, AssetViewKey } from './types';

/** These registries only ever hold raster entries — narrowed so callers don't need a type guard. */
type RasterAssetEntry = Extract<AssetEntry, { type: 'raster' }>;

const BLUE_ASSETS: Record<AssetViewKey, RasterAssetEntry> = {

  center_front: {
    type:     'raster',
    src:      '/assets/vehicles/main-car/blue/center_front.png',
    naturalW: 1536,
    naturalH: 1024,
  },

  driver_front: {
    type:     'raster',
    src:      '/assets/vehicles/main-car/blue/driver_front.png',
    naturalW: 1536,
    naturalH: 1024,
  },

  passenger_front: {
    type:     'raster',
    src:      '/assets/vehicles/main-car/blue/passenger_front.png',
    naturalW: 1536,
    naturalH: 1024,
  },

  center_back: {
    type:     'raster',
    src:      '/assets/vehicles/main-car/blue/center_back.png',
    naturalW: 1536,
    naturalH: 1024,
  },

  driver_back: {
    type:     'raster',
    src:      '/assets/vehicles/main-car/blue/driver_back.png',
    naturalW: 1536,
    naturalH: 1024,
  },

  passenger_back: {
    type:     'raster',
    src:      '/assets/vehicles/main-car/blue/passenger_back.png',
    naturalW: 1536,
    naturalH: 1024,
  },
};

const RED_ASSETS: Record<AssetViewKey, RasterAssetEntry> = {

  center_front: {
    type:     'raster',
    src:      '/assets/vehicles/main-car/red/center_front.png',
    naturalW: 1536,
    naturalH: 1024,
  },

  driver_front: {
    type:     'raster',
    src:      '/assets/vehicles/main-car/red/driver_front.png',
    naturalW: 1536,
    naturalH: 1024,
  },

  passenger_front: {
    type:     'raster',
    src:      '/assets/vehicles/main-car/red/passenger_front.png',
    naturalW: 1536,
    naturalH: 1024,
  },

  center_back: {
    type:     'raster',
    src:      '/assets/vehicles/main-car/red/center_back.png',
    naturalW: 1536,
    naturalH: 1024,
  },

  driver_back: {
    type:     'raster',
    src:      '/assets/vehicles/main-car/red/driver_back.png',
    naturalW: 1536,
    naturalH: 1024,
  },

  passenger_back: {
    type:     'raster',
    src:      '/assets/vehicles/main-car/red/passenger_back.png',
    naturalW: 1536,
    naturalH: 1024,
  },
};

const GRAY_ASSETS: Record<AssetViewKey, RasterAssetEntry> = {

  center_front: {
    type:     'raster',
    src:      '/assets/vehicles/main-car/gray/center_front.png',
    naturalW: 1536,
    naturalH: 1024,
  },

  driver_front: {
    type:     'raster',
    src:      '/assets/vehicles/main-car/gray/driver_front.png',
    naturalW: 1536,
    naturalH: 1024,
  },

  passenger_front: {
    type:     'raster',
    src:      '/assets/vehicles/main-car/gray/passenger_front.png',
    naturalW: 1536,
    naturalH: 1024,
  },

  center_back: {
    type:     'raster',
    src:      '/assets/vehicles/main-car/gray/center_back.png',
    naturalW: 1536,
    naturalH: 1024,
  },

  driver_back: {
    type:     'raster',
    src:      '/assets/vehicles/main-car/gray/driver_back.png',
    naturalW: 1536,
    naturalH: 1024,
  },

  passenger_back: {
    type:     'raster',
    src:      '/assets/vehicles/main-car/gray/passenger_back.png',
    naturalW: 1536,
    naturalH: 1024,
  },
};

/** Color-keyed asset registry. All three colors now have full asset sets. */
export const VEHICLE_ASSET_REGISTRY: Record<VehicleColor, Partial<Record<AssetViewKey, RasterAssetEntry>>> = {
  blue: BLUE_ASSETS,
  red:  RED_ASSETS,
  gray: GRAY_ASSETS,
};

/** Backwards-compatible flat export — always the blue set. Prefer getVehicleAsset() for new code. */
export const ASSET_REGISTRY: Record<AssetViewKey, RasterAssetEntry> = BLUE_ASSETS;

export interface VehicleAsset {
  src: string;
  width: number;
  height: number;
  /** True when the requested color had no asset for this placement and the blue asset was used instead. */
  fallbackUsed: boolean;
}

/**
 * Resolves the asset to render for a given vehicle color + detector placement.
 * Falls back to the blue asset (same placement) when the requested color has
 * no asset yet — see VEHICLE_ASSET_REGISTRY above.
 */
export function getVehicleAsset({
  color,
  placement,
}: {
  color: VehicleColor;
  placement: AssetViewKey;
}): VehicleAsset {
  const entry = VEHICLE_ASSET_REGISTRY[color][placement];
  const resolved = entry ?? BLUE_ASSETS[placement];
  return {
    src: resolved.src,
    width: resolved.naturalW,
    height: resolved.naturalH,
    fallbackUsed: !entry,
  };
}
