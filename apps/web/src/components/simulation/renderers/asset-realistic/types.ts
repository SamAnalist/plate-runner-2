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

// ─── Asset entry ──────────────────────────────────────────────────────────────

/**
 * Raster asset entry — the current (and only) production target.
 *
 * src        — path served from /public (e.g. /assets/vehicles/main-car/blue/center_front.png)
 * naturalW/H — original image pixel dimensions; used for aspect-ratio verification.
 */
export interface AssetEntry {
  type: 'raster';
  src: string;
  naturalW: number;
  naturalH: number;
}
