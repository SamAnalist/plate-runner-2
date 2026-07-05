/**
 * DynamicPlateOverlay — renders the license plate as a separate SVG layer.
 *
 * The plate is ALWAYS distinct from the car body asset. It sits at the plate
 * anchor position within the car's 100×72 local coordinate space.
 *
 * For 3/4-angle views (driver_front, passenger_front, etc.) the anchor carries
 * rotateDeg / skewXDeg / skewYDeg values that match the perspective of that
 * view's asset image. The transform is applied around the plate centre so the
 * plate visually integrates with the asset's angle.
 *
 * READABILITY RULE: skewXDeg is capped at ±12° in the anchor definitions so
 * that 12-character plates remain legible for external cameras in all views.
 *
 * The plate text is rendered via LicensePlate which:
 *   - Uses SVG <text> only (never HTML or dangerouslySetInnerHTML)
 *   - Enforces text fitting via textLength + lengthAdjust="spacingAndGlyphs"
 *   - Validates that text is pre-sanitised (only A-Z 0-9, max 12 chars)
 */
import { LicensePlate } from '../../LicensePlate';
import type { PlateAnchor } from './types';
import { anchorToLocalRect } from './plateAnchors';

interface DynamicPlateOverlayProps {
  /** Already-validated, uppercased plate string */
  text: string;
  anchor: PlateAnchor;
  /** Car local width (default 100) */
  carLW?: number;
  /** Car local height (default 72) */
  carLH?: number;
}

export function DynamicPlateOverlay({
  text,
  anchor,
  carLW = 100,
  carLH = 72,
}: DynamicPlateOverlayProps) {
  const rect = anchorToLocalRect(anchor, carLW, carLH);
  const cx   = rect.x + rect.w / 2;
  const cy   = rect.y + rect.h / 2;

  const hasTransform =
    anchor.rotateDeg !== 0 ||
    anchor.skewXDeg  !== 0 ||
    anchor.skewYDeg  !== 0;

  const plate = (
    <LicensePlate
      text={text}
      x={rect.x}
      y={rect.y}
      width={rect.w}
      height={rect.h}
    />
  );

  if (!hasTransform) return plate;

  // Apply perspective transform around the plate centre.
  // Order: translate to centre → rotate → skewX → skewY → translate back.
  // This keeps the plate anchored at its intended position while matching
  // the 3/4 perspective visible in the car body asset.
  return (
    <g transform={`
      translate(${cx}, ${cy})
      rotate(${anchor.rotateDeg})
      skewX(${anchor.skewXDeg})
      skewY(${anchor.skewYDeg})
      translate(${-cx}, ${-cy})
    `}>
      {plate}
    </g>
  );
}
