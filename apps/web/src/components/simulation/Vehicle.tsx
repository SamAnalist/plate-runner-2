import type { SimulationConfig, VehicleColor } from '@plate-runner/shared';
import type { DepthValues } from '../../utils/depth';
import {
  getVehicleX,
  getSkewDeg,
  isFrontView,
  CAR_LW,
  CAR_LH,
  CAR_ROAD_FRACTION,
  CAR_PLATE_X,
  CAR_PLATE_Y,
  CAR_PLATE_W,
  CAR_PLATE_H,
} from '../../utils/depth';
import { LicensePlate } from './LicensePlate';

// Plate position aliases for readability within this file
const PLATE_X = CAR_PLATE_X;
const PLATE_Y = CAR_PLATE_Y;
const PLATE_W = CAR_PLATE_W;
const PLATE_H = CAR_PLATE_H;

// ─── Color palette ──────────────────────────────────────────────────────────
interface CarPalette {
  body: string;
  hood: string;
  dark: string;
  glass: string;
  trim: string;
}

const PALETTES: Record<VehicleColor, CarPalette> = {
  blue:   { body: '#2563eb', hood: '#1d4ed8', dark: '#1e3a8a', glass: '#0c1a2e', trim: '#1a40a0' },
  white:  { body: '#e8e8e8', hood: '#d4d4d4', dark: '#b0b0b0', glass: '#1e2a38', trim: '#c0c0c0' },
  black:  { body: '#1c1c2e', hood: '#14142a', dark: '#0a0a18', glass: '#050510', trim: '#2a2a3e' },
  silver: { body: '#8d96a3', hood: '#6b7280', dark: '#4b5563', glass: '#1a2030', trim: '#5a636e' },
  red:    { body: '#dc2626', hood: '#b91c1c', dark: '#991b1b', glass: '#1a0808', trim: '#a01010' },
  green:  { body: '#16a34a', hood: '#15803d', dark: '#14532d', glass: '#071a10', trim: '#0e6e30' },
};

// ─── Car body: front view ───────────────────────────────────────────────────
function CarFront({ p }: { p: CarPalette }) {
  return (
    <>
      {/* === Body === */}

      {/* Main lower body / doors */}
      <rect x={0} y={22} width={100} height={50} fill={p.body} />

      {/* Hood (top portion seen from slight elevation — darker to show depth) */}
      <rect x={2} y={5} width={96} height={20} rx={4} fill={p.hood} />

      {/* Roof / greenhouse area */}
      <rect x={18} y={0} width={64} height={22} rx={6} fill={p.dark} />

      {/* A-pillar silhouette sides */}
      <path d="M2 5 L18 0 L18 22 L0 22 Z" fill={p.hood} />
      <path d="M98 5 L82 0 L82 22 L100 22 Z" fill={p.hood} />

      {/* === Windshield === */}
      <path
        d="M22 2 L78 2 L82 21 L18 21 Z"
        fill={p.glass}
        opacity={0.95}
      />
      {/* Windshield glare streak */}
      <path
        d="M26 4 L50 4 L52 10 L28 10 Z"
        fill="white"
        opacity={0.07}
      />
      {/* Rear-view mirror shadow line */}
      <line x1={50} y1={2} x2={50} y2={21} stroke="#000" strokeWidth={0.8} opacity={0.2} />

      {/* === Headlights === */}

      {/* Left headlight housing */}
      <rect x={2}  y={28} width={24} height={17} rx={3.5} fill="#e8e0c0" />
      {/* Left headlight inner lens */}
      <rect x={3}  y={29} width={22} height={15} rx={3}   fill="#fff9e0" />
      {/* Left LED strip */}
      <rect x={4}  y={30} width={20} height={3}  rx={1.5} fill="white" opacity={0.7} />
      {/* Left DRL accent */}
      <circle cx={12} cy={39} r={5.5} fill="white"  opacity={0.15} />
      <circle cx={12} cy={39} r={3.5} fill="#fffde0" opacity={0.5} />

      {/* Right headlight housing */}
      <rect x={74} y={28} width={24} height={17} rx={3.5} fill="#e8e0c0" />
      <rect x={75} y={29} width={22} height={15} rx={3}   fill="#fff9e0" />
      <rect x={76} y={30} width={20} height={3}  rx={1.5} fill="white" opacity={0.7} />
      <circle cx={88} cy={39} r={5.5} fill="white"  opacity={0.15} />
      <circle cx={88} cy={39} r={3.5} fill="#fffde0" opacity={0.5} />

      {/* === Grille === */}
      <rect x={28} y={29} width={44} height={16} rx={2} fill="#0a0a0a" />
      {/* Grille horizontal bars */}
      {[32.5, 36.5, 40.5].map(gy => (
        <line key={gy} x1={29} y1={gy} x2={71} y2={gy} stroke="#2a2a2a" strokeWidth={1} />
      ))}
      {/* Grille vertical bars */}
      {[35, 42, 50, 57, 64].map(gx => (
        <line key={gx} x1={gx} y1={29} x2={gx} y2={45} stroke="#2a2a2a" strokeWidth={0.8} />
      ))}

      {/* Front bumper lower section */}
      <rect x={0}  y={47} width={100} height={25} rx={2} fill={p.dark} />
      {/* Bumper highlight (reflective plastic) */}
      <rect x={2}  y={48} width={96}  height={3}  rx={1} fill="white" opacity={0.06} />

      {/* Lower bumper air intake (cosmetic) */}
      <rect x={5}  y={51} width={18}  height={9}  rx={1.5} fill="#0a0a0a" />
      <rect x={77} y={51} width={18}  height={9}  rx={1.5} fill="#0a0a0a" />

      {/* Bumper center diffuser (between plate zone and intakes) */}
      <rect x={25} y={51} width={4}   height={9}  rx={1} fill="#111" />
      <rect x={71} y={51} width={4}   height={9}  rx={1} fill="#111" />

      {/* Bumper bottom edge */}
      <rect x={0} y={69} width={100} height={3} rx={1} fill={p.trim} />

      {/* Wheel arch shadows */}
      <ellipse cx={12}  cy={72} rx={12} ry={4} fill="#00000044" />
      <ellipse cx={88}  cy={72} rx={12} ry={4} fill="#00000044" />
    </>
  );
}

// ─── Car body: rear view ────────────────────────────────────────────────────
function CarRear({ p }: { p: CarPalette }) {
  return (
    <>
      {/* Main body */}
      <rect x={0} y={22} width={100} height={50} fill={p.body} />

      {/* Trunk lid */}
      <rect x={2} y={5} width={96} height={20} rx={4} fill={p.hood} />

      {/* Roof */}
      <rect x={18} y={0} width={64} height={22} rx={6} fill={p.dark} />

      {/* C-pillar silhouette */}
      <path d="M2 5 L18 0 L18 22 L0 22 Z"  fill={p.hood} />
      <path d="M98 5 L82 0 L82 22 L100 22 Z" fill={p.hood} />

      {/* Rear window */}
      <path
        d="M22 2 L78 2 L82 21 L18 21 Z"
        fill={p.glass}
        opacity={0.95}
      />
      {/* Rear window glare */}
      <path d="M26 4 L50 4 L52 10 L28 10 Z" fill="white" opacity={0.06} />
      {/* Rear wiper (subtle) */}
      <line x1={50} y1={14} x2={70} y2={9} stroke="#fff" strokeWidth={0.8} opacity={0.15} />

      {/* High-mount stop light */}
      <rect x={35} y={22} width={30} height={3} rx={1} fill="#ef4444" opacity={0.85} />

      {/* === Tail lights === */}
      {/* Left tail light */}
      <rect x={2}  y={28} width={24} height={17} rx={3.5} fill="#450a0a" />
      <rect x={3}  y={29} width={22} height={15} rx={3}   fill="#7f1d1d" />
      <rect x={4}  y={30} width={20} height={3}  rx={1.5} fill="#ef4444" opacity={0.9} />
      <circle cx={12} cy={39} r={5.5} fill="#ef4444" opacity={0.2} />
      <circle cx={12} cy={39} r={3}   fill="#ef4444" opacity={0.7} />

      {/* Right tail light */}
      <rect x={74} y={28} width={24} height={17} rx={3.5} fill="#450a0a" />
      <rect x={75} y={29} width={22} height={15} rx={3}   fill="#7f1d1d" />
      <rect x={76} y={30} width={20} height={3}  rx={1.5} fill="#ef4444" opacity={0.9} />
      <circle cx={88} cy={39} r={5.5} fill="#ef4444" opacity={0.2} />
      <circle cx={88} cy={39} r={3}   fill="#ef4444" opacity={0.7} />

      {/* Trunk / rear fascia */}
      <rect x={28} y={29} width={44} height={16} rx={1.5} fill={p.dark} />
      {/* Trunk line / spoiler shadow */}
      <line x1={28} y1={29} x2={72} y2={29} stroke={p.trim} strokeWidth={1.5} />

      {/* Rear bumper */}
      <rect x={0}  y={47} width={100} height={25} rx={2} fill={p.dark} />
      <rect x={2}  y={48} width={96}  height={3}  rx={1} fill="white" opacity={0.05} />

      {/* Exhaust pipes */}
      <ellipse cx={18} cy={66} rx={5}   ry={3.5} fill="#1a1a1a" />
      <ellipse cx={18} cy={66} rx={3.5} ry={2.5} fill="#222" />
      <ellipse cx={82} cy={66} rx={5}   ry={3.5} fill="#1a1a1a" />
      <ellipse cx={82} cy={66} rx={3.5} ry={2.5} fill="#222" />

      {/* Rear diffuser */}
      <rect x={27} y={60} width={46} height={8} rx={1} fill="#111" />
      {[33, 39, 45, 51, 57, 63].map(gx => (
        <line key={gx} x1={gx} y1={60} x2={gx} y2={68} stroke="#2a2a2a" strokeWidth={0.8} />
      ))}

      {/* Bumper bottom edge */}
      <rect x={0} y={69} width={100} height={3} rx={1} fill={p.trim} />

      {/* Wheel arch shadows */}
      <ellipse cx={12} cy={72} rx={12} ry={4} fill="#00000044" />
      <ellipse cx={88} cy={72} rx={12} ry={4} fill="#00000044" />
    </>
  );
}

// ─── Main Vehicle component ─────────────────────────────────────────────────
interface VehicleProps {
  config: SimulationConfig;
  vehicleT: number;
  vehicleDepth: DepthValues;
}

export function Vehicle({ config, vehicleT, vehicleDepth }: VehicleProps) {
  const { roadWidth, y } = vehicleDepth;
  const centerX  = getVehicleX(vehicleT, config.detectorPlacement);
  const skewDeg  = getSkewDeg(config.detectorPlacement);
  const frontView = isFrontView(config.detectorPlacement);
  const palette  = PALETTES[config.vehicleColor];

  // Car dimensions in scene space (scales with road width = perspective depth)
  const carW = roadWidth * CAR_ROAD_FRACTION;
  const carH = carW * (CAR_LH / CAR_LW);

  // Car bottom sits on road Y, car extends upward
  const carX = centerX - carW / 2;
  const carY = y - carH;

  // Scale factor from local→scene
  const scaleX = carW / CAR_LW;
  const scaleY = carH / CAR_LH;

  // Skew pivot: bottom-center of car in local space
  const pivotX = centerX;
  const pivotY = y;

  return (
    <g>
      {/* Ground shadow — ellipse under car, very subtle */}
      <ellipse
        cx={centerX}
        cy={y + carH * 0.02}
        rx={carW * 0.44}
        ry={carH * 0.07}
        fill="rgba(0,0,0,0.45)"
      />

      {/* Car SVG group: translate to scene position, scale to scene units */}
      <g
        transform={`
          translate(${pivotX}, ${pivotY})
          skewX(${skewDeg})
          translate(${-pivotX}, ${-pivotY})
          translate(${carX}, ${carY})
          scale(${scaleX}, ${scaleY})
        `}
      >
        {/* Body */}
        {frontView
          ? <CarFront p={palette} />
          : <CarRear  p={palette} />
        }

        {/* License plate — rendered as SVG text, never HTML */}
        <LicensePlate
          text={config.plate}
          x={PLATE_X}
          y={PLATE_Y}
          width={PLATE_W}
          height={PLATE_H}
        />
      </g>
    </g>
  );
}
