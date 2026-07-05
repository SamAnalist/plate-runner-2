/**
 * Asset registry — maps car view keys to their visual asset.
 *
 * Current implementation: 'svg-prototype' type — the car body is drawn as
 * a detailed SVG component directly in the render tree.  No external files.
 *
 * When photorealistic PNG/WebP assets are produced (via 3D render or AI-generated
 * source + Blender/GIMP retouching), replace entries with:
 *   { type: 'raster', src: '/assets/vehicles/main-car/center-front.webp',
 *     naturalW: 400, naturalH: 288 }
 *
 * VehicleAssetLayer handles both types transparently.
 *
 * PLATE AREA: SVG prototype car components MUST NOT include a license plate.
 * The plate is always added as a separate DynamicPlateOverlay layer so that:
 *   - Text is never baked into an image
 *   - The plate can change at runtime without re-rendering the car asset
 *   - Legibility rules (font, textLength clamp) are always enforced
 */
import type { AssetEntry, AssetViewKey, CarPalette } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Detailed SVG car bodies — 100 × 72 local coordinate space.
//
// Visual design goals vs current renderers:
//   • Outer body uses curved <path> silhouette (not rectangular blocks)
//   • Metallic sheen via multi-layer gradient overlays
//   • Modern headlights: projector circle, DRL strip, LED arc detail
//   • Proper tail lights: LED bar, inner reflector circles
//   • Visible tyres with wheel/hub detail
//   • Door crease and shoulder character lines
//   • NO license plate — added by DynamicPlateOverlay
// ─────────────────────────────────────────────────────────────────────────────

function AssetCarFront(p: CarPalette) {
  const gradId = `arFrontMetal_${p.body.replace('#', '')}`;
  return (
    <g>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.10)" />
          <stop offset="40%"  stopColor="rgba(255,255,255,0.04)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.12)" />
        </linearGradient>
      </defs>

      {/* ── Outer body silhouette (sedan profile) ── */}
      <path
        d="M 8,72 L 4,67 L 1,54 L 0,44 L 3,30 L 10,18 L 16,8 L 20,3 Q 50,-1 80,3 L 84,8 L 90,18 L 97,30 L 100,44 L 99,54 L 96,67 L 92,72 Z"
        fill={p.body}
      />

      {/* Metallic sheen overlay */}
      <path
        d="M 8,72 L 4,67 L 1,54 L 0,44 L 3,30 L 10,18 L 16,8 L 20,3 Q 50,-1 80,3 L 84,8 L 90,18 L 97,30 L 100,44 L 99,54 L 96,67 L 92,72 Z"
        fill={`url(#${gradId})`}
      />

      {/* ── Hood (trapezoid, darker for depth) ── */}
      <path d="M 10,18 L 90,18 L 86,26 L 14,26 Z" fill={p.hood} />

      {/* ── Roof / greenhouse ── */}
      <path d="M 16,8 L 84,8 L 88,18 L 12,18 Z" fill={p.dark} />

      {/* ── Windshield ── */}
      <path d="M 20,4 L 80,4 L 84,17 L 16,17 Z" fill={p.glass} opacity={0.97} />
      {/* Glass inner tint */}
      <path d="M 21,5 L 79,5 L 82,16 L 18,16 Z" fill={p.glass} opacity={0.15} />
      {/* Windshield glare strip */}
      <path d="M 24,5 L 53,5 L 55,12 L 26,12 Z" fill="white" opacity={0.05} />
      {/* Rear-view mirror centre line */}
      <line x1={50} y1={4} x2={50} y2={17} stroke="#000" strokeWidth={0.7} opacity={0.15} />

      {/* ── Body shoulder / character line ── */}
      <path d="M 3,28 Q 50,27 97,28" stroke="white"  strokeWidth={0.4} fill="none" opacity={0.14} />
      <path d="M 0,36 Q 50,34 100,36" stroke={p.dark} strokeWidth={0.5} fill="none" opacity={0.55} />
      <path d="M 3,52 Q 50,51 97,52" stroke="white"  strokeWidth={0.35} fill="none" opacity={0.08} />

      {/* ── Left headlight ── */}
      {/* Housing */}
      <path d="M 1,32 L 26,32 L 26,48 L 4,48 L 1,45 Z" fill="#1a1a1a" />
      {/* Lens surround */}
      <path d="M 2,33 L 25,33 L 25,47 L 5,47 Z"         fill="#e8e0b8" />
      {/* DRL upper strip */}
      <rect x={3}  y={33.5} width={21} height={2.5} rx={1.2} fill="white"   opacity={0.65} />
      {/* DRL lower arc */}
      <path d="M 4,44 Q 14,42 24,44 L 24,45 Q 14,43 4,45 Z" fill="white"   opacity={0.35} />
      {/* Projector reflector */}
      <rect x={5}  y={37}   width={14} height={9}   rx={1.5} fill="#f8f0d0" opacity={0.45} />
      {/* Projector circles */}
      <circle cx={12} cy={41.5} r={5.5} fill="#fff8e0" opacity={0.28} />
      <circle cx={12} cy={41.5} r={3.5} fill="#fffef0" opacity={0.55} />
      <circle cx={12} cy={41.5} r={2.0} fill="white"   opacity={0.88} />
      <circle cx={11.3} cy={40.8} r={0.7} fill="white" opacity={0.95} />
      {/* Amber side-marker */}
      <rect x={2}  y={48}   width={5}  height={2.5} rx={1.0} fill="#f08000" opacity={0.50} />

      {/* ── Right headlight (mirrored) ── */}
      <path d="M 99,32 L 74,32 L 74,48 L 96,48 L 99,45 Z" fill="#1a1a1a" />
      <path d="M 98,33 L 75,33 L 75,47 L 95,47 Z"         fill="#e8e0b8" />
      <rect x={76} y={33.5} width={21} height={2.5} rx={1.2} fill="white"   opacity={0.65} />
      <path d="M 76,44 Q 86,42 96,44 L 96,45 Q 86,43 76,45 Z" fill="white" opacity={0.35} />
      <rect x={81} y={37}   width={14} height={9}   rx={1.5} fill="#f8f0d0" opacity={0.45} />
      <circle cx={88} cy={41.5} r={5.5} fill="#fff8e0" opacity={0.28} />
      <circle cx={88} cy={41.5} r={3.5} fill="#fffef0" opacity={0.55} />
      <circle cx={88} cy={41.5} r={2.0} fill="white"   opacity={0.88} />
      <circle cx={88.7} cy={40.8} r={0.7} fill="white" opacity={0.95} />
      <rect x={93} y={48}   width={5}  height={2.5} rx={1.0} fill="#f08000" opacity={0.50} />

      {/* ── Grille ── */}
      <rect x={27} y={32} width={46} height={17} rx={1.5} fill="#080808" />
      {[35.0, 37.5, 40.0, 42.5, 45.0, 47.5].map(gy => (
        <line key={gy} x1={28} y1={gy} x2={72} y2={gy} stroke="#1e1e1e" strokeWidth={0.8} />
      ))}
      {[33, 38, 43, 50, 57, 62, 67].map(gx => (
        <line key={gx} x1={gx} y1={32} x2={gx} y2={49} stroke="#1c1c1c" strokeWidth={0.6} />
      ))}
      {/* Centre logo chrome ring */}
      <circle cx={50} cy={40}  r={4.5} fill="#888" opacity={0.22} />
      <circle cx={50} cy={40}  r={3.2} fill="#aaa" opacity={0.30} />

      {/* ── Front bumper ── */}
      <rect x={0}  y={49} width={100} height={21} rx={2}   fill={p.dark} />
      <rect x={1}  y={50} width={98}  height={2}  rx={1}   fill="white"  opacity={0.05} />
      {/* Left air duct */}
      <rect x={4}  y={53} width={20}  height={10} rx={1.5} fill="#0a0a0a" />
      <circle cx={14} cy={58} r={4.5} fill="#fff8e0" opacity={0.14} />
      {/* Right air duct */}
      <rect x={76} y={53} width={20}  height={10} rx={1.5} fill="#0a0a0a" />
      <circle cx={86} cy={58} r={4.5} fill="#fff8e0" opacity={0.14} />
      {/* Centre lower dividers */}
      <rect x={27} y={53} width={4}   height={10} rx={0.8} fill="#111" />
      <rect x={69} y={53} width={4}   height={10} rx={0.8} fill="#111" />
      {/* Bumper trim */}
      <rect x={0}  y={67} width={100} height={3}  rx={0.8} fill={p.trim} />

      {/* ── Tyres & wheels ── */}
      {/* Left */}
      <ellipse cx={13} cy={72} rx={13} ry={5.0} fill="#0a0a0a" />
      <ellipse cx={13} cy={72} rx={10} ry={4.0} fill="#181818" />
      <ellipse cx={13} cy={72} rx={6}  ry={2.4} fill="#333"    />
      <ellipse cx={13} cy={72} rx={3}  ry={1.2} fill="#555"    />
      {/* Right */}
      <ellipse cx={87} cy={72} rx={13} ry={5.0} fill="#0a0a0a" />
      <ellipse cx={87} cy={72} rx={10} ry={4.0} fill="#181818" />
      <ellipse cx={87} cy={72} rx={6}  ry={2.4} fill="#333"    />
      <ellipse cx={87} cy={72} rx={3}  ry={1.2} fill="#555"    />
    </g>
  );
}

function AssetCarRear(p: CarPalette) {
  const gradId = `arRearMetal_${p.body.replace('#', '')}`;
  return (
    <g>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.10)" />
          <stop offset="40%"  stopColor="rgba(255,255,255,0.04)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.12)" />
        </linearGradient>
      </defs>

      {/* ── Outer body silhouette (same sedan profile) ── */}
      <path
        d="M 8,72 L 4,67 L 1,54 L 0,44 L 3,30 L 10,18 L 16,8 L 20,3 Q 50,-1 80,3 L 84,8 L 90,18 L 97,30 L 100,44 L 99,54 L 96,67 L 92,72 Z"
        fill={p.body}
      />
      <path
        d="M 8,72 L 4,67 L 1,54 L 0,44 L 3,30 L 10,18 L 16,8 L 20,3 Q 50,-1 80,3 L 84,8 L 90,18 L 97,30 L 100,44 L 99,54 L 96,67 L 92,72 Z"
        fill={`url(#${gradId})`}
      />

      {/* ── Trunk lid ── */}
      <path d="M 10,18 L 90,18 L 86,26 L 14,26 Z" fill={p.hood} />

      {/* ── Roof ── */}
      <path d="M 16,8 L 84,8 L 88,18 L 12,18 Z" fill={p.dark} />

      {/* ── Rear window ── */}
      <path d="M 20,4 L 80,4 L 84,17 L 16,17 Z" fill={p.glass} opacity={0.97} />
      <path d="M 21,5 L 79,5 L 82,16 L 18,16 Z" fill={p.glass} opacity={0.15} />
      <path d="M 24,5 L 53,5 L 55,12 L 26,12 Z" fill="white"   opacity={0.04} />
      {/* Rear wiper */}
      <line x1={50} y1={14.5} x2={71} y2={9.5} stroke="white" strokeWidth={0.8} opacity={0.14} />

      {/* ── Rear spoiler strip ── */}
      <rect x={18} y={18} width={64} height={2}   rx={1}   fill={p.trim}    opacity={0.7} />

      {/* ── Third brake light ── */}
      <rect x={36} y={21} width={28} height={3}   rx={1.2} fill="#ef4444"  opacity={0.90} />

      {/* ── Character lines ── */}
      <path d="M 3,28 Q 50,27 97,28" stroke="white"  strokeWidth={0.4} fill="none" opacity={0.12} />
      <path d="M 0,36 Q 50,34 100,36" stroke={p.dark} strokeWidth={0.5} fill="none" opacity={0.50} />
      <path d="M 3,52 Q 50,51 97,52" stroke="white"  strokeWidth={0.35} fill="none" opacity={0.07} />

      {/* ── Left tail light ── */}
      <path d="M 1,32 L 26,32 L 26,48 L 4,48 L 1,45 Z" fill="#450808" />
      <path d="M 2,33 L 25,33 L 25,47 L 5,47 Z"         fill="#7f1212" />
      {/* Upper LED strip */}
      <rect x={3}  y={33.5} width={21} height={2.5} rx={1.2} fill="#ef4444" opacity={0.88} />
      {/* LED arc */}
      <path d="M 4,38 Q 14,36 24,38 L 24,39 Q 14,37 4,39 Z" fill="#ef4444" opacity={0.55} />
      {/* Main lamp */}
      <circle cx={12} cy={41.5} r={5.5} fill="#ef4444" opacity={0.14} />
      <circle cx={12} cy={41.5} r={3.5} fill="#ef4444" opacity={0.58} />
      <circle cx={12} cy={41.5} r={2.0} fill="#ef4444" opacity={0.92} />
      {/* Reverse light */}
      <rect x={4}  y={43.5} width={10} height={4}   rx={1.0} fill="#f0f0e0" opacity={0.60} />
      {/* Amber turn */}
      <rect x={2}  y={48}   width={5}  height={2.5} rx={1.0} fill="#f08000" opacity={0.50} />

      {/* ── Right tail light (mirrored) ── */}
      <path d="M 99,32 L 74,32 L 74,48 L 96,48 L 99,45 Z" fill="#450808" />
      <path d="M 98,33 L 75,33 L 75,47 L 95,47 Z"          fill="#7f1212" />
      <rect x={76} y={33.5} width={21} height={2.5} rx={1.2} fill="#ef4444" opacity={0.88} />
      <path d="M 76,38 Q 86,36 96,38 L 96,39 Q 86,37 76,39 Z" fill="#ef4444" opacity={0.55} />
      <circle cx={88} cy={41.5} r={5.5} fill="#ef4444" opacity={0.14} />
      <circle cx={88} cy={41.5} r={3.5} fill="#ef4444" opacity={0.58} />
      <circle cx={88} cy={41.5} r={2.0} fill="#ef4444" opacity={0.92} />
      <rect x={86} y={43.5} width={10} height={4}   rx={1.0} fill="#f0f0e0" opacity={0.60} />
      <rect x={93} y={48}   width={5}  height={2.5} rx={1.0} fill="#f08000" opacity={0.50} />

      {/* ── Rear fascia / boot area ── */}
      <rect x={27} y={32} width={46} height={17} rx={1.5} fill={p.dark} />
      <line x1={27} y1={32} x2={73} y2={32} stroke={p.trim} strokeWidth={1.5} />
      {/* Badge / emblem */}
      <rect x={44} y={37} width={12} height={4}   rx={1.0} fill="#2a2a2a" opacity={0.55} />

      {/* ── Rear bumper ── */}
      <rect x={0}  y={49} width={100} height={21} rx={2}   fill={p.dark} />
      <rect x={1}  y={50} width={98}  height={2}  rx={1}   fill="white"  opacity={0.04} />

      {/* Rear diffuser */}
      <rect x={26} y={56} width={48} height={8}   rx={1}   fill="#111" />
      {[32, 37, 43, 50, 57, 63, 68].map(gx => (
        <line key={gx} x1={gx} y1={56} x2={gx} y2={64} stroke="#252525" strokeWidth={0.7} />
      ))}

      {/* Exhaust pipes */}
      <ellipse cx={16} cy={63} rx={5.0} ry={4.0} fill="#1a1a1a" />
      <ellipse cx={16} cy={63} rx={3.5} ry={2.8} fill="#222"    />
      <circle  cx={15.5} cy={62.5} r={1.2} fill="#333" opacity={0.5} />
      <ellipse cx={84} cy={63} rx={5.0} ry={4.0} fill="#1a1a1a" />
      <ellipse cx={84} cy={63} rx={3.5} ry={2.8} fill="#222"    />
      <circle  cx={84.5} cy={62.5} r={1.2} fill="#333" opacity={0.5} />

      {/* Bumper trim */}
      <rect x={0}  y={67} width={100} height={3}  rx={0.8} fill={p.trim} />

      {/* ── Tyres & wheels ── */}
      <ellipse cx={13} cy={72} rx={13} ry={5.0} fill="#0a0a0a" />
      <ellipse cx={13} cy={72} rx={10} ry={4.0} fill="#181818" />
      <ellipse cx={13} cy={72} rx={6}  ry={2.4} fill="#333"    />
      <ellipse cx={13} cy={72} rx={3}  ry={1.2} fill="#555"    />
      <ellipse cx={87} cy={72} rx={13} ry={5.0} fill="#0a0a0a" />
      <ellipse cx={87} cy={72} rx={10} ry={4.0} fill="#181818" />
      <ellipse cx={87} cy={72} rx={6}  ry={2.4} fill="#333"    />
      <ellipse cx={87} cy={72} rx={3}  ry={1.2} fill="#555"    />
    </g>
  );
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const ASSET_REGISTRY: Record<AssetViewKey, AssetEntry> = {
  front: {
    type: 'svg-prototype',
    render: (palette: CarPalette) => <AssetCarFront {...palette} />,
  },
  rear: {
    type: 'svg-prototype',
    render: (palette: CarPalette) => <AssetCarRear {...palette} />,
  },
};

/**
 * Resolve which asset view to use for a given plate anchor.
 * Currently: front placements → 'front' asset, rear placements → 'rear' asset.
 */
export function resolveViewKey(isFront: boolean): AssetViewKey {
  return isFront ? 'front' : 'rear';
}
