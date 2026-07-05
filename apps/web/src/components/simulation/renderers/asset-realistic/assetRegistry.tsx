/**
 * Asset registry — one raster entry per AssetViewKey (= per DetectorPlacement).
 *
 * CURRENT STATE: camera-aware LPR/ANPR PNG assets installed.
 *   All six views are 1536×1024 RGB images rendered from a virtual camera at
 *   2–3 m height with a downward tilt — matching a real parking access/exit
 *   camera perspective. Each image contains a blank plate area for the
 *   DynamicPlateOverlay to render live plate text on top of.
 *
 * Files live at: public/assets/vehicles/main-car/{view}.png
 *
 * NOTE: Camera-aware asset pack installed. Plate anchors in plateAnchors.ts
 *   require visual calibration against these new images.
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
