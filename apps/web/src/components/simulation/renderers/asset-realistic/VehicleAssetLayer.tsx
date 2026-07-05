/**
 * VehicleAssetLayer — composes car body asset + dynamic plate overlay.
 *
 * Responsibility:
 *   1. Compute the car's scene-space bounding box from the depth model
 *   2. Apply the perspective transform (translate + skewX + scale)
 *   3. Inside the transformed group:
 *        a. Render car body from the asset registry
 *        b. Render DynamicPlateOverlay at the plate anchor
 *   4. Render the ground shadow beneath the car
 *
 * This component knows nothing about which visual style is active or how the
 * scene background is drawn.  It only handles the vehicle.
 */
import type { SimulationConfig } from '@plate-runner/shared';
import type { DepthValues } from '../../../../utils/depth';
import {
  getVehicleX,
  getSkewDeg,
  isFrontView,
  CAR_LW,
  CAR_LH,
  CAR_ROAD_FRACTION,
} from '../../../../utils/depth';
import { CAR_PALETTES } from './types';
import { ASSET_REGISTRY, resolveViewKey } from './assetRegistry';
import { PLATE_ANCHORS } from './plateAnchors';
import { DynamicPlateOverlay } from './DynamicPlateOverlay';

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
  const skewDeg = getSkewDeg(config.detectorPlacement);
  const frontView = isFrontView(config.detectorPlacement);

  const carW   = roadWidth * CAR_ROAD_FRACTION;
  const carH   = carW * (CAR_LH / CAR_LW);
  const carX   = centerX - carW / 2;
  const carY   = y - carH;
  const scaleX = carW / CAR_LW;
  const scaleY = carH / CAR_LH;

  // Pivot at car bottom-centre for skew (matches perspective vanishing point)
  const pivotX = centerX;
  const pivotY = y;

  // ── Asset & plate anchor lookup ─────────────────────────────────────────
  const palette  = CAR_PALETTES[config.vehicleColor];
  const viewKey  = resolveViewKey(frontView);
  const asset    = ASSET_REGISTRY[viewKey];
  const anchor   = PLATE_ANCHORS[config.detectorPlacement];

  // ── Render asset body ────────────────────────────────────────────────────
  let carBodyContent: React.ReactElement | null = null;
  if (asset.type === 'svg-prototype') {
    carBodyContent = asset.render(palette);
  } else {
    // Raster asset: render as SVG <image> filling the 100×72 local space
    carBodyContent = (
      <image
        href={asset.src}
        x={0} y={0}
        width={CAR_LW}
        height={CAR_LH}
        preserveAspectRatio="none"
      />
    );
  }

  return (
    <g>
      {/* Ground shadow */}
      <ellipse
        cx={centerX}
        cy={y + carH * 0.02}
        rx={carW * 0.46}
        ry={carH * 0.09}
        fill="rgba(0,0,0,0.50)"
      />

      {/* Perspective transform group */}
      <g
        transform={`
          translate(${pivotX}, ${pivotY})
          skewX(${skewDeg})
          translate(${-pivotX}, ${-pivotY})
          translate(${carX}, ${carY})
          scale(${scaleX}, ${scaleY})
        `}
      >
        {/* Car body (no plate) */}
        {carBodyContent}

        {/* License plate overlay — always a separate layer */}
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
