/**
 * VehicleAssetLayer — composes car body asset + dynamic plate overlay.
 *
 * Responsibility:
 *   1. Compute the car's scene-space bounding box from the depth model
 *   2. Apply the perspective depth transform (translate + scale)
 *      NOTE: no skewX — the viewing angle is baked into the asset image.
 *   3. Inside the transformed group:
 *        a. Render the car body from the asset registry (raster <image>)
 *        b. Render DynamicPlateOverlay at the per-view plate anchor
 *        c. Optionally render AnchorDebugOverlay (Visual QA only)
 *   4. Render the ground shadow beneath the car
 *
 * Asset selection:
 *   config.detectorPlacement maps 1-to-1 to AssetViewKey.
 *   Each placement has its own image file so driver/passenger/center views
 *   are genuinely distinct visual angles, not the same image with a skew.
 *
 * Vehicle colour:
 *   Resolved via getVehicleAsset({ color: config.vehicleColor, placement }).
 *   Only 'blue' has real asset files today — 'red'/'gray' fall back to the
 *   blue asset until their PNGs are added (see docs/VEHICLE_COLOR_VARIANTS.md).
 */
import type { SimulationConfig } from '@plate-runner/shared';
import {
  isPlacementAllowedForDirection,
  remapPlacementForDirection,
} from '@plate-runner/shared';
import type { DepthValues } from '../../../../utils/depth';
import {
  CAR_LW,
  CAR_LH,
  CAR_ROAD_FRACTION,
  SCENE_H,
  VP_Y,
  lerp,
} from '../../../../utils/depth';
import { getViewAwareX, getPovYOffset } from './viewMotionPaths';
import { getVehicleAsset } from './assetRegistry';
import { PLATE_ANCHORS, anchorToLocalRect } from './plateAnchors';
import { DynamicPlateOverlay } from './DynamicPlateOverlay';
import type { AssetViewKey } from './types';
import { getSceneConfig } from './scene-configs/getSceneConfig';
import type { DetectorPlacement } from '@plate-runner/shared';

/**
 * Returns a car size multiplier for the current depth t and placement,
 * interpolating smoothly between phase boundary scale values.
 * All thresholds and scale values come from the per-scene config.
 */
function getCarScale(t: number, direction: 'incoming' | 'away', placement: DetectorPlacement): number {
  const sceneV     = getSceneConfig(placement).vehicle;
  const sc         = sceneV.carScale;
  if (direction === 'incoming') {
    const decelStart = sceneV.readingT - sceneV.decelOffset;
    if (t <= decelStart)      return sc.initial;
    if (t <= sceneV.readingT) return lerp(sc.initial,   sc.stopping,  (t - decelStart)      / (sceneV.readingT - decelStart));
    if (t <= sceneV.gateT)    return lerp(sc.stopping,  sc.afterStop, (t - sceneV.readingT) / (sceneV.gateT - sceneV.readingT));
    return lerp(sc.afterStop, sc.final, Math.min((t - sceneV.gateT) / (1 - sceneV.gateT), 1));
  } else {
    const decelStart = sceneV.readingT + sceneV.decelOffset;
    if (t >= decelStart)      return sc.initial;
    if (t >= sceneV.readingT) return lerp(sc.initial,   sc.stopping,  (decelStart - t)      / (decelStart - sceneV.readingT));
    if (t >= sceneV.gateT)    return lerp(sc.stopping,  sc.afterStop, (sceneV.readingT - t) / (sceneV.readingT - sceneV.gateT));
    return lerp(sc.afterStop, sc.final, Math.min((sceneV.gateT - t) / sceneV.gateT, 1));
  }
}

interface VehicleAssetLayerProps {
  config: SimulationConfig;
  vehicleT: number;
  vehicleDepth: DepthValues;
  /** Visual QA mode: render plate anchor bounding rect + centre marker + label */
  showAnchorOverlay?: boolean;
}

/**
 * AnchorDebugOverlay — QA-only SVG group.
 *
 * Renders inside the car's 100×72 local coordinate space (same space as
 * DynamicPlateOverlay) so coordinates match the anchor values directly.
 *
 * Shows:
 *   • Green semi-transparent rect   = raw anchor bounding box (before skew)
 *   • Cyan centre crosshair         = (cx, cy) of the anchor
 *   • Magenta corner dots           = anchor corners
 *   • White label                   = placement key + xPct/yPct/wPct/hPct
 */
function AnchorDebugOverlay({
  viewKey,
  carLW = CAR_LW,
  carLH = CAR_LH,
}: {
  viewKey: AssetViewKey;
  carLW?: number;
  carLH?: number;
}) {
  const anchor = PLATE_ANCHORS[viewKey];
  const rect   = anchorToLocalRect(anchor, carLW, carLH);
  const cx     = rect.x + rect.w / 2;
  const cy     = rect.y + rect.h / 2;

  const hairLen = Math.max(rect.w, rect.h) * 0.28;
  const dotR    = 0.5;
  const lw      = 0.3;           // stroke-width in local units
  const fontSize = 2.4;

  return (
    <g>
      {/* Anchor bounding rect */}
      <rect
        x={rect.x} y={rect.y}
        width={rect.w} height={rect.h}
        fill="rgba(0,255,120,0.12)"
        stroke="#00ff88"
        strokeWidth={lw}
        strokeDasharray={`${lw * 3} ${lw * 2}`}
      />

      {/* Centre crosshair */}
      <line x1={cx - hairLen} y1={cy} x2={cx + hairLen} y2={cy}
            stroke="#22ffee" strokeWidth={lw * 0.8} />
      <line x1={cx} y1={cy - hairLen} x2={cx} y2={cy + hairLen}
            stroke="#22ffee" strokeWidth={lw * 0.8} />
      <circle cx={cx} cy={cy} r={dotR * 1.2} fill="#22ffee" />

      {/* Corner dots */}
      <circle cx={rect.x}            cy={rect.y}            r={dotR} fill="#ff44aa" />
      <circle cx={rect.x + rect.w}   cy={rect.y}            r={dotR} fill="#ff44aa" />
      <circle cx={rect.x}            cy={rect.y + rect.h}   r={dotR} fill="#ff44aa" />
      <circle cx={rect.x + rect.w}   cy={rect.y + rect.h}   r={dotR} fill="#ff44aa" />

      {/* Label — placement key above the rect */}
      <rect
        x={rect.x} y={rect.y - fontSize * 1.4}
        width={rect.w} height={fontSize * 1.3}
        fill="rgba(0,0,0,0.60)"
        rx={0.5}
      />
      <text
        x={rect.x + rect.w / 2}
        y={rect.y - fontSize * 0.35}
        fill="#ffffff"
        fontSize={fontSize}
        fontFamily="monospace"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {viewKey}
      </text>

      {/* Values label — below the rect */}
      <rect
        x={rect.x} y={rect.y + rect.h + 0.2}
        width={rect.w} height={fontSize * 1.3}
        fill="rgba(0,0,0,0.60)"
        rx={0.5}
      />
      <text
        x={rect.x + rect.w / 2}
        y={rect.y + rect.h + fontSize * 0.9}
        fill="#aaffcc"
        fontSize={fontSize * 0.8}
        fontFamily="monospace"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {`x:${anchor.xPct.toFixed(3)} y:${anchor.yPct.toFixed(3)} w:${anchor.wPct.toFixed(3)} h:${anchor.hPct.toFixed(3)} skX:${anchor.skewXDeg}`}
      </text>
    </g>
  );
}

export function VehicleAssetLayer({
  config,
  vehicleT,
  vehicleDepth,
  showAnchorOverlay = false,
}: VehicleAssetLayerProps) {
  const { roadWidth, y } = vehicleDepth;

  // ── Guardrail: resolve a safe placement before any rendering ────────────
  // If placement is invalid for the current direction (should not happen after
  // UI filtering, but defends against stale config or future API calls),
  // silently remap to the equivalent valid placement.
  const safePlacement = isPlacementAllowedForDirection(
    config.direction,
    config.detectorPlacement,
  )
    ? config.detectorPlacement
    : remapPlacementForDirection(config.detectorPlacement, config.direction);

  // ── Scene-space car dimensions ──────────────────────────────────────────
  // View-aware X: driver/passenger views sweep laterally as the car approaches.
  // Y and scale still come from vehicleDepth (standard depth model).
  const centerX = getViewAwareX(vehicleT, safePlacement);
  const sceneV  = getSceneConfig(safePlacement).vehicle;

  // Car size = natural depth width × per-phase scale from sceneParams.
  const carScale = getCarScale(vehicleT, config.direction, safePlacement);
  const carW     = roadWidth * CAR_ROAD_FRACTION * carScale;
  const carH     = carW * (CAR_LH / CAR_LW);

  // ── Y override for scenes where road extends above VP_Y ─────────────────
  // Standard: y = lerp(VP_Y, SCENE_H, t). With yFar set, the Y origin shifts
  // so the car appears from the top of the screen instead of the horizon strip.
  // Adjustment lerps from (yFar - VP_Y) at t=0 to 0 at t=1 — fades out smoothly
  // so the car naturally converges to the standard position at the near end.
  const yFarAdj   = sceneV.yFar !== undefined ? lerp(sceneV.yFar - VP_Y, 0, vehicleT) : 0;
  const effectiveY = y + yFarAdj;

  const carX  = centerX - carW / 2;
  const carY  = effectiveY - carH;
  const scaleX = carW / CAR_LW;
  const scaleY = carH / CAR_LH;

  // ── POV exit — slide off bottom, optionally diagonal ────────────────────
  const povYOffset = getPovYOffset(vehicleT, effectiveY, carH, config.direction, sceneV.gateT);

  // Diagonal slide offsets — X follows road slope proportional to the Y slide distance.
  // exitDiagonal: for incoming exit (car slides off bottom after gate).
  // entryDiagonal: for away entry (car slides in from bottom-side before POV_ENTRY_T_AWAY).
  // Both use slope = (xNear - xFar) / (SCENE_H - yFar) to match the road angle.
  let povXOffset = 0;
  const yRange = SCENE_H - (sceneV.yFar ?? VP_Y);
  if (yRange > 0 && povYOffset !== 0) {
    if ((sceneV.exitDiagonal ?? false) && config.direction === 'incoming') {
      const scale = sceneV.exitDiagonalScale ?? 1;
      povXOffset = povYOffset * (sceneV.xNear - sceneV.xFar) / yRange * scale;
    } else if ((sceneV.entryDiagonal ?? false) && config.direction === 'away') {
      const scale = sceneV.entryDiagonalScale ?? 1;
      povXOffset = povYOffset * (sceneV.xNear - sceneV.xFar) / yRange * scale;
    }
  }

  // ── Asset & plate anchor lookup ─────────────────────────────────────────
  const viewKey    = safePlacement as AssetViewKey;
  const asset      = getVehicleAsset({ color: config.vehicleColor, placement: viewKey });
  const anchor     = PLATE_ANCHORS[safePlacement];
  const rotDeg     = sceneV.rotationDeg ?? 0;
  const rotTransform = rotDeg !== 0
    ? ` rotate(${rotDeg}, ${CAR_LW / 2}, ${CAR_LH / 2})`
    : '';

  return (
    <g>

      {/* Perspective transform group — depth scale only, no skewX.
          rotTransform applies optional per-scene rotation around the car centre.
          povYOffset slides the car in/out of the scene vertically. */}
      <g transform={`translate(${carX + povXOffset}, ${carY + povYOffset}) scale(${scaleX}, ${scaleY})${rotTransform}`}>

        {/* Car body asset (raster image), resolved for the current vehicle color */}
        <image
          href={asset.src}
          x={0}
          y={0}
          width={CAR_LW}
          height={CAR_LH}
          preserveAspectRatio="none"
        />

        {/* License plate overlay — always a separate layer, never baked into asset */}
        <DynamicPlateOverlay
          text={config.plate}
          anchor={anchor}
          carLW={CAR_LW}
          carLH={CAR_LH}
        />

        {/* Anchor debug overlay — Visual QA only, never in production / camera mode */}
        {showAnchorOverlay && (
          <AnchorDebugOverlay viewKey={viewKey} />
        )}
      </g>
    </g>
  );
}
