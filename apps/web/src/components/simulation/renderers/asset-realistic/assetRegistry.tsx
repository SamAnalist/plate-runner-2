/**
 * Asset registry — one raster entry per AssetViewKey (= per DetectorPlacement).
 *
 * CURRENT STATE: real photorealistic PNG assets installed.
 * All six views are 1536×1024 RGB images.
 * Files live at: public/assets/vehicles/main-car/{view}.png
 *
 * PLATE BLANK:
 *   Each asset image contains a blank grey plate area.
 *   The DynamicPlateOverlay renders live plate text on top of that blank.
 *   Plate blank positions are calibrated per-view in plateAnchors.ts.
 *
 * TO UPDATE AN ASSET:
 *   Replace the PNG file and update naturalW/naturalH if dimensions change.
 *   Re-calibrate PlateAnchor in plateAnchors.ts against the new image geometry.
 */
import type { AssetEntry, AssetViewKey } from './types';

export const ASSET_REGISTRY: Record<AssetViewKey, AssetEntry> = {

  center_front: {
    type:     'raster',
    src:      '/assets/vehicles/main-car/center_front.png',
    naturalW: 1536,
    naturalH: 1024,
  },

  driver_front: {
    type:     'raster',
    src:      '/assets/vehicles/main-car/driver_front.png',
    naturalW: 1536,
    naturalH: 1024,
  },

  passenger_front: {
    type:     'raster',
    src:      '/assets/vehicles/main-car/passenger_front.png',
    naturalW: 1536,
    naturalH: 1024,
  },

  center_back: {
    type:     'raster',
    src:      '/assets/vehicles/main-car/center_back.png',
    naturalW: 1536,
    naturalH: 1024,
  },

  driver_back: {
    type:     'raster',
    src:      '/assets/vehicles/main-car/driver_back.png',
    naturalW: 1536,
    naturalH: 1024,
  },

  passenger_back: {
    type:     'raster',
    src:      '/assets/vehicles/main-car/passenger_back.png',
    naturalW: 1536,
    naturalH: 1024,
  },
};
