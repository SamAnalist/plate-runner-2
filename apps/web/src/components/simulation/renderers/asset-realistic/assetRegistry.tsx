/**
 * Asset registry — one raster entry per (VehicleType, VehicleColor, AssetViewKey).
 *
 * CURRENT STATE: camera-aware LPR/ANPR PNG assets installed for both vehicle
 *   types ('sedan', 'suv') across all three colors ('blue', 'red', 'gray').
 *   All thirty-six views are 1536×1024 RGB images rendered from a virtual
 *   camera at 2–3 m height with a downward tilt — matching a real parking
 *   access/exit camera perspective. Each image contains a blank plate area
 *   for the DynamicPlateOverlay to render live plate text on top of.
 *
 * Files live at:
 *   public/assets/vehicles/main-car/<color>/<view>.png   (vehicleType: 'sedan')
 *   public/assets/vehicles/suv/<color>/<view>.png         (vehicleType: 'suv')
 * ('main-car' is a legacy folder name predating the multi-vehicle-type
 * feature — kept as-is rather than renamed, since it's an internal path
 * detail never exposed via the API.)
 *
 * getVehicleAsset() falls back to 'sedan'/'blue' for any (type, color,
 * placement) combination missing from VEHICLE_ASSET_REGISTRY, reporting
 * fallbackUsed: true — see docs/VEHICLE_COLOR_VARIANTS.md for the fallback
 * policy and how to add a new type/color's assets later (just populate
 * that entry below — VehicleAssetLayer and this resolver need no changes).
 *
 * TO UPDATE AN ASSET:
 *   Replace the PNG file and update naturalW/naturalH if dimensions change.
 *   Re-calibrate PlateAnchor in plateAnchors.ts against the new image geometry.
 */
import type { VehicleColor, VehicleType } from '@plate-runner/shared';
import type { AssetEntry, AssetViewKey } from './types';

/** These registries only ever hold raster entries — narrowed so callers don't need a type guard. */
type RasterAssetEntry = Extract<AssetEntry, { type: 'raster' }>;

function buildColorAssets(basePath: string): Record<AssetViewKey, RasterAssetEntry> {
  const views: AssetViewKey[] = [
    'center_front', 'driver_front', 'passenger_front',
    'center_back', 'driver_back', 'passenger_back',
  ];
  return Object.fromEntries(
    views.map(view => [view, {
      type: 'raster' as const,
      src: `${basePath}/${view}.png`,
      naturalW: 1536,
      naturalH: 1024,
    }]),
  ) as Record<AssetViewKey, RasterAssetEntry>;
}

// ─── Sedan ('main-car' folder) ──────────────────────────────────────────────

const SEDAN_BLUE_ASSETS: Record<AssetViewKey, RasterAssetEntry> = buildColorAssets('/assets/vehicles/main-car/blue');
const SEDAN_RED_ASSETS:  Record<AssetViewKey, RasterAssetEntry> = buildColorAssets('/assets/vehicles/main-car/red');
const SEDAN_GRAY_ASSETS: Record<AssetViewKey, RasterAssetEntry> = buildColorAssets('/assets/vehicles/main-car/gray');

// ─── SUV ─────────────────────────────────────────────────────────────────────

const SUV_BLUE_ASSETS: Record<AssetViewKey, RasterAssetEntry> = buildColorAssets('/assets/vehicles/suv/blue');
const SUV_RED_ASSETS:  Record<AssetViewKey, RasterAssetEntry> = buildColorAssets('/assets/vehicles/suv/red');
const SUV_GRAY_ASSETS: Record<AssetViewKey, RasterAssetEntry> = buildColorAssets('/assets/vehicles/suv/gray');

/** Type- and color-keyed asset registry. Both vehicle types now have full asset sets for all three colors. */
export const VEHICLE_ASSET_REGISTRY: Record<VehicleType, Record<VehicleColor, Partial<Record<AssetViewKey, RasterAssetEntry>>>> = {
  sedan: {
    blue: SEDAN_BLUE_ASSETS,
    red:  SEDAN_RED_ASSETS,
    gray: SEDAN_GRAY_ASSETS,
  },
  suv: {
    blue: SUV_BLUE_ASSETS,
    red:  SUV_RED_ASSETS,
    gray: SUV_GRAY_ASSETS,
  },
};

/** Backwards-compatible flat export — always the sedan/blue set. Prefer getVehicleAsset() for new code. */
export const ASSET_REGISTRY: Record<AssetViewKey, RasterAssetEntry> = SEDAN_BLUE_ASSETS;

export interface VehicleAsset {
  src: string;
  width: number;
  height: number;
  /** True when the requested (type, color) had no asset for this placement and the sedan/blue asset was used instead. */
  fallbackUsed: boolean;
}

/**
 * Resolves the asset to render for a given vehicle type + color + detector
 * placement. Falls back to sedan/blue (same placement) when the requested
 * type/color has no asset yet — see VEHICLE_ASSET_REGISTRY above.
 */
export function getVehicleAsset({
  type,
  color,
  placement,
}: {
  type: VehicleType;
  color: VehicleColor;
  placement: AssetViewKey;
}): VehicleAsset {
  const entry = VEHICLE_ASSET_REGISTRY[type]?.[color]?.[placement];
  const resolved = entry ?? SEDAN_BLUE_ASSETS[placement];
  return {
    src: resolved.src,
    width: resolved.naturalW,
    height: resolved.naturalH,
    fallbackUsed: !entry,
  };
}
