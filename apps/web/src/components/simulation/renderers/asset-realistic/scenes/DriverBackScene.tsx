/**
 * DriverBackScene — Parking exit environment (driver_back POV).
 *
 * Copy of PassengerFrontScene's road/ceiling/palette (same orientation, NOT
 * mirrored again) — same pattern as PassengerBackScene being an unmirrored
 * copy of DriverFrontScene. Differences from PassengerFrontScene:
 *   1. Direction is 'away' — car moves toward the horizon (up the screen).
 *   2. Gate stop-line is higher up (DB_GATE_T matches driverBack.config gate.t).
 *   3. Direction arrow points UP toward the exit horizon.
 *
 * Road geometry (must match driverBack.config.ts DB_RL_FAR / DB_RR_FAR constants):
 *   RL_FAR  = VP_X - 580 = -180  (road left edge at horizon — off-screen left)
 *   RR_FAR  = VP_X - 300 = 100   (road right edge at horizon)
 *   RL_NEAR = SCENE_W * 0.170 = 136  (road left edge at bottom)
 *   RR_NEAR = SCENE_W * 0.875 = 700  (road right edge at bottom)
 *
 * Relies on shared defs in AssetRealisticRenderer:
 *   #arAsphalt — road surface texture pattern
 */
import {
  SCENE_W, SCENE_H, VP_X, VP_Y, lerp,
} from '../../../../../utils/depth';

// ─── Road geometry constants (copy of PassengerFrontScene) ───────────────────
const RL_FAR  = VP_X - 580;
const RR_FAR  = VP_X - 300;
const RL_NEAR = SCENE_W * 0.170;
const RR_NEAR = SCENE_W * 0.875;
const SHOULDER_NEAR = 45;
const SHOULDER_FAR  = 4;

// Project road edges beyond the horizon up to y=0 (top of scene).
const T_TOP    = VP_Y / (SCENE_H - VP_Y);
const RL_TOP   = Math.round(RL_FAR  + (RL_FAR  - RL_NEAR)  * T_TOP);
const RR_TOP   = Math.round(RR_FAR  + (RR_FAR  - RR_NEAR)  * T_TOP);

// ─── Ceiling geometry — asymmetric (camera on RIGHT side, same as passenger_front) ──
const CL_NEAR_X = 0;
const CR_NEAR_X = 710;

const CX_FAR  = (RL_FAR + RR_FAR) / 2 ;
const CX_NEAR = (RL_NEAR + RR_NEAR) / 2;

// ─── Road polygon strings ────────────────────────────────────────────────────
const road = [
  `${RL_TOP},0`,  `${RR_TOP},0`,
  `${RR_NEAR},${SCENE_H}`, `${RL_NEAR},${SCENE_H}`,
].join(' ');

const lShoulder = [
  `${RL_TOP - SHOULDER_FAR},0`, `${RL_TOP},0`,
  `${RL_NEAR},${SCENE_H}`, `${RL_NEAR - SHOULDER_NEAR},${SCENE_H}`,
].join(' ');

const rShoulder = [
  `${RR_TOP},0`, `${RR_TOP + SHOULDER_FAR},0`,
  `${RR_NEAR + SHOULDER_NEAR},${SCENE_H}`, `${RR_NEAR},${SCENE_H}`,
].join(' ');

// ─── Ceiling depth grid lines ─────────────────────────────────────────────────
const CEIL_LINES = [0.25, 0.50, 0.75].map(t => ({
  y:  Math.round(lerp(VP_Y, 0, t)),
  lx: Math.round(lerp(RL_FAR, CL_NEAR_X, t)),
  rx: Math.round(lerp(RR_FAR, CR_NEAR_X, t)),
}));

// ─── Gate / stop-line — higher up for 'away' direction ───────────────────────
// Must match driverBack.config gate.t.
const DB_GATE_T = 0.45;
const GATE_Y  = Math.round(lerp(VP_Y, SCENE_H, DB_GATE_T));
const GATE_RL = Math.round(lerp(RL_FAR, RL_NEAR, DB_GATE_T));
const GATE_RR = Math.round(lerp(RR_FAR, RR_NEAR, DB_GATE_T));

// ─── Exit direction arrow — below gate, tip pointing UP ──────────────────────
const ARR_T      = 0.60;
const ARR_Y      = lerp(VP_Y, SCENE_H, ARR_T);
const ARR_RW     = lerp(RR_FAR - RL_FAR, RR_NEAR - RL_NEAR, ARR_T);
const ARR_H      = ARR_RW * 0.40;
const ARR_HH     = ARR_H  * 0.40;
const ARR_HW     = ARR_RW * 0.28;
const ARR_BW     = ARR_RW * 0.11;
const ARR_TIP_Y  = ARR_Y - ARR_H / 2 + 90;   // UP — toward exit horizon
const ARR_BASE_Y = ARR_Y + ARR_H / 2 + 140;   // DOWN — toward camera
const ARR_HBAS_Y = ARR_TIP_Y + ARR_HH;
const ARR_CX     = Math.round(lerp(CX_FAR, CX_NEAR, ARR_T));
const ARR_LEAN_X    = 290;
const ARR_LEAN_HEAD = Math.round(ARR_LEAN_X * (ARR_HH / ARR_H));
const ARR_LEAN_BASE = ARR_LEAN_X;

// ─── Centre-line dashes ───────────────────────────────────────────────────────
const CX_TOP = (RL_TOP + RR_TOP) / 2;
const CENTER_DASHES = Array.from({ length: 14 }, (_, i) => {
  const t0 = (i + 0.08) / 14;
  const t1 = (i + 0.55) / 14;
  return {
    x0: lerp(CX_TOP, CX_NEAR, t0), y0: lerp(0, SCENE_H, t0),
    x1: lerp(CX_TOP, CX_NEAR, t1), y1: lerp(0, SCENE_H, t1),
    w:  lerp(0.4, 4.5, (t0 + t1) / 2),
  };
});

// ─── Floor light pools (copy of PassengerFrontScene) ─────────────────────────
const FLOOR_POOLS = [
  { t: 0.14, cx: 13,  frac: 0.21 },
  { t: 0.80, cx: 320, frac: 0.21 },
].map(p => {
  const rw = lerp(RR_FAR - RL_FAR, RR_NEAR - RL_NEAR, p.t);
  return {
    cx: p.cx,
    cy: lerp(VP_Y, SCENE_H, p.t),
    rx: rw * p.frac,
    ry: rw * p.frac * 0.35,
  };
});

// ─── Component ────────────────────────────────────────────────────────────────
export function DriverBackScene() {
  return (
    <>
      <defs>
        <linearGradient id="dbWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#16191e" />
          <stop offset="100%" stopColor="#20242a" />
        </linearGradient>

        <linearGradient id="dbCeil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0f1115" />
          <stop offset="100%" stopColor="#181c21" />
        </linearGradient>

        {/* Near-camera pillar gradient — right edge column (same side as passenger_front) */}
        <linearGradient id="dbPillar" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%"   stopColor="#2a2e35" />
          <stop offset="100%" stopColor="#1a1e24" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* ── Background base fill ───────────────────────────────────────────── */}
      <rect x={0} y={0} width={SCENE_W} height={VP_Y} fill="url(#dbWall)" />

      {/* ── Right wall panel — dominant surface (camera-side) ───────────────── */}
      <polygon
        points={`${SCENE_W},0 ${CR_NEAR_X},0 ${RR_FAR},${VP_Y} ${SCENE_W},${VP_Y}`}
        fill="#1d2128"
      />

      {/* ── Left wall panel — thin wedge, clipped ───────────────────────────── */}
      <polygon
        points={`${CL_NEAR_X},0 0,0 0,${VP_Y} ${RL_FAR},${VP_Y}`}
        fill="#1c2028"
      />

      {/* ── Overhead ceiling panel ──────────────────────────────────────────── */}
      <polygon
        points={`${CL_NEAR_X},0 ${CR_NEAR_X},0 ${RR_FAR},${VP_Y} ${RL_FAR},${VP_Y}`}
        fill="url(#dbCeil)"
      />

      {/* ── Asymmetric ceiling depth grid ──────────────────────────────────── */}
      {CEIL_LINES.map(({ y, lx, rx }, i) => (
        <g key={i}>
          <line x1={0}  y1={y} x2={lx}      y2={y}
                stroke="rgba(255,255,255,0.050)" strokeWidth={0.8} />
          <line x1={lx} y1={y} x2={rx}      y2={y}
                stroke="rgba(255,255,255,0.040)" strokeWidth={0.7} />
          <line x1={rx} y1={y} x2={SCENE_W} y2={y}
                stroke="rgba(255,255,255,0.050)" strokeWidth={0.8} />
        </g>
      ))}

      {/* ── Near-camera structural column (right edge) ───────────────────────── */}
      <rect x={SCENE_W - 16} y={0} width={16} height={SCENE_H} fill="url(#dbPillar)" opacity={0.70} />
      <line x1={SCENE_W - 16} y1={0} x2={SCENE_W - 16} y2={VP_Y}
            stroke="rgba(255,255,255,0.09)" strokeWidth={0.8} />

      {/* ── Ceiling ambient wash ─────────────────────────────────────────────── */}
      <ellipse cx={450} cy={12} rx={200} ry={50} fill="#d0ccac" opacity={0.020} />

      {/* ── Dark asphalt base ─────────────────────────────────────────────────── */}
      <rect x={0} y={0} width={SCENE_W} height={SCENE_H} fill="#171a1e" />

      {/* ── Road polygon — extends full height to y=0 ─────────────────────────── */}
      <polygon points={lShoulder} fill="#141618" />
      <polygon points={rShoulder} fill="#141618" />
      <polygon points={road}      fill="#1e2226" />
      <polygon points={road}      fill="url(#arAsphalt)" opacity={0.6} />

      {/* Road edge lines */}
      <line x1={RL_TOP} y1={0} x2={RL_NEAR} y2={SCENE_H}
            stroke="#d0c890" strokeWidth={1.8} opacity={0.55} />
      <line x1={RR_TOP} y1={0} x2={RR_NEAR} y2={SCENE_H}
            stroke="#d0c890" strokeWidth={1.8} opacity={0.55} />

      {/* Centre-line dashes */}
      {CENTER_DASHES.map((d, i) => (
        <line key={i} x1={d.x0} y1={d.y0} x2={d.x1} y2={d.y1}
              stroke="#c0b878" strokeWidth={d.w} opacity={0.22} />
      ))}

      {/* ── Floor light pools ─────────────────────────────────────────────────── */}
      {FLOOR_POOLS.map((p, i) => (
        <ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry}
                 fill="#d0ccaa" opacity={0.040} />
      ))}

      {/* ── Stop line at gate position ────────────────────────────────────────── */}
      <line x1={GATE_RL} y1={GATE_Y} x2={GATE_RR} y2={GATE_Y}
            stroke="#a8a690" strokeWidth={2.5} opacity={0.42} />

      {/* ── Exit direction arrow — tip UP, lean to follow diagonal road ───────── */}
      <polygon
        points={[
          `${ARR_CX},${ARR_TIP_Y}`,
          `${ARR_CX + ARR_HW + ARR_LEAN_HEAD},${ARR_HBAS_Y}`,
          `${ARR_CX + ARR_BW + ARR_LEAN_HEAD},${ARR_HBAS_Y}`,
          `${ARR_CX + ARR_BW + ARR_LEAN_BASE},${ARR_BASE_Y}`,
          `${ARR_CX - ARR_BW + ARR_LEAN_BASE},${ARR_BASE_Y}`,
          `${ARR_CX - ARR_BW + ARR_LEAN_HEAD},${ARR_HBAS_Y}`,
          `${ARR_CX - ARR_HW + ARR_LEAN_HEAD},${ARR_HBAS_Y}`,
        ].join(' ')}
        fill="rgba(180,170,90,0.87)"
        stroke="rgba(180,195,80,0.55)"
        strokeWidth={1.9}
        strokeLinejoin="round"
      />
    </>
  );
}
