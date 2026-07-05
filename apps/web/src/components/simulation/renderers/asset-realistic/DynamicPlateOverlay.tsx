/**
 * DynamicPlateOverlay — renders the license plate as a separate SVG layer.
 *
 * This component is always distinct from the car body asset.  It sits at the
 * plate anchor position within the car's 100×72 local coordinate space.
 *
 * The plate text is rendered via the canonical LicensePlate component, which:
 *   - Uses SVG <text> only (never HTML or dangerouslySetInnerHTML)
 *   - Enforces text fitting via textLength + lengthAdjust="spacingAndGlyphs"
 *   - Validates that text is pre-sanitised (only A-Z 0-9, max 12 chars)
 *
 * Separation from the car asset ensures:
 *   - The plate can change at runtime without re-rendering the car image
 *   - The same overlay logic works for both SVG prototype and future PNG assets
 *   - The plate is never "baked in" to a static file
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
  return (
    <LicensePlate
      text={text}
      x={rect.x}
      y={rect.y}
      width={rect.w}
      height={rect.h}
    />
  );
}
