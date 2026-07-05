/**
 * Per-view plate anchors — one independent anchor per AssetViewKey.
 *
 * Coordinate space: 100 × 72 car local units (CAR_LW × CAR_LH).
 *
 * CALIBRATION SOURCE: real 1536×1024 RGB PNG assets installed at
 *   public/assets/vehicles/main-car/{view}.png
 *
 * All percentage values are derived from pixel-level analysis of the real images:
 *   xPct = (plate_left_px - car_left_px) / car_width_px
 *   yPct = (plate_top_px  - car_top_px)  / car_height_px
 *   wPct = plate_width_px / car_width_px
 *   hPct = plate_height_px / car_height_px
 *
 * CAR BOUNDING BOXES (from pixel analysis of 1536×1024 images):
 *   center_front:    car x=288–1251,  y=162–899   (cw=963,  ch=737)
 *   driver_front:    car x=74–1449,   y=179–880   (cw=1375, ch=701)
 *   passenger_front: car x=90–1444,   y=197–867   (cw=1354, ch=670)
 *   center_back:     car x=268–1261,  y=133–920   (cw=993,  ch=787)
 *   driver_back:     car x=91–1431,   y=185–877   (cw=1340, ch=692)
 *   passenger_back:  car x=64–1454,   y=182–862   (cw=1390, ch=680)
 *
 * PLATE BLANK PIXEL REGIONS (from low-saturation scan of real images):
 *   center_front:    x=651–883,  y=648–698  (w=232, h=50)
 *   driver_front:    x=270–560,  y=658–698  (w=290, h=40)   ← left side of bumper
 *   passenger_front: x=980–1262, y=652–692  (w=282, h=40)   ← right side of bumper
 *   center_back:     x=584–940,  y=718–760  (w=356, h=42)
 *   driver_back:     x=803–929,  y=749–768  (w=126, h=19)   ← widened to ~0.21 for full blank
 *   passenger_back:  x=561–714,  y=746–762  (w=153, h=16)   ← widened to ~0.20 for full blank
 *
 * SKEW:
 *   center views:    skewXDeg = 0  (plate faces camera straight-on)
 *   driver views:    skewXDeg = -9 (left edge of plate recedes)
 *   passenger views: skewXDeg = +9 (right edge of plate recedes)
 *
 * READABILITY RULE:
 *   |skewXDeg| must stay ≤ 12° so 12-character plates remain readable by
 *   external cameras. Do not increase skew for visual effect alone.
 *
 * RE-CALIBRATION: if a new asset version ships, re-run pixel analysis and
 * update xPct/yPct/wPct/hPct. The skewXDeg values are geometry-driven and
 * should only change if the 3D render angle changes substantially.
 */
import type { DetectorPlacement } from '@plate-runner/shared';
import type { PlateAnchor } from './types';

// ─── Center-front ─────────────────────────────────────────────────────────────
// Straight-on frontal view. Symmetric. No perspective distortion.
// Plate pixel region: x=651-883, y=648-698 in 1536×1024 image
// Car extents: x=288-1251 (cw=963), y=162-899 (ch=737)
const CENTER_FRONT: PlateAnchor = {
  xPct:      0.377,   // (651-288)/963 = 0.377
  yPct:      0.660,   // (648-162)/737 = 0.660
  wPct:      0.241,   // 232/963 = 0.241
  hPct:      0.068,   // 50/737 = 0.068
  rotateDeg: 0,
  skewXDeg:  0,
  skewYDeg:  0,
  side:      'front',
};

// ─── Driver-front ─────────────────────────────────────────────────────────────
// 3/4 view from the driver's side (front-left angle).
// Plate sits on the LEFT portion of the bumper face (closer side to camera).
// Plate pixel region: x=270-560, y=658-698 in 1536×1024 image
// Car extents: x=74-1449 (cw=1375), y=179-880 (ch=701)
const DRIVER_FRONT: PlateAnchor = {
  xPct:      0.143,   // (270-74)/1375 = 0.143
  yPct:      0.684,   // (658-179)/701 = 0.684
  wPct:      0.211,   // 290/1375 = 0.211
  hPct:      0.057,   // 40/701 = 0.057
  rotateDeg: 0,
  skewXDeg:  -9,      // left edge recedes (driver-side camera, front face angled right)
  skewYDeg:  0,
  side:      'front',
};

// ─── Passenger-front ─────────────────────────────────────────────────────────
// 3/4 view from the passenger's side (front-right angle).
// Plate sits on the RIGHT portion of the bumper face (closer side to camera).
// Plate pixel region: x=980-1262, y=652-692 in 1536×1024 image
// Car extents: x=90-1444 (cw=1354), y=197-867 (ch=670)
const PASSENGER_FRONT: PlateAnchor = {
  xPct:      0.657,   // (980-90)/1354 = 0.657
  yPct:      0.679,   // (652-197)/670 = 0.679
  wPct:      0.208,   // 282/1354 = 0.208
  hPct:      0.060,   // 40/670 = 0.060
  rotateDeg: 0,
  skewXDeg:  +9,      // right edge recedes (passenger-side camera, front face angled left)
  skewYDeg:  0,
  side:      'front',
};

// ─── Center-back ─────────────────────────────────────────────────────────────
// Straight-on rear view. Symmetric. No perspective distortion.
// Plate pixel region: x=584-940, y=718-760 in 1536×1024 image
// Car extents: x=268-1261 (cw=993), y=133-920 (ch=787)
const CENTER_BACK: PlateAnchor = {
  xPct:      0.318,   // (584-268)/993 = 0.318
  yPct:      0.743,   // (718-133)/787 = 0.743
  wPct:      0.359,   // 356/993 = 0.359
  hPct:      0.053,   // 42/787 = 0.053
  rotateDeg: 0,
  skewXDeg:  0,
  skewYDeg:  0,
  side:      'rear',
};

// ─── Driver-back ─────────────────────────────────────────────────────────────
// 3/4 view from the driver's side of the rear face.
// Plate visible on the RIGHT portion of the rear face in the image (far side from camera).
// Raw detection: x=803-929 (narrow sub-run). wPct widened to cover full plate blank (~0.21).
// Plate pixel region: x=803-929, y=749-768 in 1536×1024 image (raw detection)
// Car extents: x=91-1431 (cw=1340), y=185-877 (ch=692)
// NOTE: wPct is intentionally wider than raw pixel run — the grey plate blank
//       continues beyond the auto-detected run edge. Verify visually after deploy.
const DRIVER_BACK: PlateAnchor = {
  xPct:      0.531,   // (803-91)/1340 = 0.531
  yPct:      0.815,   // (749-185)/692 = 0.815
  wPct:      0.212,   // widened from raw 0.094 (126/1340); full blank estimated at ~0.21
  hPct:      0.027,   // 19/692 = 0.027 (raw; may need +0.01 for plate height)
  rotateDeg: 0,
  skewXDeg:  -9,      // left edge recedes (driver-side camera, rear face angled right)
  skewYDeg:  0,
  side:      'rear',
};

// ─── Passenger-back ──────────────────────────────────────────────────────────
// 3/4 view from the passenger's side of the rear face.
// Plate visible on the LEFT portion of the rear face in the image (far side from camera).
// Raw detection: x=561-714 (narrow sub-run). wPct widened to cover full plate blank (~0.20).
// Plate pixel region: x=561-714, y=746-762 in 1536×1024 image (raw detection)
// Car extents: x=64-1454 (cw=1390), y=182-862 (ch=680)
// NOTE: wPct widened same rationale as driver_back. Verify visually after deploy.
const PASSENGER_BACK: PlateAnchor = {
  xPct:      0.357,   // (561-64)/1390 = 0.357
  yPct:      0.829,   // (746-182)/680 = 0.829
  wPct:      0.200,   // widened from raw 0.110 (153/1390); full blank estimated at ~0.20
  hPct:      0.024,   // 16/680 = 0.024 (raw; may need +0.01 for plate height)
  rotateDeg: 0,
  skewXDeg:  +9,      // right edge recedes (passenger-side camera, rear face angled left)
  skewYDeg:  0,
  side:      'rear',
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const PLATE_ANCHORS: Record<DetectorPlacement, PlateAnchor> = {
  center_front:    CENTER_FRONT,
  driver_front:    DRIVER_FRONT,
  passenger_front: PASSENGER_FRONT,
  center_back:     CENTER_BACK,
  driver_back:     DRIVER_BACK,
  passenger_back:  PASSENGER_BACK,
};

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Converts a PlateAnchor's percentage fields to absolute pixel coordinates
 * within the car's current local coordinate space.
 *
 * The returned rect is the bounding box of the plate BEFORE any rotation/skew
 * transform is applied. The transform is applied separately in DynamicPlateOverlay.
 */
export function anchorToLocalRect(
  anchor: PlateAnchor,
  carLW = 100,
  carLH = 72,
): { x: number; y: number; w: number; h: number } {
  return {
    x: anchor.xPct * carLW,
    y: anchor.yPct * carLH,
    w: anchor.wPct * carLW,
    h: anchor.hPct * carLH,
  };
}
