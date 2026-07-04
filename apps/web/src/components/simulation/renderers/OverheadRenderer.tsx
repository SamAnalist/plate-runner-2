import type { SceneRendererProps } from './types';
import { lerp, SCENE_W, SCENE_H, GATE_T } from '../../../utils/depth';
import { motion } from 'framer-motion';
import type { VehicleColor } from '@plate-runner/shared';

// ─── Overhead coordinate system ───────────────────────────────────────────
// This renderer does NOT use the perspective depth model.
// The lane runs vertically through the center of the scene.

const LANE_X      = 310;
const LANE_W      = 180;
const LANE_CX     = LANE_X + LANE_W / 2;  // 400
const LANE_FAR_Y  = 55;
const LANE_NEAR_Y = 415;

// Gate position mapped from GATE_T
const GATE_Y = Math.round(lerp(LANE_FAR_Y, LANE_NEAR_Y, GATE_T));  // ≈ 252

// Car top-down dimensions
const CAR_TOP_W = 64;
const CAR_TOP_H = 100;

// Color palettes for top-down view
const TOP_PALETTES: Record<VehicleColor, { body: string; dark: string; glass: string }> = {
  blue:   { body: '#2563eb', dark: '#1e3a8a', glass: '#0c1a2e' },
  white:  { body: '#d8d8d8', dark: '#b0b0b0', glass: '#1e2a38' },
  black:  { body: '#1c1c2e', dark: '#0a0a18', glass: '#050510' },
  silver: { body: '#8d96a3', dark: '#4b5563', glass: '#1a2030' },
  red:    { body: '#dc2626', dark: '#991b1b', glass: '#1a0808' },
  green:  { body: '#16a34a', dark: '#14532d', glass: '#071a10' },
};

export function OverheadRenderer({
  config,
  vehicleT,
  gateOpen,
  vehicleBehindGate,
}: SceneRendererProps) {
  const palette = TOP_PALETTES[config.vehicleColor];

  // Vehicle Y position based on t and direction
  const vehicleY = config.direction === 'incoming'
    ? lerp(LANE_FAR_Y, LANE_NEAR_Y, vehicleT)
    : lerp(LANE_NEAR_Y, LANE_FAR_Y, vehicleT);

  const carX = LANE_CX - CAR_TOP_W / 2;
  const carY = vehicleY - CAR_TOP_H / 2;

  const isFront = config.detectorPlacement.endsWith('_front');

  // Gate arm
  const gateArmAngle = gateOpen ? -76 : 0;
  const armLen = 120;
  const pivotX = LANE_X + LANE_W;
  const pivotY = GATE_Y;

  const gate = (
    <g>
      {/* Post (right side) */}
      <rect x={LANE_X + LANE_W} y={GATE_Y - 8} width={12} height={16} rx={2} fill="#3d4555" />
      {/* Stop line across lane */}
      <line
        x1={LANE_X} y1={GATE_Y}
        x2={LANE_X + LANE_W} y2={GATE_Y}
        stroke="#ef4444" strokeWidth={2} opacity={0.6} strokeDasharray="4 3"
      />
      {/* Gate arm */}
      {config.gateMode !== 'hidden' && (
        <motion.g
          style={{ transformOrigin: `${pivotX}px ${pivotY}px` }}
          animate={{ rotate: gateArmAngle }}
          transition={{ duration: 0.85, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Arm body */}
          <rect
            x={pivotX - armLen} y={pivotY - 3}
            width={armLen} height={6}
            fill={gateOpen ? '#22c55e' : '#ef4444'}
            rx={3}
          />
          {/* Tip */}
          <circle cx={pivotX - armLen} cy={pivotY} r={5} fill="white" opacity={0.8} />
        </motion.g>
      )}
      {/* Status light */}
      <circle
        cx={LANE_X + LANE_W + 6} cy={GATE_Y - 12} r={5}
        fill={gateOpen ? '#22c55e' : '#ef4444'}
        opacity={0.9}
      />
    </g>
  );

  const vehicle = (
    <g>
      {/* Ground shadow */}
      <ellipse
        cx={LANE_CX} cy={vehicleY}
        rx={CAR_TOP_W * 0.55} ry={CAR_TOP_H * 0.4}
        fill="rgba(0,0,0,0.25)"
      />
      {/* Car body */}
      <rect x={carX} y={carY} width={CAR_TOP_W} height={CAR_TOP_H} rx={8} fill={palette.body} />
      {/* Roof */}
      <rect
        x={carX + 6} y={carY + 16}
        width={CAR_TOP_W - 12} height={CAR_TOP_H - 32}
        rx={5} fill={palette.dark}
      />
      {/* Windshield (front) */}
      <rect
        x={carX + 8} y={carY + 5}
        width={CAR_TOP_W - 16} height={18}
        rx={3} fill={palette.glass}
      />
      {/* Rear window */}
      <rect
        x={carX + 8} y={carY + CAR_TOP_H - 23}
        width={CAR_TOP_W - 16} height={18}
        rx={3} fill={palette.glass}
      />
      {/* Door crease */}
      <line
        x1={carX} y1={carY + CAR_TOP_H / 2}
        x2={carX + CAR_TOP_W} y2={carY + CAR_TOP_H / 2}
        stroke={palette.dark} strokeWidth={1} opacity={0.5}
      />
      {/* Headlights (front corners) */}
      <rect x={carX + 1}              y={carY + 2}                 width={12} height={12} rx={2} fill="#fff9d0" opacity={0.9} />
      <rect x={carX + CAR_TOP_W - 13} y={carY + 2}                 width={12} height={12} rx={2} fill="#fff9d0" opacity={0.9} />
      {/* Taillights (rear corners) */}
      <rect x={carX + 1}              y={carY + CAR_TOP_H - 14}    width={12} height={12} rx={2} fill="#ef4444" opacity={0.85} />
      <rect x={carX + CAR_TOP_W - 13} y={carY + CAR_TOP_H - 14}    width={12} height={12} rx={2} fill="#ef4444" opacity={0.85} />
      {/* Plate indicator */}
      {isFront
        ? <rect x={LANE_CX - 15} y={carY + 4}               width={30} height={6} rx={1} fill="white" opacity={0.7} />
        : <rect x={LANE_CX - 15} y={carY + CAR_TOP_H - 10}  width={30} height={6} rx={1} fill="white" opacity={0.7} />
      }
      {/* Direction arrow */}
      {config.direction === 'incoming' ? (
        <path
          d={`M${LANE_CX},${vehicleY + CAR_TOP_H / 2 + 12} L${LANE_CX - 6},${vehicleY + CAR_TOP_H / 2 + 22} L${LANE_CX + 6},${vehicleY + CAR_TOP_H / 2 + 22} Z`}
          fill="#3b82f6" opacity={0.6}
        />
      ) : (
        <path
          d={`M${LANE_CX},${vehicleY - CAR_TOP_H / 2 - 12} L${LANE_CX - 6},${vehicleY - CAR_TOP_H / 2 - 22} L${LANE_CX + 6},${vehicleY - CAR_TOP_H / 2 - 22} Z`}
          fill="#3b82f6" opacity={0.6}
        />
      )}
    </g>
  );

  return (
    <>
      {/* ── Background ── */}
      <rect x={0} y={0} width={SCENE_W} height={SCENE_H} fill="#161a1e" />

      {/* ── Areas outside lane ── */}
      <rect x={0}              y={0} width={LANE_X}                    height={SCENE_H} fill="#1c2026" />
      <rect x={LANE_X + LANE_W} y={0} width={SCENE_W - LANE_X - LANE_W} height={SCENE_H} fill="#1c2026" />

      {/* ── Lane ── */}
      <rect x={LANE_X} y={0} width={LANE_W} height={SCENE_H} fill="#252a2e" />

      {/* ── Lane markings ── */}
      <line x1={LANE_X}          y1={0} x2={LANE_X}          y2={SCENE_H} stroke="white" strokeWidth={1.5} opacity={0.4} />
      <line x1={LANE_X + LANE_W} y1={0} x2={LANE_X + LANE_W} y2={SCENE_H} stroke="white" strokeWidth={1.5} opacity={0.4} />

      {/* Center dashes */}
      {Array.from({ length: 14 }, (_, i) => (
        <line key={i}
          x1={LANE_CX} y1={30 + i * 35}
          x2={LANE_CX} y2={30 + i * 35 + 18}
          stroke="white" strokeWidth={1.2} opacity={0.2}
        />
      ))}

      {/* ── Z-ordered gate + vehicle ── */}
      {vehicleBehindGate ? (<>{vehicle}{gate}</>) : (<>{gate}{vehicle}</>)}

      {/* ── Label ── */}
      <text
        x={12} y={18}
        fontSize={9}
        fill="rgba(255,255,255,0.3)"
        fontFamily='"JetBrains Mono", monospace'
        fontWeight={600}
        letterSpacing="0.12em"
      >
        OVERHEAD VIEW
      </text>

      {/* ── Gate position indicator ── */}
      <text
        x={LANE_X - 6} y={GATE_Y + 4}
        fontSize={8}
        fill="rgba(255,255,255,0.25)"
        fontFamily='"JetBrains Mono", monospace'
        textAnchor="end"
      >
        GATE
      </text>
    </>
  );
}
