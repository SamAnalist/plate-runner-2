/**
 * DriverBackScene — Parking exit environment (driver_back POV).
 *
 * Camera is mounted on the driver/left side of the exit lane, elevated ~2–3 m,
 * looking diagonally toward cars exiting (away direction). The scene simulates
 * a covered parking exit lane viewed from the left/driver side.
 *
 * This is the away-direction counterpart of DriverFrontScene.
 * Geometry is identical to DriverFrontScene; palette shifts to the warm
 * sodium-vapor interior tones of CenterBackScene.
 *
 * Key visual characteristics
 * ──────────────────────────
 * • Camera close to left wall → thin left wall wedge, full right panel
 * • Ceiling asymmetric: near left x=60, near right x=660
 * • Tube lights swept LEFT toward camera
 * • Structural column on left near edge
 * • Warm amber/sodium-vapor interior palette
 * • Outdoor daylight glow at horizon (exit opening)
 * • Exit direction arrow (amber tint) on asphalt
 *
 * Ceiling geometry
 * ────────────────
 * Same road constants at horizon (RL_FAR=390, RR_FAR=410).
 * Near left x=60 (camera side), near right x=660 (standard).
 *
 *   Left wall:    (0,0)→(60,0)→(390,145)→(0,145)      — thin wedge
 *   Right wall:   (660,0)→(800,0)→(800,145)→(410,145) — full panel
 *   Ceiling:      (60,0)→(660,0)→(410,145)→(390,145)  — wide, asymmetric
 *
 * Relies on shared defs in AssetRealisticRenderer:
 *   #arAsphalt — road surface texture pattern
 */
import {
  SCENE_W, SCENE_H, VP_X, VP_Y, GATE_T_BACK, lerp,
} from '../../../../../utils/depth';

// ─── Road geometry constants ─────────────────────────────────────────────────
const RL_FAR  = VP_X - 10;          // 390
const RR_FAR  = VP_X + 10;          // 410
const RL_NEAR = SCENE_W * 0.175;    // 140
const RR_NEAR = SCENE_W * 0.825;    // 660
const SHOULDER_NEAR = 55;
const SHOULDER_FAR  = 5;

// ─── Ceiling geometry — asymmetric (camera on LEFT/driver side) ──────────────
const CL_NEAR_X = 60;               // ceiling near left edge  (camera side)
const CR_NEAR_X = RR_NEAR;          // ceiling near right edge (660)

// ─── Road polygon strings ────────────────────────────────────────────────────
function rp(lf: number, rf: number, yf: number, ln: number, rn: number, yn: number) {
  return `${lf},${yf} ${rf},${yf} ${rn},${yn} ${ln},${yn}`;
}
const road      = rp(RL_FAR, RR_FAR, VP_Y, RL_NEAR, RR_NEAR, SCENE_H);
const lShoulder = rp(RL_FAR - SHOULDER_FAR, RL_FAR, VP_Y, RL_NEAR - SHOULDER_NEAR, RL_NEAR, SCENE_H);
const rShoulder = rp(RR_FAR, RR_FAR + SHOULDER_FAR, VP_Y, RR_NEAR, RR_NEAR + SHOULDER_NEAR, SCENE_H);

// ─── Ceiling depth grid lines ─────────────────────────────────────────────────
const CEIL_LINES = [0.25, 0.50, 0.75].map(t => ({
  y:  Math.round(lerp(VP_Y, 0, t)),
  lx: Math.round(lerp(RL_FAR, CL_NEAR_X, t)),
  rx: Math.round(lerp(RR_FAR, CR_NEAR_X, t)),
}));

// ─── Fluorescent tube lights ──────────────────────────────────────────────────
// Warm sodium-vapor tone, near ends swept LEFT (toward camera-left).
const TUBE_L_X1 = VP_X - 2;    const TUBE_L_Y1 = VP_Y;
const TUBE_L_X2 = 200;         const TUBE_L_Y2 = 0;
const TUBE_R_X1 = VP_X + 2;    const TUBE_R_Y1 = VP_Y;
const TUBE_R_X2 = 360;         const TUBE_R_Y2 = 0;

// ─── Gate / stop-line geometry ────────────────────────────────────────────────
const GATE_Y  = Math.round(lerp(VP_Y, SCENE_H, GATE_T_BACK));
const GATE_RL = Math.round(lerp(RL_FAR, RL_NEAR, GATE_T_BACK));
const GATE_RR = Math.round(lerp(RR_FAR, RR_NEAR, GATE_T_BACK));

// ─── Exit direction arrow ─────────────────────────────────────────────────────
// Positioned further from gate (t=0.72), up-pointing (toward VP = exit direction).
const ARR_T    = 0.72;
const ARR_Y    = lerp(VP_Y, SCENE_H, ARR_T);
const ARR_RW   = lerp(RR_FAR - RL_FAR, RR_NEAR - RL_NEAR, ARR_T);
const ARR_H    = ARR_RW * 0.42;
const ARR_HH   = ARR_H  * 0.43;
const ARR_HW   = ARR_RW * 0.18;
const ARR_BW   = ARR_RW * 0.065;
const ARR_TIP_Y  = ARR_Y - ARR_H / 2;
const ARR_BASE_Y = ARR_Y + ARR_H / 2;
const ARR_HBAS_Y = ARR_TIP_Y + ARR_HH;

// ─── Centre-line dashes ───────────────────────────────────────────────────────
const CENTER_DASHES = Array.from({ length: 9 }, (_, i) => {
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

// ─── Floor light pools ────────────────────────────────────────────────────────
// Warm amber tone, shifted LEFT.
const FLOOR_POOLS = [
  { t: 0.28, cx: 330, frac: 0.13 },
  { t: 0.50, cx: 310, frac: 0.12 },
].map(p => {
  const rw = lerp(RR_FAR - RL_FAR, RR_NEAR - RL_NEAR, p.t);
  return {
    cx: p.cx,
    cy: lerp(VP_Y, SCENE_H, p.t),
    rx: rw * p.frac,
    ry: rw * p.frac * 0.38,
  };
});

// ─── Component ────────────────────────────────────────────────────────────────
export function DriverBackScene() {
  return (
    <>
      <defs>
        {/* Parking interior — warm sodium-vapor orange tint */}
        <linearGradient id="dbWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#1a1914" />
          <stop offset="100%" stopColor="#231f18" />
        </linearGradient>

        <linearGradient id="dbCeil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#13110c" />
          <stop offset="100%" stopColor="#1e1a13" />
        </linearGradient>

        {/* Outdoor daylight glow at exit horizon — offset toward right (exit side) */}
        <radialGradient id="dbExitGlow" cx="55%" cy="100%" r="55%">
          <stop offset="0%"   stopColor="#9ba890" stopOpacity="0.22" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0"  />
        </radialGradient>

        {/* Near-camera pillar gradient — left edge */}
        <linearGradient id="dbPillar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#2a2820" />
          <stop offset="100%" stopColor="#1a1813" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* ── Background base fill ───────────────────────────────────────────── */}
      <rect x={0} y={0} width={SCENE_W} height={VP_Y} fill="url(#dbWall)" />

      {/* ── Left wall panel — thin wedge (camera near left wall) ───────────── */}
      <polygon
        points={`0,0 ${CL_NEAR_X},0 ${RL_FAR},${VP_Y} 0,${VP_Y}`}
        fill="#201e17"
      />

      {/* ── Right wall panel — full dominant surface ────────────────────────── */}
      <polygon
        points={`${CR_NEAR_X},0 ${SCENE_W},0 ${SCENE_W},${VP_Y} ${RR_FAR},${VP_Y}`}
        fill="#201e19"
      />

      {/* ── Overhead ceiling panel ──────────────────────────────────────────── */}
      <polygon
        points={`${CL_NEAR_X},0 ${CR_NEAR_X},0 ${RR_FAR},${VP_Y} ${RL_FAR},${VP_Y}`}
        fill="url(#dbCeil)"
      />

      {/* ── Outdoor daylight glow at exit opening ────────────────────────────── */}
      <rect x={RL_FAR - 80} y={VP_Y - 55} width={RR_FAR - RL_FAR + 160} height={55}
            fill="url(#dbExitGlow)" />

      {/* ── Ceiling-to-wall edge lines ──────────────────────────────────────── */}
      <line x1={RL_FAR} y1={VP_Y} x2={CL_NEAR_X} y2={0}
            stroke="rgba(255,245,200,0.13)" strokeWidth={0.9} />
      <line x1={RR_FAR} y1={VP_Y} x2={CR_NEAR_X} y2={0}
            stroke="rgba(255,245,200,0.13)" strokeWidth={0.9} />

      {/* ── Asymmetric ceiling depth grid (warm tones) ──────────────────────── */}
      {CEIL_LINES.map(({ y, lx, rx }, i) => (
        <g key={i}>
          <line x1={0}  y1={y} x2={lx}      y2={y}
                stroke="rgba(255,240,180,0.050)" strokeWidth={0.8} />
          <line x1={lx} y1={y} x2={rx}      y2={y}
                stroke="rgba(255,240,180,0.040)" strokeWidth={0.7} />
          <line x1={rx} y1={y} x2={SCENE_W} y2={y}
                stroke="rgba(255,240,180,0.050)" strokeWidth={0.8} />
        </g>
      ))}

      {/* ── Left wall joints ────────────────────────────────────────────────── */}
      <line x1={Math.round(RL_FAR * 0.36)} y1={VP_Y}
            x2={Math.round(CL_NEAR_X * 0.36)} y2={0}
            stroke="rgba(255,240,180,0.035)" strokeWidth={0.7} />
      <line x1={Math.round(RL_FAR * 0.68)} y1={VP_Y}
            x2={Math.round(CL_NEAR_X * 0.68)} y2={0}
            stroke="rgba(255,240,180,0.030)" strokeWidth={0.6} />

      {/* ── Right wall joints ────────────────────────────────────────────────── */}
      <line x1={Math.round(lerp(SCENE_W, RR_FAR, 0.36))} y1={VP_Y}
            x2={Math.round(lerp(SCENE_W, CR_NEAR_X, 0.36))} y2={0}
            stroke="rgba(255,240,180,0.040)" strokeWidth={0.8} />
      <line x1={Math.round(lerp(SCENE_W, RR_FAR, 0.68))} y1={VP_Y}
            x2={Math.round(lerp(SCENE_W, CR_NEAR_X, 0.68))} y2={0}
            stroke="rgba(255,240,180,0.035)" strokeWidth={0.7} />

      {/* ── Fluorescent tubes (warm sodium-vapor, swept LEFT) ────────────────── */}
      <line x1={TUBE_L_X1} y1={TUBE_L_Y1} x2={TUBE_L_X2} y2={TUBE_L_Y2}
            stroke="#e8d8a0" strokeWidth={18} opacity={0.065} />
      <line x1={TUBE_R_X1} y1={TUBE_R_Y1} x2={TUBE_R_X2} y2={TUBE_R_Y2}
            stroke="#e8d8a0" strokeWidth={18} opacity={0.065} />
      <line x1={TUBE_L_X1} y1={TUBE_L_Y1} x2={TUBE_L_X2} y2={TUBE_L_Y2}
            stroke="#ead8a8" strokeWidth={1.4} opacity={0.48} />
      <line x1={TUBE_R_X1} y1={TUBE_R_Y1} x2={TUBE_R_X2} y2={TUBE_R_Y2}
            stroke="#ead8a8" strokeWidth={1.4} opacity={0.48} />
      <ellipse cx={TUBE_L_X2} cy={TUBE_L_Y2 + 4} rx={14} ry={5}
               fill="#ead8a8" opacity={0.10} />
      <ellipse cx={TUBE_R_X2} cy={TUBE_R_Y2 + 4} rx={14} ry={5}
               fill="#ead8a8" opacity={0.10} />

      {/* ── Near-camera structural column (left edge) ────────────────────────── */}
      <rect x={0} y={0} width={16} height={SCENE_H} fill="url(#dbPillar)" opacity={0.70} />
      <line x1={16} y1={0} x2={16} y2={VP_Y}
            stroke="rgba(255,240,180,0.08)" strokeWidth={0.8} />

      {/* ── Exit archway at far wall ──────────────────────────────────────────── */}
      <path
        d={`M ${RL_FAR - 14},${VP_Y} L ${RL_FAR - 14},${VP_Y - 32}
            A 46 32 0 0 1 ${RR_FAR + 14},${VP_Y - 32}
            L ${RR_FAR + 14},${VP_Y} Z`}
        fill="#1e2016"
        stroke="rgba(200,210,160,0.12)"
        strokeWidth={0.9}
      />

      {/* ── Ceiling ambient wash (warm) ──────────────────────────────────────── */}
      <ellipse cx={280} cy={12} rx={200} ry={50} fill="#d0b888" opacity={0.018} />

      {/* ── Horizon line ─────────────────────────────────────────────────────── */}
      <line x1={0} y1={VP_Y} x2={SCENE_W} y2={VP_Y}
            stroke="#3a3830" strokeWidth={1.5} opacity={0.70} />

      {/* ── Dark asphalt base ─────────────────────────────────────────────────── */}
      <rect x={0} y={VP_Y} width={SCENE_W} height={SCENE_H - VP_Y} fill="#18181a" />

      {/* ── Road polygon ──────────────────────────────────────────────────────── */}
      <polygon points={lShoulder} fill="#151512" />
      <polygon points={rShoulder} fill="#151512" />
      <polygon points={road}      fill="#1e1e1c" />
      <polygon points={road}      fill="url(#arAsphalt)" opacity={0.6} />

      {/* Road edge lines — warm yellow */}
      <line x1={RL_FAR} y1={VP_Y} x2={RL_NEAR} y2={SCENE_H}
            stroke="#d4c880" strokeWidth={1.8} opacity={0.55} />
      <line x1={RR_FAR} y1={VP_Y} x2={RR_NEAR} y2={SCENE_H}
            stroke="#d4c880" strokeWidth={1.8} opacity={0.55} />

      {/* Centre-line dashes */}
      {CENTER_DASHES.map((d, i) => (
        <line key={i} x1={d.x0} y1={d.y0} x2={d.x1} y2={d.y1}
              stroke="#c4b870" strokeWidth={d.w} opacity={0.22} />
      ))}

      {/* ── Floor light pools ─────────────────────────────────────────────────── */}
      {FLOOR_POOLS.map((p, i) => (
        <ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry}
                 fill="#c8b888" opacity={0.040} />
      ))}

      {/* ── Stop line at gate position ────────────────────────────────────────── */}
      <line x1={GATE_RL} y1={GATE_Y} x2={GATE_RR} y2={GATE_Y}
            stroke="#a8a080" strokeWidth={2.5} opacity={0.42} />

      {/* ── Exit direction arrow (amber tint, up = exit direction) ───────────── */}
      <polygon
        points={[
          `${400},${ARR_TIP_Y}`,
          `${400 + ARR_HW},${ARR_HBAS_Y}`,
          `${400 + ARR_BW},${ARR_HBAS_Y}`,
          `${400 + ARR_BW},${ARR_BASE_Y}`,
          `${400 - ARR_BW},${ARR_BASE_Y}`,
          `${400 - ARR_BW},${ARR_HBAS_Y}`,
          `${400 - ARR_HW},${ARR_HBAS_Y}`,
        ].join(' ')}
        fill="rgba(200,170,60,0.17)"
        stroke="rgba(200,170,60,0.35)"
        strokeWidth={0.9}
        strokeLinejoin="round"
      />
    </>
  );
}
