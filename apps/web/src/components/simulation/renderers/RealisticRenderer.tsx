import { motion } from 'framer-motion';
import type { VehicleColor } from '@plate-runner/shared';
import type { SceneRendererProps } from './types';
import { LicensePlate } from '../LicensePlate';
import {
  SCENE_W,
  SCENE_H,
  VP_X,
  VP_Y,
  lerp,
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
} from '../../../utils/depth';

// ─── Road edge coordinates (mirrored from Road.tsx) ───────────────────────
const RL_FAR   = VP_X - 10;
const RR_FAR   = VP_X + 10;
const RL_NEAR  = SCENE_W * 0.175;
const RR_NEAR  = SCENE_W * 0.825;
const SHOULDER_NEAR = 55;
const SHOULDER_FAR  = 5;

// ─── Realistic car color palettes (slightly desaturated) ──────────────────
interface RCarPalette {
  body: string;
  hood: string;
  dark: string;
  glass: string;
  trim: string;
}

const R_PALETTES: Record<VehicleColor, RCarPalette> = {
  blue:   { body: '#1e4fcf', hood: '#1a44bb', dark: '#102d80', glass: '#090f1e', trim: '#163898' },
  white:  { body: '#d5d5d5', hood: '#c2c2c2', dark: '#a0a0a0', glass: '#1a2230', trim: '#b0b0b0' },
  black:  { body: '#181820', hood: '#111118', dark: '#080810', glass: '#030308', trim: '#222230' },
  silver: { body: '#7e8794', hood: '#606870', dark: '#424a52', glass: '#141b27', trim: '#505860' },
  red:    { body: '#c82020', hood: '#a81818', dark: '#881414', glass: '#150606', trim: '#900e0e' },
  green:  { body: '#138c3e', hood: '#116e30', dark: '#0e4820', glass: '#04120a', trim: '#0c5e28' },
};

// ─── Inline realistic car body: front ──────────────────────────────────────
function RealisticCarFront({ p }: { p: RCarPalette }) {
  return (
    <>
      {/* Roof */}
      <rect x={14} y={0} width={72} height={18} rx={5} fill={p.dark} />
      {/* A-pillar left */}
      <path d="M0,18 L14,0 L14,18 Z" fill={p.hood} />
      {/* A-pillar right */}
      <path d="M100,18 L86,0 L86,18 Z" fill={p.hood} />
      {/* Windshield */}
      <path d="M15,1 L85,1 L88,18 L12,18 Z" fill={p.glass} opacity={0.95} />
      {/* Windshield glare */}
      <path d="M18,3 L48,3 L50,9 L20,9 Z" fill="white" opacity={0.06} />
      {/* Hood */}
      <path d="M0,18 L100,18 L96,24 L4,24 Z" fill={p.hood} />
      {/* Body / doors */}
      <rect x={0} y={24} width={100} height={34} fill={p.body} />
      {/* Door crease */}
      <line x1={0} y1={38} x2={100} y2={38} stroke={p.dark} strokeWidth={0.5} opacity={0.7} />
      {/* Left headlight */}
      <rect x={2} y={26} width={20} height={16} rx={3} fill="#e4dba8" />
      <rect x={3} y={27} width={18} height={14} rx={2.5} fill="#fff8d5" />
      <rect x={4} y={28} width={16} height={3} rx={1.5} fill="white" opacity={0.75} />
      <circle cx={10} cy={36} r={4.5} fill="#fffde0" opacity={0.55} />
      {/* Right headlight */}
      <rect x={78} y={26} width={20} height={16} rx={3} fill="#e4dba8" />
      <rect x={79} y={27} width={18} height={14} rx={2.5} fill="#fff8d5" />
      <rect x={80} y={28} width={16} height={3} rx={1.5} fill="white" opacity={0.75} />
      <circle cx={90} cy={36} r={4.5} fill="#fffde0" opacity={0.55} />
      {/* Grille */}
      <rect x={26} y={26} width={48} height={16} rx={2} fill="#0d0d0d" />
      {[29.5, 33.5, 37.5].map(gy => (
        <line key={gy} x1={27} y1={gy} x2={73} y2={gy} stroke="#282828" strokeWidth={1} />
      ))}
      {[33, 40, 50, 57, 64].map(gx => (
        <line key={gx} x1={gx} y1={26} x2={gx} y2={42} stroke="#282828" strokeWidth={0.8} />
      ))}
      {/* Front bumper */}
      <rect x={0} y={44} width={100} height={22} rx={2} fill={p.dark} />
      <rect x={2} y={45} width={96} height={3} rx={1} fill="white" opacity={0.05} />
      {/* Fog light insets */}
      <rect x={5} y={48} width={16} height={8} rx={1.5} fill="#0a0a0a" />
      <rect x={7} y={49} width={12} height={6} rx={1} fill="#fffde0" opacity={0.22} />
      <rect x={79} y={48} width={16} height={8} rx={1.5} fill="#0a0a0a" />
      <rect x={81} y={49} width={12} height={6} rx={1} fill="#fffde0" opacity={0.22} />
      {/* Bumper bottom trim */}
      <rect x={0} y={63} width={100} height={3} rx={1} fill={p.trim} />
      {/* Tires */}
      <ellipse cx={14} cy={68} rx={11} ry={5} fill="#111" />
      <ellipse cx={14} cy={68} rx={8}  ry={3.5} fill="#1e1e1e" />
      <ellipse cx={86} cy={68} rx={11} ry={5} fill="#111" />
      <ellipse cx={86} cy={68} rx={8}  ry={3.5} fill="#1e1e1e" />
      {/* Wheel arch shadows */}
      <ellipse cx={14} cy={72} rx={12} ry={4} fill="rgba(0,0,0,0.5)" />
      <ellipse cx={86} cy={72} rx={12} ry={4} fill="rgba(0,0,0,0.5)" />
    </>
  );
}

// ─── Inline realistic car body: rear ──────────────────────────────────────
function RealisticCarRear({ p }: { p: RCarPalette }) {
  return (
    <>
      {/* Roof */}
      <rect x={14} y={0} width={72} height={18} rx={5} fill={p.dark} />
      {/* C-pillar left */}
      <path d="M0,18 L14,0 L14,18 Z" fill={p.hood} />
      {/* C-pillar right */}
      <path d="M100,18 L86,0 L86,18 Z" fill={p.hood} />
      {/* Rear window */}
      <path d="M15,1 L85,1 L88,18 L12,18 Z" fill={p.glass} opacity={0.95} />
      <path d="M18,3 L48,3 L50,9 L20,9 Z" fill="white" opacity={0.05} />
      {/* Rear wiper */}
      <line x1={50} y1={14} x2={72} y2={9} stroke="white" strokeWidth={0.8} opacity={0.15} />
      {/* Trunk lid */}
      <path d="M0,18 L100,18 L96,24 L4,24 Z" fill={p.hood} />
      {/* Body */}
      <rect x={0} y={24} width={100} height={34} fill={p.body} />
      {/* Door crease */}
      <line x1={0} y1={38} x2={100} y2={38} stroke={p.dark} strokeWidth={0.5} opacity={0.7} />
      {/* High-mount stop light */}
      <rect x={34} y={22} width={32} height={3} rx={1} fill="#ef4444" opacity={0.85} />
      {/* Left tail light */}
      <rect x={2} y={26} width={20} height={16} rx={3} fill="#450a0a" />
      <rect x={3} y={27} width={18} height={14} rx={2.5} fill="#7f0000" />
      <rect x={4} y={28} width={16} height={3} rx={1.5} fill="#ef4444" opacity={0.88} />
      <circle cx={10} cy={36} r={4} fill="#ef4444" opacity={0.6} />
      {/* Right tail light */}
      <rect x={78} y={26} width={20} height={16} rx={3} fill="#450a0a" />
      <rect x={79} y={27} width={18} height={14} rx={2.5} fill="#7f0000" />
      <rect x={80} y={28} width={16} height={3} rx={1.5} fill="#ef4444" opacity={0.88} />
      <circle cx={90} cy={36} r={4} fill="#ef4444" opacity={0.6} />
      {/* Rear fascia */}
      <rect x={28} y={26} width={44} height={16} rx={1.5} fill={p.dark} />
      <line x1={28} y1={26} x2={72} y2={26} stroke={p.trim} strokeWidth={1.5} />
      {/* Rear bumper */}
      <rect x={0} y={44} width={100} height={22} rx={2} fill={p.dark} />
      <rect x={2} y={45} width={96} height={3} rx={1} fill="white" opacity={0.04} />
      {/* Exhaust pipes */}
      <ellipse cx={18} cy={62} rx={5}   ry={3.5} fill="#1a1a1a" />
      <ellipse cx={18} cy={62} rx={3.5} ry={2.5} fill="#222" />
      <ellipse cx={82} cy={62} rx={5}   ry={3.5} fill="#1a1a1a" />
      <ellipse cx={82} cy={62} rx={3.5} ry={2.5} fill="#222" />
      {/* Rear diffuser */}
      <rect x={28} y={56} width={44} height={8} rx={1} fill="#111" />
      {[34, 40, 46, 52, 58, 64].map(gx => (
        <line key={gx} x1={gx} y1={56} x2={gx} y2={64} stroke="#282828" strokeWidth={0.8} />
      ))}
      {/* Bumper trim */}
      <rect x={0} y={63} width={100} height={3} rx={1} fill={p.trim} />
      {/* Tires */}
      <ellipse cx={14} cy={68} rx={11} ry={5} fill="#111" />
      <ellipse cx={14} cy={68} rx={8}  ry={3.5} fill="#1e1e1e" />
      <ellipse cx={86} cy={68} rx={11} ry={5} fill="#111" />
      <ellipse cx={86} cy={68} rx={8}  ry={3.5} fill="#1e1e1e" />
      {/* Wheel arch shadows */}
      <ellipse cx={14} cy={72} rx={12} ry={4} fill="rgba(0,0,0,0.5)" />
      <ellipse cx={86} cy={72} rx={12} ry={4} fill="rgba(0,0,0,0.5)" />
    </>
  );
}

// ─── Inline realistic gate ─────────────────────────────────────────────────
function RealisticGate({
  gateDepth,
  gateOpen,
  gateMode,
}: {
  gateDepth: SceneRendererProps['gateDepth'];
  gateOpen: boolean;
  gateMode: string;
}) {
  if (gateMode === 'hidden') return null;

  const { roadRight, roadWidth, y, scale } = gateDepth;

  const postW  = Math.max(6, roadWidth * 0.04);
  const postH  = Math.max(30, 90 * scale);
  const postX  = roadRight - postW;
  const postY  = y - postH;

  const armLen   = roadWidth * 0.90;
  const armThick = Math.max(3, roadWidth * 0.022);

  const pivotX = postX + postW / 2;
  const pivotY = postY + postH * 0.14;

  const armTipX = pivotX - armLen;
  const armAngle = gateOpen ? -76 : 0;

  const lightR    = Math.max(2.5, postW * 0.42);
  const lightCX   = postX + postW / 2;
  const lightCY   = postY + postH * 0.10;
  const lightColor = gateOpen ? '#22c55e' : '#ef4444';

  // Safety stripe positions
  const numStripes = 5;
  const stripes = Array.from({ length: numStripes }, (_, i) => ({
    x: armTipX + armLen * (0.12 + i * 0.17),
    w: armLen * 0.056,
  }));

  return (
    <g>
      {/* Post shadow */}
      <ellipse
        cx={postX + postW / 2}
        cy={y + 1}
        rx={postW * 2.2}
        ry={3.5 * scale}
        fill="rgba(0,0,0,0.35)"
      />
      {/* Post — gunmetal */}
      <rect
        x={postX} y={postY}
        width={postW} height={postH}
        fill="#2a2e36"
        rx={postW * 0.22}
        ry={postW * 0.22}
      />
      {/* Post edge highlight */}
      <rect
        x={postX + postW * 0.15}
        y={postY + postH * 0.04}
        width={postW * 0.22}
        height={postH * 0.78}
        fill="rgba(255,255,255,0.07)"
        rx={postW * 0.1}
      />
      {/* Post base */}
      <rect
        x={postX - postW * 0.6}
        y={y - 5 * scale}
        width={postW * 2.2}
        height={5 * scale}
        fill="#444a56"
        rx={2}
      />
      {/* Status LED */}
      <circle cx={lightCX} cy={lightCY} r={lightR * 1.5} fill={lightColor} opacity={0.18} />
      <circle cx={lightCX} cy={lightCY} r={lightR}       fill={lightColor} opacity={0.92} />
      <circle
        cx={lightCX - lightR * 0.28}
        cy={lightCY - lightR * 0.28}
        r={lightR * 0.35}
        fill="white"
        opacity={0.55}
      />
      {/* Arm (Framer Motion) */}
      <motion.g
        style={{ transformOrigin: `${pivotX}px ${pivotY}px` }}
        animate={{ rotate: armAngle }}
        transition={{ duration: 0.85, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Arm body — always yellow safety color */}
        <rect
          x={armTipX}
          y={pivotY - armThick / 2}
          width={armLen}
          height={armThick}
          fill="#f0b800"
          rx={armThick * 0.5}
        />
        {/* Black diagonal safety stripes */}
        {stripes.map((s, i) => (
          <rect
            key={i}
            x={s.x}
            y={pivotY - armThick / 2}
            width={s.w}
            height={armThick}
            fill="#111"
            opacity={0.55}
            rx={armThick * 0.35}
          />
        ))}
        {/* Arm tip cap */}
        <circle
          cx={armTipX}
          cy={pivotY}
          r={armThick * 0.9}
          fill="white"
          opacity={0.85}
        />
        <circle
          cx={armTipX}
          cy={pivotY}
          r={armThick * 0.45}
          fill={gateOpen ? '#22c55e' : '#ef4444'}
          opacity={0.7}
        />
      </motion.g>
      {/* Pivot cap */}
      <circle
        cx={pivotX}
        cy={pivotY}
        r={armThick * 0.95}
        fill="#5a6378"
      />
    </g>
  );
}

// ─── Main RealisticRenderer ────────────────────────────────────────────────
export function RealisticRenderer({
  config,
  vehicleT,
  vehicleDepth,
  gateDepth,
  gateOpen,
  vehicleBehindGate,
}: SceneRendererProps) {
  const { roadWidth, y } = vehicleDepth;
  const centerX  = getVehicleX(vehicleT, config.detectorPlacement);
  const skewDeg  = getSkewDeg(config.detectorPlacement);
  const frontView = isFrontView(config.detectorPlacement);
  const palette  = R_PALETTES[config.vehicleColor];

  const carW = roadWidth * CAR_ROAD_FRACTION;
  const carH = carW * (CAR_LH / CAR_LW);
  const carX = centerX - carW / 2;
  const carY = y - carH;
  const scaleX = carW / CAR_LW;
  const scaleY = carH / CAR_LH;
  const pivotX = centerX;
  const pivotY = y;

  // Road polygon points
  const road = [
    `${RL_FAR},${VP_Y}`,
    `${RR_FAR},${VP_Y}`,
    `${RR_NEAR},${SCENE_H}`,
    `${RL_NEAR},${SCENE_H}`,
  ].join(' ');

  const lShoulder = [
    `${RL_FAR - SHOULDER_FAR},${VP_Y}`,
    `${RL_FAR},${VP_Y}`,
    `${RL_NEAR},${SCENE_H}`,
    `${RL_NEAR - SHOULDER_NEAR},${SCENE_H}`,
  ].join(' ');

  const rShoulder = [
    `${RR_FAR},${VP_Y}`,
    `${RR_FAR + SHOULDER_FAR},${VP_Y}`,
    `${RR_NEAR + SHOULDER_NEAR},${SCENE_H}`,
    `${RR_NEAR},${SCENE_H}`,
  ].join(' ');

  // Center-line dashes
  const NUM_DASHES = 9;
  const centerDashes = Array.from({ length: NUM_DASHES }, (_, i) => {
    const t0 = (i + 0.08) / NUM_DASHES;
    const t1 = (i + 0.45) / NUM_DASHES;
    const cx = (RL_FAR + RR_FAR) / 2;
    const nx = (RL_NEAR + RR_NEAR) / 2;
    const x0 = lerp(cx, nx, t0);
    const y0 = lerp(VP_Y, SCENE_H, t0);
    const x1 = lerp(cx, nx, t1);
    const y1 = lerp(VP_Y, SCENE_H, t1);
    const w  = lerp(0.6, 4.5, (t0 + t1) / 2);
    return { x0, y0, x1, y1, w };
  });

  const vehicle = (
    <g>
      {/* Ground shadow */}
      <ellipse
        cx={centerX}
        cy={y + carH * 0.02}
        rx={carW * 0.45}
        ry={carH * 0.08}
        fill="rgba(0,0,0,0.5)"
      />
      {/* Car body */}
      <g transform={`
        translate(${pivotX}, ${pivotY})
        skewX(${skewDeg})
        translate(${-pivotX}, ${-pivotY})
        translate(${carX}, ${carY})
        scale(${scaleX}, ${scaleY})
      `}>
        {frontView ? <RealisticCarFront p={palette} /> : <RealisticCarRear p={palette} />}
        <LicensePlate
          text={config.plate}
          x={CAR_PLATE_X}
          y={CAR_PLATE_Y}
          width={CAR_PLATE_W}
          height={CAR_PLATE_H}
        />
      </g>
    </g>
  );

  const gate = (
    <RealisticGate
      gateDepth={gateDepth}
      gateOpen={gateOpen}
      gateMode={config.gateMode}
    />
  );

  return (
    <>
      <defs>
        {/* Sky: concrete wall effect (top 40%) */}
        <linearGradient id="rWallGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#1e2024" />
          <stop offset="100%" stopColor="#2a2d31" />
        </linearGradient>
        {/* Vignette */}
        <radialGradient id="rVignette" cx="50%" cy="50%" r="70%">
          <stop offset="0%"   stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.50)" />
        </radialGradient>
      </defs>

      {/* Concrete wall (top ~40%) */}
      <rect x={0} y={0} width={SCENE_W} height={VP_Y} fill="url(#rWallGrad)" />

      {/* Asphalt ground (bottom ~60%) */}
      <rect x={0} y={VP_Y} width={SCENE_W} height={SCENE_H - VP_Y} fill="#1c1f23" />

      {/* Divider strip */}
      <line x1={0} y1={VP_Y} x2={SCENE_W} y2={VP_Y} stroke="#383c44" strokeWidth={1.5} opacity={0.7} />

      {/* Left shoulder */}
      <polygon points={lShoulder} fill="#1a1d20" />
      {/* Right shoulder */}
      <polygon points={rShoulder} fill="#1a1d20" />

      {/* Road surface */}
      <polygon points={road} fill="#232629" />

      {/* Edge lines — yellow */}
      <line
        x1={RL_FAR}  y1={VP_Y}
        x2={RL_NEAR} y2={SCENE_H}
        stroke="#e8b830" strokeWidth={1.8} opacity={0.6}
      />
      <line
        x1={RR_FAR}  y1={VP_Y}
        x2={RR_NEAR} y2={SCENE_H}
        stroke="#e8b830" strokeWidth={1.8} opacity={0.6}
      />

      {/* Center line dashes — yellow */}
      {centerDashes.map((d, i) => (
        <line
          key={i}
          x1={d.x0} y1={d.y0}
          x2={d.x1} y2={d.y1}
          stroke="#e8b830"
          strokeWidth={d.w}
          opacity={0.25}
        />
      ))}

      {/* Gate + Vehicle Z-ordered */}
      {vehicleBehindGate ? (
        <>{vehicle}{gate}</>
      ) : (
        <>{gate}{vehicle}</>
      )}

      {/* Vignette */}
      <rect x={0} y={0} width={SCENE_W} height={SCENE_H} fill="url(#rVignette)" pointerEvents="none" />
    </>
  );
}
