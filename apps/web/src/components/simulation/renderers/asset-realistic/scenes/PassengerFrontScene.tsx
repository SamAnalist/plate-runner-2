/**
 * PassengerFrontScene — Parking entry environment (passenger_front POV).
 *
 * Camera is mounted on the passenger/right side of the lane, elevated ~2–3 m,
 * looking diagonally inward toward approaching cars (incoming direction).
 * True horizontal mirror of DriverFrontScene — every x-coordinate is
 * SCENE_W - x versus that scene, left/right swapped throughout.
 *
 * Road geometry
 * ─────────────
 * The road VP is shifted to the left (upper-left area), giving a genuine
 * diagonal perspective. The road converges toward x=-180..100 at the horizon
 * while spanning x=136..700 at the bottom — the lane recedes toward the left.
 *
 *   RL_FAR  = VP_X - 580 = -180  (road left edge at horizon — off-screen left)
 *   RR_FAR  = VP_X - 300 = 100   (road right edge at horizon)
 *   RL_NEAR = SCENE_W * 0.170 = 136  (road left edge at bottom)
 *   RR_NEAR = SCENE_W * 0.875 = 700  (road right edge at bottom)
 *
 * Ceiling geometry
 * ────────────────
 * Follows the road perspective. Camera is close to the right wall so the
 * ceiling near-right edge is pulled toward x=710 (camera almost flush with wall).
 *
 *   Left ceiling edge:   (RL_FAR=-180, VP_Y=145) → (CL_NEAR_X=0,   y=0)
 *   Right ceiling edge:  (RR_FAR=100,  VP_Y=145) → (CR_NEAR_X=710, y=0)
 *
 * Panels:
 *   Right wall: (710,0)→(800,0)→(800,145)→(100,145)   — dominates near-horizon
 *   Left wall:  (0,0)→(0,0)→(0,145)→(-180,145)         — thin left strip (clipped)
 *   Ceiling:    (0,0)→(710,0)→(100,145)→(-180,145)     — diagonal strip, goes off-screen left
 *
 * Relies on shared defs in AssetRealisticRenderer:
 *   #arAsphalt — road surface texture pattern
 */
import {
  SCENE_W, SCENE_H, VP_X, VP_Y, GATE_T, lerp,
} from '../../../../../utils/depth';

// ─── Road geometry constants (mirror of DriverFrontScene) ────────────────────
const RL_FAR  = VP_X - 580;         // road left edge at horizon (off-screen left)
const RR_FAR  = VP_X - 300;         // road right edge at horizon
const RL_NEAR = SCENE_W * 0.170;    // road left edge at bottom
const RR_NEAR = SCENE_W * 0.875;    // road right edge at bottom
const SHOULDER_NEAR = 45;
const SHOULDER_FAR  = 4;

// Project road edges beyond the horizon up to y=0 (top of scene).
const T_TOP    = VP_Y / (SCENE_H - VP_Y);
const RL_TOP   = Math.round(RL_FAR  + (RL_FAR  - RL_NEAR)  * T_TOP);
const RR_TOP   = Math.round(RR_FAR  + (RR_FAR  - RR_NEAR)  * T_TOP);

// ─── Ceiling geometry — asymmetric (camera on RIGHT/passenger side) ──────────
// Near right pulled inward (x=710): camera flush with right wall.
const CL_NEAR_X = 0;
const CR_NEAR_X = 710;

// Road center at far (horizon) and near (bottom) — used by arrow
const CX_FAR  = (RL_FAR + RR_FAR) / 2;
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
  lx: Math.round(lerp(RL_FAR, CL_NEAR_X, t)),   // left ceiling edge
  rx: Math.round(lerp(RR_FAR, CR_NEAR_X, t)),   // right ceiling edge
}));

// ─── Gate / stop-line geometry ────────────────────────────────────────────────
const GATE_Y  = Math.round(lerp(VP_Y, SCENE_H, GATE_T));
const GATE_RL = Math.round(lerp(RL_FAR, RL_NEAR, GATE_T));
const GATE_RR = Math.round(lerp(RR_FAR, RR_NEAR, GATE_T));

// ─── Entry direction arrow ────────────────────────────────────────────────────
const ARR_T    = 0.45;
const ARR_Y    = lerp(VP_Y, SCENE_H, ARR_T);
const ARR_RW   = lerp(RR_FAR - RL_FAR, RR_NEAR - RL_NEAR, ARR_T);
const ARR_H    = ARR_RW * 0.32;
const ARR_HH   = ARR_H  * 0.43;
const ARR_HW   = ARR_RW * 0.28;
const ARR_BW   = ARR_RW * 0.095;
const ARR_TIP_Y  = ARR_Y + ARR_H / 2;
const ARR_BASE_Y = ARR_Y - ARR_H / 2;
const ARR_HBAS_Y = ARR_TIP_Y - ARR_HH;
// Arrow center X follows road center at ARR_T depth (mirrored offset: +72 instead of -72)
const ARR_CX = Math.round(lerp(CX_FAR, CX_NEAR, ARR_T)) + 72;
// Lean: mirrored sign versus DriverFrontScene's +160.
const ARR_LEAN_X    = -160;
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

// ─── Floor light pools ────────────────────────────────────────────────────────
// Mirrored cx from DriverFrontScene's {t:0.14, cx:787} / {t:0.80, cx:480}.
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
export function PassengerFrontScene() {
  return (
    <>
      <defs>
        {/* Concrete ceiling/wall gradient — same cool parking-entry grey as driver_front */}
        <linearGradient id="pfWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#16191e" />
          <stop offset="100%" stopColor="#20242a" />
        </linearGradient>

        <linearGradient id="pfCeil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0f1115" />
          <stop offset="100%" stopColor="#181c21" />
        </linearGradient>

        {/* Near-camera pillar gradient — right edge column (mirrored side) */}
        <linearGradient id="pfPillar" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%"   stopColor="#2a2e35" />
          <stop offset="100%" stopColor="#1a1e24" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* ── Background base fill ───────────────────────────────────────────── */}
      <rect x={0} y={0} width={SCENE_W} height={VP_Y} fill="url(#pfWall)" />

      {/* ── Right wall panel — dominant surface (camera-side, mirrors driver_front's left) ── */}
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
        fill="url(#pfCeil)"
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
      <rect x={SCENE_W - 16} y={0} width={16} height={SCENE_H} fill="url(#pfPillar)" opacity={0.70} />
      <line x1={SCENE_W - 16} y1={0} x2={SCENE_W - 16} y2={VP_Y}
            stroke="rgba(255,255,255,0.09)" strokeWidth={0.8} />

      {/* ── Ceiling ambient wash (mirrored from cx=350) ─────────────────────── */}
      <ellipse cx={450} cy={12} rx={200} ry={50} fill="#d0ccac" opacity={0.020} />

      {/* ── Dark asphalt base — full scene height ─────────────────────────────── */}
      <rect x={0} y={0} width={SCENE_W} height={SCENE_H} fill="#171a1e" />

      {/* ── Road polygon — extends full height to y=0 ─────────────────────────── */}
      <polygon points={lShoulder} fill="#141618" />
      <polygon points={rShoulder} fill="#141618" />
      <polygon points={road}      fill="#1e2226" />
      <polygon points={road}      fill="url(#arAsphalt)" opacity={0.6} />

      {/* Road edge lines — extend full height to y=0 */}
      <line x1={RL_TOP} y1={0} x2={RL_NEAR} y2={SCENE_H}
            stroke="#d0c890" strokeWidth={1.8} opacity={0.55} />
      <line x1={RR_TOP} y1={0} x2={RR_NEAR} y2={SCENE_H}
            stroke="#d0c890" strokeWidth={1.8} opacity={0.55} />

      {/* Centre-line dashes — follow diagonal road center */}
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

      {/* ── Entry direction arrow — follows diagonal road center ─────────────── */}
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
