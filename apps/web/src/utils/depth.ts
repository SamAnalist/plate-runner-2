import type { DetectorPlacement, FocusZoneConfig } from '@plate-runner/shared';

// ─── Scene dimensions (SVG viewBox) ───────────────────────────────────────
export const SCENE_W = 800;
export const SCENE_H = 500;

// ─── Vanishing point ───────────────────────────────────────────────────────
export const VP_X = SCENE_W * 0.5;   // 400
export const VP_Y = SCENE_H * 0.29;  // 145

// ─── Road edges (far = at horizon, near = at bottom of scene) ─────────────
const ROAD_L_FAR  = VP_X - 10;        // 390
const ROAD_R_FAR  = VP_X + 10;        // 410
const ROAD_L_NEAR = SCENE_W * 0.175;  // 140
const ROAD_R_NEAR = SCENE_W * 0.825;  // 660

// ─── Gate & reading positions ──────────────────────────────────────────────
/** Depth t at which the gate sits in the scene */
export const GATE_T = 0.52;
/** Vehicle stops here when incoming + wait_for_signal; also calibration hold point */
export const READING_T_INCOMING = GATE_T - 0.06;  // ≈ 0.46
/** Vehicle stops here when away + wait_for_signal */
export const READING_T_AWAY     = GATE_T + 0.06;  // ≈ 0.58

// ─── Car & plate coordinate constants ─────────────────────────────────────
// These define the car's internal SVG coordinate space and plate position
// within it. Kept here so both Vehicle.tsx and depth utilities stay in sync.
export const CAR_LW = 100;           // car local width
export const CAR_LH = 72;            // car local height
export const CAR_ROAD_FRACTION = 0.62; // car width as fraction of road width

// Plate rect within car local space
export const CAR_PLATE_X = 29;
export const CAR_PLATE_Y = 54;
export const CAR_PLATE_W = 42;
export const CAR_PLATE_H = 13;

// ─── Core math ────────────────────────────────────────────────────────────
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export interface DepthValues {
  roadLeft: number;
  roadRight: number;
  roadWidth: number;
  roadCenterX: number;
  y: number;
  /** Perspective scale: 0.04 at vanishing point → 1.0 at near edge */
  scale: number;
}

export function getDepthValues(t: number): DepthValues {
  const roadLeft    = lerp(ROAD_L_FAR,  ROAD_L_NEAR, t);
  const roadRight   = lerp(ROAD_R_FAR,  ROAD_R_NEAR, t);
  const roadWidth   = roadRight - roadLeft;
  const roadCenterX = (roadLeft + roadRight) / 2;
  const y           = lerp(VP_Y, SCENE_H * 0.92, t);
  // Non-linear scale: objects grow faster as they approach — realistic perspective
  const scale       = lerp(0.04, 1.0, Math.pow(t, 0.8));
  return { roadLeft, roadRight, roadWidth, roadCenterX, y, scale };
}

/** Horizontal offset fraction for driver / passenger detector side */
function sideOffset(placement: DetectorPlacement): number {
  if (placement.startsWith('driver'))    return +0.10;
  if (placement.startsWith('passenger')) return -0.10;
  return 0;
}

/** X center of vehicle in scene coordinates at depth t */
export function getVehicleX(t: number, placement: DetectorPlacement): number {
  const { roadLeft, roadRight, roadWidth } = getDepthValues(t);
  const centerX = (roadLeft + roadRight) / 2;
  return centerX + sideOffset(placement) * roadWidth;
}

/** Slight horizontal skew (degrees) for driver/passenger offset simulation */
export function getSkewDeg(placement: DetectorPlacement): number {
  if (placement.startsWith('driver'))    return  3;
  if (placement.startsWith('passenger')) return -3;
  return 0;
}

/** Whether the camera faces the front or rear of the vehicle */
export function isFrontView(placement: DetectorPlacement): boolean {
  return placement.endsWith('_front');
}

// ─── Plate scene-space rect ───────────────────────────────────────────────

export interface SceneRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Returns the license plate bounding rect in SVG scene coordinates.
 * Used for calibration readability checks.
 */
export function getPlateSceneRect(
  vehicleT: number,
  placement: DetectorPlacement,
): SceneRect {
  const { roadWidth, y: roadY } = getDepthValues(vehicleT);
  const centerX = getVehicleX(vehicleT, placement);

  const carW = roadWidth * CAR_ROAD_FRACTION;
  const carH = carW * (CAR_LH / CAR_LW);
  const carX = centerX - carW / 2;
  const carY = roadY - carH;

  return {
    x: carX + (CAR_PLATE_X / CAR_LW) * carW,
    y: carY + (CAR_PLATE_Y / CAR_LH) * carH,
    w: (CAR_PLATE_W / CAR_LW) * carW,
    h: (CAR_PLATE_H / CAR_LH) * carH,
  };
}

// ─── Plate readability analysis ───────────────────────────────────────────

export interface PlateReadability {
  inZone: boolean;
  /** 0–100: percentage of plate area that overlaps focus zone */
  overlapPercent: number;
  readability: 'good' | 'partial' | 'poor';
}

/**
 * Calculates how much of the license plate overlaps the camera focus zone.
 * ≥75% overlap → good | 25–74% → partial | <25% → poor
 */
export function getPlateReadability(
  vehicleT: number,
  placement: DetectorPlacement,
  focusZone: FocusZoneConfig,
): PlateReadability {
  const plate = getPlateSceneRect(vehicleT, placement);

  const fzX = (focusZone.xPercent / 100) * SCENE_W;
  const fzY = (focusZone.yPercent / 100) * SCENE_H;
  const fzW = (focusZone.widthPercent / 100) * SCENE_W;
  const fzH = (focusZone.heightPercent / 100) * SCENE_H;

  const intX = Math.max(plate.x, fzX);
  const intY = Math.max(plate.y, fzY);
  const intW = Math.min(plate.x + plate.w, fzX + fzW) - intX;
  const intH = Math.min(plate.y + plate.h, fzY + fzH) - intY;

  if (intW <= 0 || intH <= 0) {
    return { inZone: false, overlapPercent: 0, readability: 'poor' };
  }

  const overlapPercent = Math.round((intW * intH) / (plate.w * plate.h) * 100);
  const inZone      = overlapPercent >= 50;
  const readability = overlapPercent >= 75 ? 'good'
                    : overlapPercent >= 25 ? 'partial'
                    : 'poor';

  return { inZone, overlapPercent, readability };
}
