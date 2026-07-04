import type { SceneRendererProps } from './types';
import { Vehicle } from '../Vehicle';
import { Gate } from '../Gate';
import {
  SCENE_W,
  SCENE_H,
  VP_X,
  VP_Y,
  lerp,
  isFrontView,
  getVehicleX,
  CAR_LW,
  CAR_LH,
  CAR_ROAD_FRACTION,
} from '../../../utils/depth';

// ─── Road edge constants (mirrored from Road.tsx) ─────────────────────────
const RL_FAR   = VP_X - 10;
const RR_FAR   = VP_X + 10;
const RL_NEAR  = SCENE_W * 0.175;
const RR_NEAR  = SCENE_W * 0.825;
const SHOULDER_NEAR = 55;
const SHOULDER_FAR  = 5;

// ─── Static star positions ────────────────────────────────────────────────
const STARS: { cx: number; cy: number; r: number; opacity: number }[] = [
  { cx:  48, cy:  22, r: 0.8, opacity: 0.55 },
  { cx: 130, cy:  45, r: 0.8, opacity: 0.35 },
  { cx: 215, cy:  18, r: 0.8, opacity: 0.45 },
  { cx: 310, cy:  58, r: 0.8, opacity: 0.30 },
  { cx: 390, cy:  30, r: 0.8, opacity: 0.50 },
  { cx: 480, cy:  12, r: 0.8, opacity: 0.40 },
  { cx: 560, cy:  50, r: 0.8, opacity: 0.55 },
  { cx: 640, cy:  25, r: 0.8, opacity: 0.35 },
  { cx: 720, cy:  55, r: 0.8, opacity: 0.45 },
  { cx: 780, cy:  38, r: 0.8, opacity: 0.30 },
];

// ─── City silhouette buildings ────────────────────────────────────────────
const BUILDINGS: { x: number; y: number; w: number; h: number }[] = [
  { x:  20, y: VP_Y - 55, w:  40, h: 55 },
  { x:  68, y: VP_Y - 32, w:  35, h: 32 },
  { x: 110, y: VP_Y - 68, w:  28, h: 68 },
  { x: 145, y: VP_Y - 42, w:  50, h: 42 },
  { x: 600, y: VP_Y - 60, w:  35, h: 60 },
  { x: 640, y: VP_Y - 38, w:  50, h: 38 },
  { x: 698, y: VP_Y - 72, w:  30, h: 72 },
  { x: 736, y: VP_Y - 45, w:  45, h: 45 },
];

export function CinematicRenderer({
  config,
  vehicleT,
  vehicleDepth,
  gateDepth,
  gateOpen,
  vehicleBehindGate,
}: SceneRendererProps) {
  const { roadWidth, y } = vehicleDepth;
  const centerX  = getVehicleX(vehicleT, config.detectorPlacement);
  const frontView = isFrontView(config.detectorPlacement);

  const carW = roadWidth * CAR_ROAD_FRACTION;
  const carH = carW * (CAR_LH / CAR_LW);

  // Road polygon strings
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

  // Wet reflection road polygon (same as road, reversed y gradient)
  const roadReflect = road;

  // Center dashes
  const centerDashes = Array.from({ length: 9 }, (_, i) => {
    const t0 = (i + 0.08) / 9;
    const t1 = (i + 0.45) / 9;
    const cx = (RL_FAR + RR_FAR) / 2;
    const nx = (RL_NEAR + RR_NEAR) / 2;
    return {
      x0: lerp(cx, nx, t0), y0: lerp(VP_Y, SCENE_H, t0),
      x1: lerp(cx, nx, t1), y1: lerp(VP_Y, SCENE_H, t1),
      w:  lerp(0.6, 4.5, (t0 + t1) / 2),
    };
  });

  return (
    <>
      <defs>
        {/* Night sky gradient */}
        <linearGradient id="cinSkyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#010205" />
          <stop offset="100%" stopColor="#05080f" />
        </linearGradient>

        {/* Horizon amber warm glow */}
        <radialGradient id="cinHorizGlow" cx="50%" cy="100%" r="55%">
          <stop offset="0%"   stopColor="#ff7a00" stopOpacity={0.08} />
          <stop offset="100%" stopColor="#010205" stopOpacity={0} />
        </radialGradient>

        {/* Headlight glow */}
        <radialGradient id="headlightGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="white" stopOpacity={0.55} />
          <stop offset="100%" stopColor="white" stopOpacity={0} />
        </radialGradient>

        {/* Taillight glow */}
        <radialGradient id="taillightGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#ef4444" stopOpacity={0.50} />
          <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
        </radialGradient>

        {/* Wet road reflection gradient */}
        <linearGradient id="wetReflect" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%"   stopColor="white" stopOpacity={0.04} />
          <stop offset="100%" stopColor="white" stopOpacity={0} />
        </linearGradient>

        {/* Vignette (stronger for cinematic feel) */}
        <radialGradient id="cinVignette" cx="50%" cy="50%" r="70%">
          <stop offset="0%"   stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.70)" />
        </radialGradient>
      </defs>

      {/* ── Sky ── */}
      <rect x={0} y={0} width={SCENE_W} height={SCENE_H} fill="url(#cinSkyGrad)" />

      {/* Horizon glow */}
      <rect x={0} y={0} width={SCENE_W} height={SCENE_H} fill="url(#cinHorizGlow)" />

      {/* Stars */}
      {STARS.map((s, i) => (
        <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="white" opacity={s.opacity} />
      ))}

      {/* City silhouette */}
      {BUILDINGS.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} fill="#0a0b10" />
      ))}

      {/* ── Fog strip near horizon ── */}
      <rect
        x={0} y={VP_Y - 20}
        width={SCENE_W} height={50}
        fill="#1e2a3a" opacity={0.18}
        pointerEvents="none"
      />

      {/* ── Road ── */}
      <polygon points={lShoulder} fill="#080a0d" />
      <polygon points={rShoulder} fill="#080a0d" />
      <polygon points={road}      fill="#0a0c10" />

      {/* Wet reflection on road */}
      <polygon points={roadReflect} fill="url(#wetReflect)" />

      {/* Edge lines */}
      <line x1={RL_FAR} y1={VP_Y} x2={RL_NEAR} y2={SCENE_H} stroke="#ccc8b8" strokeWidth={1.8} opacity={0.4} />
      <line x1={RR_FAR} y1={VP_Y} x2={RR_NEAR} y2={SCENE_H} stroke="#ccc8b8" strokeWidth={1.8} opacity={0.4} />

      {/* Center dashes */}
      {centerDashes.map((d, i) => (
        <line key={i} x1={d.x0} y1={d.y0} x2={d.x1} y2={d.y1}
              stroke="#ccc8b8" strokeWidth={d.w} opacity={0.15} />
      ))}

      {/* ── Headlight or taillight glow ── */}
      {frontView ? (
        <>
          {/* Left headlight pool */}
          <ellipse
            cx={centerX - carW * 0.22}
            cy={y + carH * 0.05}
            rx={carW * 0.14}
            ry={carH * 0.22}
            fill="url(#headlightGlow)"
          />
          {/* Right headlight pool */}
          <ellipse
            cx={centerX + carW * 0.22}
            cy={y + carH * 0.05}
            rx={carW * 0.14}
            ry={carH * 0.22}
            fill="url(#headlightGlow)"
          />
        </>
      ) : (
        <>
          {/* Left taillight glow */}
          <ellipse
            cx={centerX - carW * 0.20}
            cy={y + carH * 0.08}
            rx={carW * 0.12}
            ry={carH * 0.18}
            fill="url(#taillightGlow)"
          />
          {/* Right taillight glow */}
          <ellipse
            cx={centerX + carW * 0.20}
            cy={y + carH * 0.08}
            rx={carW * 0.12}
            ry={carH * 0.18}
            fill="url(#taillightGlow)"
          />
        </>
      )}

      {/* ── Ambient bounce light behind car ── */}
      <ellipse
        cx={centerX}
        cy={y}
        rx={carW * 0.5}
        ry={carH * 0.3}
        fill="rgba(0,40,80,0.15)"
      />

      {/* ── Gate + Vehicle (Z-ordered) ── */}
      {vehicleBehindGate ? (
        <>
          <Vehicle config={config} vehicleT={vehicleT} vehicleDepth={vehicleDepth} />
          <Gate gateDepth={gateDepth} gateOpen={gateOpen} gateMode={config.gateMode} />
        </>
      ) : (
        <>
          <Gate gateDepth={gateDepth} gateOpen={gateOpen} gateMode={config.gateMode} />
          <Vehicle config={config} vehicleT={vehicleT} vehicleDepth={vehicleDepth} />
        </>
      )}

      {/* ── Vignette (stronger for cinematic mood) ── */}
      <rect x={0} y={0} width={SCENE_W} height={SCENE_H} fill="url(#cinVignette)" pointerEvents="none" />
    </>
  );
}
