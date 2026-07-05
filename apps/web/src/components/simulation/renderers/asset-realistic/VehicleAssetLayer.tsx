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
 *   4. Render the ground shadow beneath the car
 *
 * Asset selection:
 *   config.detectorPlacement maps 1-to-1 to AssetViewKey.
 *   Each placement has its own image file so driver/passenger/center views
 *   are genuinely distinct visual angles, not the same image with a skew.
 *
 * Vehicle colour:
 *   PLACEHOLDER LIMITATION: the current placeholder SVG assets are grayscale /
 *   single-colour schematics. The vehicleColor config does not change the
 *   asset image in placeholder mode — colour is acknowledged but not applied.
 *   When real photorealistic assets arrive (one per view, in a neutral colour),
 *   a CSS/SVG hue-rotate filter can be added here to tint the image, OR
 *   per-colour asset variants can be registered (6 views × 6 colours = 36 files).
 */
import type { SimulationConfig } from '@plate-runner/shared';
import type { DepthValues } from '../../../../utils/depth';
import {
  getVehicleX,
  CAR_LW,
  CAR_LH,
  CAR_ROAD_FRACTION,
} from '../../../../utils/depth';
import { ASSET_REGISTRY } from './assetRegistry';
import { PLATE_ANCHORS } from './plateAnchors';
import { DynamicPlateOverlay } from './DynamicPlateOverlay';
import type { AssetViewKey } from './types';

interface VehicleAssetLayerProps {
  config: SimulationConfig;
  vehicleT: number;
  vehicleDepth: DepthValues;
}

export function VehicleAssetLayer({
  config,
  vehicleT,
  vehicleDepth,
}: VehicleAssetLayerProps) {
  const { roadWidth, y } = vehicleDepth;

  // ── Scene-space car dimensions ──────────────────────────────────────────
  const centerX = getVehicleX(vehicleT, config.detectorPlacement);

  const carW  = roadWidth * CAR_ROAD_FRACTION;
  const carH  = carW * (CAR_LH / CAR_LW);
  const carX  = centerX - carW / 2;
  const carY  = y - carH;
  const scaleX = carW / CAR_LW;
  const scaleY = carH / CAR_LH;

  // ── Asset & plate anchor lookup ─────────────────────────────────────────
  // detectorPlacement is exactly AssetViewKey — no translation needed.
  const viewKey = config.detectorPlacement as AssetViewKey;
  const asset   = ASSET_REGISTRY[viewKey];
  const anchor  = PLATE_ANCHORS[config.detectorPlacement];

  return (
    <g>
      {/* Ground shadow */}
      <ellipse
        cx={centerX}
        cy={y + carH * 0.02}
        rx={carW * 0.46}
        ry={carH * 0.09}
        fill="rgba(0,0,0,0.55)"
      />

      {/* Perspective transform group — depth scale only, no skewX.
          The viewing angle is already embedded in each asset image. */}
      <g transform={`translate(${carX}, ${carY}) scale(${scaleX}, ${scaleY})`}>

        {/* Car body asset (raster image) */}
        {asset.type === 'raster' && (
          <image
            href={asset.src}
            x={0}
            y={0}
            width={CAR_LW}
            height={CAR_LH}
            preserveAspectRatio="none"
          />
        )}

        {/* SVG prototype fallback — only used if registry entry is svg-prototype */}
        {asset.type === 'svg-prototype' && asset.render({ body: '#4a5060', hood: '#3a4050', dark: '#1a2030', glass: '#0a1020', trim: '#2a3040' })}

        {/* License plate overlay — always a separate layer, never baked into asset */}
        <DynamicPlateOverlay
          text={config.plate}
          anchor={anchor}
          carLW={CAR_LW}
          carLH={CAR_LH}
        />
      </g>
    </g>
  );
}
