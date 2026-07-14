/**
 * DriverFrontScene — Parking entry environment (driver_front POV).
 *
 * Camera is mounted on the driver/left side of the lane, elevated ~2–3 m,
 * looking diagonally inward toward approaching cars (incoming direction).
 *
 * Key visual differences from CenterFrontScene
 * ─────────────────────────────────────────────
 * The camera is close to the left wall, so:
 *  • Left wall face appears as a thin wedge (camera nearly flush with it)
 *  • Right wall panel is the dominant architectural surface
 *  • Ceiling near-edge is heavily asymmetric: left edge x=60, right edge x=660
 *  • Overhead tube lights are swept left (toward camera position)
 *  • A structural column/pillar detail is visible on the left near edge
 *
 * Ceiling geometry
 * ────────────────
 * Same road road-edge constants at the horizon (RL_FAR=390, RR_FAR=410) so
 * the ceiling aligns with the road at the vanishing line. The near edge is
 * asymmetric to place the camera close to the left wall:
 *
 *   Left ceiling edge:   (RL_FAR=390, VP_Y=145) → (CL_NEAR_X=60,  y=0)
 *   Right ceiling edge:  (RR_FAR=410, VP_Y=145) → (CR_NEAR_X=660, y=0)
 *
 * Panels:
 *   Left wall:    (0,0)→(60,0)→(390,145)→(0,145)      — thin wedge
 *   Right wall:   (660,0)→(800,0)→(800,145)→(410,145) — full panel
 *   Ceiling:      (60,0)→(660,0)→(410,145)→(390,145)  — wide, asymmetric
 *
 * Relies on shared defs in AssetRealisticRenderer:
 *   #arAsphalt — road surface texture pattern
 */
import {
  SCENE_W, SCENE_H, VP_X, VP_Y, GATE_T, lerp,
} from '../../../../../utils/depth';

// ─── Road geometry constants (same as CenterFrontScene) ─────────────────────
const RL_FAR  = VP_X - 10;          // 390
const RR_FAR  = VP_X + 10;          // 410
const RL_NEAR = SCENE_W * 0.175;    // 140
const RR_NEAR = SCENE_W * 0.825;    // 660
const SHOULDER_NEAR = 55;
const SHOULDER_FAR  = 5;

// ─── Ceiling geometry — asymmetric (camera on LEFT/driver side) ──────────────
// Near left is pulled inward (x=60) — camera is close to the left wall.
// Near right stays at standard extent (x=660).
// At horizon, both edges meet the road VP area (390, 410) for visual continuity.
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
// lx interpolates from the road far edge (390) to the near left ceiling edge (60).
// rx interpolates from road far edge (410) to near right ceiling edge (660).
// This gives a strongly asymmetric grid — wide on the right, narrow on the left.
const CEIL_LINES = [0.25, 0.50, 0.75].map(t => ({
  y:  Math.round(lerp(VP_Y, 0, t)),
  lx: Math.round(lerp(RL_FAR, CL_NEAR_X, t)),   // left ceiling edge at this depth
  rx: Math.round(lerp(RR_FAR, CR_NEAR_X, t)),   // right ceiling edge at this depth
}));
// t=0.25 → y=109, lx=308, rx=473
// t=0.50 → y=73,  lx=225, rx=535
// t=0.75 → y=36,  lx=143, rx=598

// ─── Fluorescent tube lights ──────────────────────────────────────────────────
// Tubes run along ceiling, but from camera-left perspective the near end
// appears pulled far to the LEFT of the lane center.
const TUBE_L_X1 = VP_X - 2;    const TUBE_L_Y1 = VP_Y;   // far end (near VP)
const TUBE_L_X2 = 200;         const TUBE_L_Y2 = 0;      // near end — shifted LEFT
const TUBE_R_X1 = VP_X + 2;    const TUBE_R_Y1 = VP_Y;
const TUBE_R_X2 = 360;         const TUBE_R_Y2 = 0;      // near end — shifted LEFT

// ─── Gate / stop-line geometry ────────────────────────────────────────────────
const GATE_Y  = Math.round(lerp(VP_Y, SCENE_H, GATE_T));
const GATE_RL = Math.round(lerp(RL_FAR, RL_NEAR, GATE_T));
const GATE_RR = Math.round(lerp(RR_FAR, RR_NEAR, GATE_T));

// ─── Entry direction arrow ────────────────────────────────────────────────────
const ARR_T    = 0.32;
const ARR_Y    = lerp(VP_Y, SCENE_H, ARR_T);
const ARR_RW   = lerp(RR_FAR - RL_FAR, RR_NEAR - RL_NEAR, ARR_T);
const ARR_H    = ARR_RW * 0.42;
const ARR_HH   = ARR_H  * 0.43;
const ARR_HW   = ARR_RW * 0.18;
const ARR_BW   = ARR_RW * 0.065;
const ARR_TIP_Y  = ARR_Y + ARR_H / 2;
const ARR_BASE_Y = ARR_Y - ARR_H / 2;
const ARR_HBAS_Y = ARR_TIP_Y - ARR_HH;

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
// Shifted LEFT to follow the tube light sweep.
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
export function DriverFrontScene() {
  return (
    <>
      <defs>
        {/* Concrete ceiling/wall gradient — same cool parking-entry grey */}
        <linearGradient id="dfWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#16191e" />
          <stop offset="100%" stopColor="#20242a" />
        </linearGradient>

        <linearGradient id="dfCeil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0f1115" />
          <stop offset="100%" stopColor="#181c21" />
        </linearGradient>

        {/* Near-camera pillar gradient — subtle depth on left edge column */}
        <linearGradient id="dfPillar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#2a2e35" />
          <stop offset="100%" stopColor="#1a1e24" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* ── Background base fill ───────────────────────────────────────────── */}
      <rect x={0} y={0} width={SCENE_W} height={VP_Y} fill="url(#dfWall)" />

      {/* ── Left wall panel — thin wedge (camera near left wall) ───────────── */}
      {/* At top (y=0) only 60px wide; at horizon widens to 390px. */}
      <polygon
        points={`0,0 ${CL_NEAR_X},0 ${RL_FAR},${VP_Y} 0,${VP_Y}`}
        fill="#1c2028"
      />

      {/* ── Right wall panel — full dominant surface ────────────────────────── */}
      <polygon
        points={`${CR_NEAR_X},0 ${SCENE_W},0 ${SCENE_W},${VP_Y} ${RR_FAR},${VP_Y}`}
        fill="#1d2128"
      />

      {/* ── Overhead ceiling panel ──────────────────────────────────────────── */}
      {/* Strongly asymmetric — 600px wide on right, tapers sharply on left. */}
      <polygon
        points={`${CL_NEAR_X},0 ${CR_NEAR_X},0 ${RR_FAR},${VP_Y} ${RL_FAR},${VP_Y}`}
        fill="url(#dfCeil)"
      />

      {/* ── Ceiling-to-wall edge lines (mark the structural junction) ──────── */}
      <line x1={RL_FAR} y1={VP_Y} x2={CL_NEAR_X} y2={0}
            stroke="rgba(255,255,255,0.13)" strokeWidth={0.9} />
      <line x1={RR_FAR} y1={VP_Y} x2={CR_NEAR_X} y2={0}
            stroke="rgba(255,255,255,0.14)" strokeWidth={0.9} />

      {/* ── Asymmetric ceiling depth grid ──────────────────────────────────── */}
      {/* Grid is wider on the right (far from camera), narrow on the left. */}
      {CEIL_LINES.map(({ y, lx, rx }, i) => (
        <g key={i}>
          <line x1={0}  y1={y} x2={lx}      y2={y}
                stroke="rgba(255,255,255,0.055)" strokeWidth={0.8} />
          <line x1={lx} y1={y} x2={rx}      y2={y}
                stroke="rgba(255,255,255,0.045)" strokeWidth={0.7} />
          <line x1={rx} y1={y} x2={SCENE_W} y2={y}
                stroke="rgba(255,255,255,0.055)" strokeWidth={0.8} />
        </g>
      ))}

      {/* ── Left wall joints ────────────────────────────────────────────────── */}
      {/* Two converging lines on the narrow left wall face. */}
      <line x1={Math.round(RL_FAR * 0.36)} y1={VP_Y}
            x2={Math.round(CL_NEAR_X * 0.36)} y2={0}
            stroke="rgba(255,255,255,0.040)" strokeWidth={0.7} />
      <line x1={Math.round(RL_FAR * 0.68)} y1={VP_Y}
            x2={Math.round(CL_NEAR_X * 0.68)} y2={0}
            stroke="rgba(255,255,255,0.035)" strokeWidth={0.6} />

      {/* ── Right wall joints ────────────────────────────────────────────────── */}
      <line x1={Math.round(lerp(SCENE_W, RR_FAR, 0.36))} y1={VP_Y}
            x2={Math.round(lerp(SCENE_W, CR_NEAR_X, 0.36))} y2={0}
            stroke="rgba(255,255,255,0.045)" strokeWidth={0.8} />
      <line x1={Math.round(lerp(SCENE_W, RR_FAR, 0.68))} y1={VP_Y}
            x2={Math.round(lerp(SCENE_W, CR_NEAR_X, 0.68))} y2={0}
            stroke="rgba(255,255,255,0.040)" strokeWidth={0.7} />

      {/* ── Fluorescent tubes (swept LEFT — camera-side perspective) ─────────── */}
      {/* Near ends bias toward left edge where the camera sits. */}
      <line x1={TUBE_L_X1} y1={TUBE_L_Y1} x2={TUBE_L_X2} y2={TUBE_L_Y2}
            stroke="#ece8cc" strokeWidth={18} opacity={0.06} />
      <line x1={TUBE_R_X1} y1={TUBE_R_Y1} x2={TUBE_R_X2} y2={TUBE_R_Y2}
            stroke="#ece8cc" strokeWidth={18} opacity={0.06} />
      <line x1={TUBE_L_X1} y1={TUBE_L_Y1} x2={TUBE_L_X2} y2={TUBE_L_Y2}
            stroke="#f0ecda" strokeWidth={1.4} opacity={0.52} />
      <line x1={TUBE_R_X1} y1={TUBE_R_Y1} x2={TUBE_R_X2} y2={TUBE_R_Y2}
            stroke="#f0ecda" strokeWidth={1.4} opacity={0.52} />
      <ellipse cx={TUBE_L_X2} cy={TUBE_L_Y2 + 4} rx={14} ry={5}
               fill="#f0ecda" opacity={0.10} />
      <ellipse cx={TUBE_R_X2} cy={TUBE_R_Y2 + 4} rx={14} ry={5}
               fill="#f0ecda" opacity={0.10} />

      {/* ── Near-camera structural column (left edge) ────────────────────────── */}
      {/* The camera is mounted near this column — its right face is visible. */}
      <rect x={0} y={0} width={16} height={SCENE_H} fill="url(#dfPillar)" opacity={0.70} />
      {/* Column edge highlight */}
      <line x1={16} y1={0} x2={16} y2={VP_Y}
            stroke="rgba(255,255,255,0.09)" strokeWidth={0.8} />

      {/* ── Entrance hint at horizon ──────────────────────────────────────────── */}
      <path
        d={`M ${RL_FAR - 14},${VP_Y} L ${RL_FAR - 14},${VP_Y - 32}
            A 46 32 0 0 1 ${RR_FAR + 14},${VP_Y - 32}
            L ${RR_FAR + 14},${VP_Y} Z`}
        fill="#13161b"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth={0.8}
      />

      {/* ── Ceiling ambient wash ─────────────────────────────────────────────── */}
      <ellipse cx={280} cy={12} rx={200} ry={50} fill="#d0ccac" opacity={0.020} />

      {/* ── Horizon line ─────────────────────────────────────────────────────── */}
      <line x1={0} y1={VP_Y} x2={SCENE_W} y2={VP_Y}
            stroke="#34383e" strokeWidth={1.5} opacity={0.70} />

      {/* ── Dark asphalt base ─────────────────────────────────────────────────── */}
      <rect x={0} y={VP_Y} width={SCENE_W} height={SCENE_H - VP_Y} fill="#171a1e" />

      {/* ── Road polygon ──────────────────────────────────────────────────────── */}
      <polygon points={lShoulder} fill="#141618" />
      <polygon points={rShoulder} fill="#141618" />
      <polygon points={road}      fill="#1e2226" />
      <polygon points={road}      fill="url(#arAsphalt)" opacity={0.6} />

      {/* Road edge lines */}
      <line x1={RL_FAR} y1={VP_Y} x2={RL_NEAR} y2={SCENE_H}
            stroke="#d0c890" strokeWidth={1.8} opacity={0.55} />
      <line x1={RR_FAR} y1={VP_Y} x2={RR_NEAR} y2={SCENE_H}
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

      {/* ── Entry direction arrow (road center, into facility) ───────────────── */}
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
        fill="rgba(180,195,80,0.17)"
        stroke="rgba(180,195,80,0.35)"
        strokeWidth={0.9}
        strokeLinejoin="round"
      />
    </>
  );
}
