/**
 * Types for the asset-based realistic renderer.
 *
 * ARCHITECTURE:
 *   Car body  — camera-aware raster asset (PNG) per view. Images are rendered
 *               from a virtual camera at 2–3 m height with a downward tilt,
 *               matching a real parking access/exit camera perspective.
 *               Six distinct LPR/ANPR-targeted images serve from
 *               public/assets/vehicles/main-car/.
 *   Plate     — always a separate DynamicPlateOverlay (never baked into asset).
 *
 * AssetViewKey mirrors DetectorPlacement exactly (6 distinct views).
 * Each view has its own asset file and its own PlateAnchor.
 */
import type React from 'react';
import type { VehicleColor } from '@plate-runner/shared';

// ─── Asset view key ───────────────────────────────────────────────────────────

/**
 * One view key per detector placement.
 * Each key maps to a distinct camera-aware LPR/ANPR asset file AND a distinct plate anchor.
 *
 * center_front / center_back   : straight-on front / rear, camera elevated (2–3 m, downward tilt)
 * driver_front / driver_back   : angled from driver's side (front or rear), camera elevated
 * passenger_front / passenger_back : angled from passenger's side, camera elevated
 *
 * All six images are real camera-aware PNG assets (1536×1024 px).
 * Plate anchors in plateAnchors.ts must be calibrated against these images.
 */
export type AssetViewKey =
  | 'center_front'
  | 'driver_front'
  | 'passenger_front'
  | 'center_back'
  | 'driver_back'
  | 'passenger_back';

// ─── Plate anchor ─────────────────────────────────────────────────────────────

/**
 * Where the license plate sits within the car asset's 100×72 local space,
 * plus any perspective transform to match the view's angle.
 *
 * Percentage-based so the same anchor works for any future asset dimension:
 *   pixel_coord = pct * (carLW or carLH)
 *
 * rotateDeg  — clockwise rotation around plate centre (°). Default 0.
 * skewXDeg   — SVG skewX in degrees to match view perspective. Negative = left
 *              edge up (driver views), positive = right edge up (passenger).
 * skewYDeg   — SVG skewY. Usually 0; reserved for steep camera angles.
 * side       — which face of the vehicle carries this plate.
 *
 * CALIBRATION NOTE: skewXDeg values must be calibrated against the camera-aware
 * LPR/ANPR asset images (2–3 m height, downward tilt). Previous values were derived
 * from ground-level studio renders and are no longer valid. Use the anchor debug
 * overlay (Visual QA → Anchor bounds: ON) to re-verify each anchor against the
 * new camera-aware images before committing updated values.
 */
export interface PlateAnchor {
  /** Plate left edge as fraction of car width  (0–1) */
  xPct: number;
  /** Plate top edge  as fraction of car height (0–1) */
  yPct: number;
  /** Plate width     as fraction of car width  (0–1) */
  wPct: number;
  /** Plate height    as fraction of car height (0–1) */
  hPct: number;
  /** Clockwise rotation (degrees). 0 for most views. */
  rotateDeg: number;
  /** Horizontal skew (degrees) to match view perspective. */
  skewXDeg: number;
  /** Vertical skew (degrees). Usually 0. */
  skewYDeg: number;
  /** Whether this is the front or rear face of the vehicle. */
  side: 'front' | 'rear';
}

// ─── Car palette ──────────────────────────────────────────────────────────────
// Retained for SVG fallback / legacy svg-prototype tinting.
// Raster asset renderers do NOT use the palette — colour is baked into the image.

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
 * Raster asset entry — the current production target.
 *
 * src        — path served from /public (e.g. /assets/vehicles/main-car/center_front.png)
 * naturalW/H — original image pixel dimensions; used for aspect-ratio verification.
 *
 * svg-prototype — LEGACY fallback used during Phase 0.4 development only.
 *                 The ASSET_REGISTRY no longer uses svg-prototype entries.
 *                 Kept in the union so existing code that references it compiles.
 */
export type AssetEntry =
  | {
      type: 'raster';
      src: string;
      naturalW: number;
      naturalH: number;
      /**
       * @deprecated Unused. Camera-aware LPR/ANPR assets are installed and real.
       * This field is retained only for backwards compatibility and will be removed
       * in a future cleanup pass.
       */
      isPlaceholder?: true;
    }
  | {
      /** @deprecated Phase 0.4 SVG prototype — not used in ASSET_REGISTRY. */
      type: 'svg-prototype';
      render: (palette: CarPalette) => React.ReactElement;
    };
