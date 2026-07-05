/**
 * Types for the asset-based realistic renderer.
 *
 * ARCHITECTURE NOTE:
 * The asset renderer separates two concerns that were previously coupled:
 *   1. Car body layer  — static-looking asset (SVG prototype today, PNG/WebP in future)
 *   2. Plate overlay   — always dynamic SVG (text driven by simulation config)
 *
 * PlateAnchor defines where the plate lives within the car's local coordinate space
 * (100 × 72 units).  When real raster assets arrive, the same anchor data is used
 * to position the SVG plate overlay on top of the image element.
 */
import type React from 'react';
import type { VehicleColor } from '@plate-runner/shared';

// ─── Plate anchor ─────────────────────────────────────────────────────────────

/**
 * Describes where the license plate sits within the car's 100×72 local space.
 * Percentages are used so the same anchor works for any future asset dimension.
 */
export interface PlateAnchor {
  /** Left edge as fraction of car width (0-1). e.g. 29/100 = 0.29 */
  xPct: number;
  /** Top edge as fraction of car height (0-1). e.g. 54/72 ≈ 0.75 */
  yPct: number;
  /** Plate width as fraction of car width (0-1). e.g. 42/100 = 0.42 */
  wPct: number;
  /** Plate height as fraction of car height (0-1). e.g. 13/72 ≈ 0.18 */
  hPct: number;
  /** Whether this placement shows the front or rear plate */
  isFront: boolean;
}

// ─── Asset view key ───────────────────────────────────────────────────────────

/**
 * The visual angle of the car asset.
 * 'front' and 'rear' are the two base views; driver/passenger variants
 * are currently handled by skewX transform on the same asset.
 */
export type AssetViewKey = 'front' | 'rear';

// ─── Car palette ──────────────────────────────────────────────────────────────

export interface CarPalette {
  body:  string;
  hood:  string;
  dark:  string;
  glass: string;
  trim:  string;
}

export const CAR_PALETTES: Record<VehicleColor, CarPalette> = {
  blue:   { body: '#1e4fcf', hood: '#1a44bb', dark: '#102d80', glass: '#090f1e', trim: '#163898' },
  white:  { body: '#d5d5d5', hood: '#c2c2c2', dark: '#a0a0a0', glass: '#1a2230', trim: '#b0b0b0' },
  black:  { body: '#181820', hood: '#111118', dark: '#080810', glass: '#030308', trim: '#222230' },
  silver: { body: '#7e8794', hood: '#606870', dark: '#424a52', glass: '#141b27', trim: '#505860' },
  red:    { body: '#c82020', hood: '#a81818', dark: '#881414', glass: '#150606', trim: '#900e0e' },
  green:  { body: '#138c3e', hood: '#116e30', dark: '#0e4820', glass: '#04120a', trim: '#0c5e28' },
};

// ─── Asset entry ──────────────────────────────────────────────────────────────

/**
 * Describes one car visual asset.
 *
 * type 'svg-prototype': render is a React component that draws the car body
 *   in the 100×72 local coordinate space. No plate is included — the plate
 *   is always added by DynamicPlateOverlay on top.
 *
 * type 'raster' (future): an image URL. VehicleAssetLayer will render it as
 *   an SVG <image> and then overlay the plate using anchor data.
 */
export type AssetEntry =
  | {
      type: 'svg-prototype';
      render: (palette: CarPalette) => React.ReactElement;
    }
  | {
      type: 'raster';
      src: string;
      /** Natural width of the asset image, used to scale anchor percentages */
      naturalW: number;
      naturalH: number;
    };
