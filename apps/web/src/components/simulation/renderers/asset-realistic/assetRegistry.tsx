/**
 * Asset registry — one raster entry per AssetViewKey (= per DetectorPlacement).
 *
 * CURRENT STATE: placeholder SVG files.
 * Each entry points to a schematic placeholder in public/assets/vehicles/main-car/.
 * These files are visually distinct per view and clearly labelled "PLACEHOLDER".
 *
 * TO INSTALL REAL ASSETS:
 *   1. Produce (or commission) photorealistic PNG/WebP renders for each view.
 *      Specs: transparent background, 900×600 px recommended, sedan body.
 *      See docs/ASSET_RENDERER_STRATEGY.md § 3 for full production notes.
 *   2. Place files at: public/assets/vehicles/main-car/{view}.png
 *   3. Update each entry below: change src to the .png path and delete isPlaceholder.
 *   4. Re-calibrate each PlateAnchor in plateAnchors.ts against the real image.
 *   5. No other code changes needed — VehicleAssetLayer handles all asset types.
 *
 * PLATE AREA RULE:
 *   Real assets MUST NOT bake in a license plate number. Leave the plate area
 *   as a blank, neutral-coloured rectangle. DynamicPlateOverlay renders the
 *   live plate text on top.
 */
import type { AssetEntry, AssetViewKey } from './types';

export const ASSET_REGISTRY: Record<AssetViewKey, AssetEntry> = {

  // ── Straight-on frontal view ───────────────────────────────────────────────
  center_front: {
    type: 'raster',
    src: '/assets/vehicles/main-car/center-front.svg',
    naturalW: 100,
    naturalH: 72,
    isPlaceholder: true,
  },

  // ── 3/4 angle from driver's side, front face ──────────────────────────────
  driver_front: {
    type: 'raster',
    src: '/assets/vehicles/main-car/driver-front.svg',
    naturalW: 100,
    naturalH: 72,
    isPlaceholder: true,
  },

  // ── 3/4 angle from passenger's side, front face ───────────────────────────
  passenger_front: {
    type: 'raster',
    src: '/assets/vehicles/main-car/passenger-front.svg',
    naturalW: 100,
    naturalH: 72,
    isPlaceholder: true,
  },

  // ── Straight-on rear view ─────────────────────────────────────────────────
  center_back: {
    type: 'raster',
    src: '/assets/vehicles/main-car/center-back.svg',
    naturalW: 100,
    naturalH: 72,
    isPlaceholder: true,
  },

  // ── 3/4 angle from driver's side, rear face ───────────────────────────────
  driver_back: {
    type: 'raster',
    src: '/assets/vehicles/main-car/driver-back.svg',
    naturalW: 100,
    naturalH: 72,
    isPlaceholder: true,
  },

  // ── 3/4 angle from passenger's side, rear face ───────────────────────────
  passenger_back: {
    type: 'raster',
    src: '/assets/vehicles/main-car/passenger-back.svg',
    naturalW: 100,
    naturalH: 72,
    isPlaceholder: true,
  },
};
