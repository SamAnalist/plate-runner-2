/**
 * PassengerFrontScene — Parking entry environment (passenger_front POV).
 *
 * Camera is mounted on the passenger/right side of the lane, elevated ~2–3 m,
 * looking diagonally inward toward approaching cars (incoming direction).
 * This is the mirror counterpart of DriverFrontScene.
 *
 * Key visual differences from CenterFrontScene
 * ─────────────────────────────────────────────
 * The camera is close to the right wall, so:
 *  • Right wall face appears as a thin wedge (camera nearly flush with it)
 *  • Left wall panel is the dominant architectural surface
 *  • Ceiling near-edge is heavily asymmetric: left edge x=140, right edge x=740
 *  • Overhead tube lights are swept RIGHT (toward camera position)
 *  • A structural column/pillar detail is visible on the right near edge
 *
 * Ceiling geometry
 * ────────────────
 * Same road far-edge constants (RL_FAR=390, RR_FAR=410) at horizon.
 * Near edges are asymmetric — camera close to right wall:
 *
 *   Left ceiling edge:   (RL_FAR=390, VP_Y=145) → (CL_NEAR_X=140, y=0)
 *   Right ceiling edge:  (RR_FAR=410, VP_Y=145) → (CR_NEAR_X=740, y=0)
 *
 * Panels:
 *   Left wall:    (0,0)→(140,0)→(390,145)→(0,145)      — full panel
 *   Right wall:   (740,0)→(800,0)→(800,145)→(410,145)  — thin wedge
 *   Ceiling:      (140,0)→(740,0)→(410,145)→(390,145)  — wide, asymmetric
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

// ─── Ceiling geometry — asymmetric (camera on RIGHT/passenger side) ──────────
// Near right is pulled outward (x=740) — camera is close to the right wall.
// Near left stays at standard extent (x=140).
const CL_NEAR_X = RL_NEAR;          // ceiling near left edge  (140)
const CR_NEAR_X = 740;              // ceiling near right edge (camera side)

// ─── Road polygon strings ────────────────────────────────────────────────────
function rp(lf: number, rf: number, yf: number, ln: number, rn: number, yn: number) {
  return `${lf},${yf} ${rf},${yf} ${rn},${yn} ${ln},${yn}`;
}
const road      = rp(RL_FAR, RR_FAR, VP_Y, RL_NEAR, RR_NEAR, SCENE_H);
const lShoulder = rp(RL_FAR - SHOULDER_FAR, RL_FAR, VP_Y, RL_NEAR - SHOULDER_NEAR, RL_NEAR, SCENE_H);
const rShoulder = rp(RR_FAR, RR_FAR + SHOULDER_FAR, VP_Y, RR_NEAR, RR_NEAR + SHOULDER_NEAR, SCENE_H);

// ─── Ceiling depth grid lines ─────────────────────────────────────────────────
// lx interpolates from road far edge (390) to standard near left (140).
// rx interpolates from road far edge (410) to asymmetric near right (740).
const CEIL_LINES = [0.25, 0.50, 0.75].map(t => ({
  y:  Math.round(lerp(VP_Y, 0, t)),
  lx: Math.round(lerp(RL_FAR, CL_NEAR_X, t)),   // left ceiling edge at this depth
  rx: Math.round(lerp(RR_FAR, CR_NEAR_X, t)),   // right ceiling edge at this depth
}));
// t=0.25 → y=109, lx=328, rx=493
// t=0.50 → y=73,  lx=265, rx=575
// t=0.75 → y=36,  lx=203, rx=658

// ─── Fluorescent tube lights ──────────────────────────────────────────────────
// Tubes run along ceiling; from camera-right perspective the near end
// appears pulled far to the RIGHT of the lane center.
const TUBE_L_X1 = VP_X - 2;    const TUBE_L_Y1 = VP_Y;   // far end (near VP)
const TUBE_L_X2 = 440;         const TUBE_L_Y2 = 0;      // near end — shifted RIGHT
const TUBE_R_X1 = VP_X + 2;    const TUBE_R_Y1 = VP_Y;
const TUBE_R_X2 = 600;         const TUBE_R_Y2 = 0;      // near end — shifted RIGHT

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
// Shifted RIGHT to follow the tube light sweep.
const FLOOR_POOLS = [
  { t: 0.28, cx: 470, frac: 0.13 },
  { t: 0.50, cx: 490, frac: 0.12 },
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
export function PassengerFrontScene() {
  return (
    <>
      <defs>
        {/* Concrete ceiling/wall gradient — same cool parking-entry grey */}
        <linearGradient id="pfWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#16191e" />
          <stop offset="100%" stopColor="#20242a" />
        </linearGradient>

        <linearGradient id="pfCeil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0f1115" />
          <stop offset="100%" stopColor="#181c21" />
        </linearGradient>

        {/* Near-camera pillar gradient — subtle depth on right edge column */}
        <linearGradient id="pfPillar" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%"   stopColor="#2a2e35" />
          <stop offset="100%" stopColor="#1a1e24" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* ── Background base fill ───────────────────────────────────────────── */}
      <rect x={0} y={0} width={SCENE_W} height={VP_Y} fill="url(#pfWall)" />

      {/* ── Left wall panel — full dominant surface ─────────────────────────── */}
      <polygon
        points={`0,0 ${CL_NEAR_X},0 ${RL_FAR},${VP_Y} 0,${VP_Y}`}
        fill="#1d2128"
      />

      {/* ── Right wall panel — thin wedge (camera near right wall) ──────────── */}
      {/* At top (y=0) only 60px wide (800-740); at horizon widens to 390px. */}
      <polygon
        points={`${CR_NEAR_X},0 ${SCENE_W},0 ${SCENE_W},${VP_Y} ${RR_FAR},${VP_Y}`}
        fill="#1c2028"
      />

      {/* ── Overhead ceiling panel ──────────────────────────────────────────── */}
      {/* Strongly asymmetric — wide on left, tapers sharply on right. */}
      <polygon
        points={`${CL_NEAR_X},0 ${CR_NEAR_X},0 ${RR_FAR},${VP_Y} ${RL_FAR},${VP_Y}`}
        fill="url(#pfCeil)"
      />

      {/* ── Ceiling-to-wall edge lines ──────────────────────────────────────── */}
      <line x1={RL_FAR} y1={VP_Y} x2={CL_NEAR_X} y2={0}
            stroke="rgba(255,255,255,0.14)" strokeWidth={0.9} />
      <line x1={RR_FAR} y1={VP_Y} x2={CR_NEAR_X} y2={0}
            stroke="rgba(255,255,255,0.13)" strokeWidth={0.9} />

      {/* ── Asymmetric ceiling depth grid ──────────────────────────────────── */}
      {/* Grid is wider on the left (far from camera), narrow on the right. */}
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
      <line x1={Math.round(lerp(0, RL_FAR, 0.36))} y1={VP_Y}
            x2={Math.round(lerp(0, CL_NEAR_X, 0.36))} y2={0}
            stroke="rgba(255,255,255,0.045)" strokeWidth={0.8} />
      <line x1={Math.round(lerp(0, RL_FAR, 0.68))} y1={VP_Y}
            x2={Math.round(lerp(0, CL_NEAR_X, 0.68))} y2={0}
            stroke="rgba(255,255,255,0.040)" strokeWidth={0.7} />

      {/* ── Right wall joints ────────────────────────────────────────────────── */}
      {/* Narrow wedge — only one subtle line needed. */}
      <line x1={Math.round(RR_FAR * 0.36 + SCENE_W * 0.64)} y1={VP_Y}
            x2={Math.round(CR_NEAR_X * 0.36 + SCENE_W * 0.64)} y2={0}
            stroke="rgba(255,255,255,0.035)" strokeWidth={0.6} />

      {/* ── Fluorescent tubes (swept RIGHT — camera-side perspective) ─────────── */}
      {/* Near ends bias toward right edge where the camera sits. */}
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

      {/* ── Near-camera structural column (right edge) ───────────────────────── */}
      {/* The camera is mounted near this column — its left face is visible. */}
      <rect x={SCENE_W - 16} y={0} width={16} height={SCENE_H} fill="url(#pfPillar)" opacity={0.70} />
      {/* Column edge highlight */}
      <line x1={SCENE_W - 16} y1={0} x2={SCENE_W - 16} y2={VP_Y}
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
      <ellipse cx={520} cy={12} rx={200} ry={50} fill="#d0ccac" opacity={0.020} />

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
