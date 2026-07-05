/**
 * CenterFrontScene — Parking entry environment (center_front POV).
 *
 * Camera is positioned outside the facility, looking at approaching cars
 * (incoming direction). The scene simulates a covered parking entry lane
 * with a concrete ceiling overhead, side walls, fluorescent tube lighting,
 * "ENTRADA" signage, a stop line at the gate, and an entry directional arrow.
 *
 * Ceiling geometry derivation
 * ─────────────────────────────
 * The ceiling overhead mirrors the road perspective: the same x-extent as the
 * road at any given depth t, but projected into the upper half of the SVG.
 *
 *   Ceiling depth t (0 = far, at horizon; 1 = near, at top of frame):
 *     y_ceil(t)     = lerp(VP_Y, 0, t)
 *     x_ceil_L(t)   = lerp(RL_FAR, RL_NEAR, t)   →  390 at horizon, 140 at y=0
 *     x_ceil_R(t)   = lerp(RR_FAR, RR_NEAR, t)   →  410 at horizon, 660 at y=0
 *
 * This produces:
 *   Ceiling center polygon:  (140,0)→(660,0)→(410,145)→(390,145)   — 520px→20px
 *   Left wall panel:         (0,0)→(140,0)→(390,145)→(0,145)
 *   Right wall panel:        (660,0)→(800,0)→(800,145)→(410,145)
 *
 * Relies on shared defs in AssetRealisticRenderer:
 *   #arAsphalt — road surface texture pattern
 */
import {
  SCENE_W, SCENE_H, VP_X, VP_Y, GATE_T, lerp,
} from '../../../../../utils/depth';

// ─── Road geometry constants ─────────────────────────────────────────────────
const RL_FAR  = VP_X - 10;          // 390
const RR_FAR  = VP_X + 10;          // 410
const RL_NEAR = SCENE_W * 0.175;    // 140
const RR_NEAR = SCENE_W * 0.825;    // 660
const SHOULDER_NEAR = 55;
const SHOULDER_FAR  = 5;

// ─── Ceiling geometry ────────────────────────────────────────────────────────
// At y=0 (near, top of frame): ceiling edges align with road near edges
const CL_NEAR_X = RL_NEAR;    // 140
const CR_NEAR_X = RR_NEAR;    // 660

// ─── Road polygon strings ────────────────────────────────────────────────────
function rp(lf: number, rf: number, yf: number, ln: number, rn: number, yn: number) {
  return `${lf},${yf} ${rf},${yf} ${rn},${yn} ${ln},${yn}`;
}
const road      = rp(RL_FAR, RR_FAR, VP_Y, RL_NEAR, RR_NEAR, SCENE_H);
const lShoulder = rp(RL_FAR - SHOULDER_FAR, RL_FAR, VP_Y, RL_NEAR - SHOULDER_NEAR, RL_NEAR, SCENE_H);
const rShoulder = rp(RR_FAR, RR_FAR + SHOULDER_FAR, VP_Y, RR_NEAR, RR_NEAR + SHOULDER_NEAR, SCENE_H);

// ─── Ceiling depth reference lines ───────────────────────────────────────────
// Horizontal lines on ceiling at evenly-spaced depths: creates perspective grid.
const CEIL_LINES = [0.25, 0.50, 0.75].map(t => ({
  y:  Math.round(lerp(VP_Y, 0, t)),
  lx: Math.round(lerp(RL_FAR, CL_NEAR_X, t)),   // right edge of left wall panel
  rx: Math.round(lerp(RR_FAR, CR_NEAR_X, t)),   // left edge of right wall panel
}));
// [0.25] → y=109, lx=328, rx=472
// [0.50] → y=73,  lx=265, rx=535
// [0.75] → y=36,  lx=203, rx=598

// ─── Fluorescent tube lines ───────────────────────────────────────────────────
// Two tubes at ±22% of ceiling lane width from center, converging to VP.
// At t=0 (far, VP): offset = 0.22 × 20/2 = 2.2px — nearly coincides at VP.
// At t=1 (near, y=0): offset = 0.22 × 520/2 = 57px from center.
const TUBE_L_X1 = VP_X - 2;   const TUBE_L_Y1 = VP_Y;   // far end (near VP)
const TUBE_L_X2 = VP_X - 57;  const TUBE_L_Y2 = 0;      // near end (top of frame)
const TUBE_R_X1 = VP_X + 2;   const TUBE_R_Y1 = VP_Y;
const TUBE_R_X2 = VP_X + 57;  const TUBE_R_Y2 = 0;

// ─── Gate / stop-line geometry ────────────────────────────────────────────────
const GATE_Y  = Math.round(lerp(VP_Y, SCENE_H, GATE_T));    // 330
const GATE_RL = Math.round(lerp(RL_FAR, RL_NEAR, GATE_T));  // 260
const GATE_RR = Math.round(lerp(RR_FAR, RR_NEAR, GATE_T));  // 540

// ─── Entry direction arrow (upward = toward VP = into facility) ───────────────
// Positioned at t=0.32, before the gate, pointing toward the vanishing point.
const ARR_T    = 0.32;
const ARR_Y    = lerp(VP_Y, SCENE_H, ARR_T);                 // 259
const ARR_RW   = lerp(RR_FAR - RL_FAR, RR_NEAR - RL_NEAR, ARR_T); // road width ≈ 180
const ARR_H    = ARR_RW * 0.42;    // total arrow height ≈ 76
const ARR_HH   = ARR_H  * 0.43;   // head height ≈ 33
const ARR_HW   = ARR_RW * 0.18;   // head half-width ≈ 32
const ARR_BW   = ARR_RW * 0.065;  // body half-width ≈ 12

const ARR_TIP_Y  = ARR_Y - ARR_H / 2;   // upward tip (toward VP)
const ARR_BASE_Y = ARR_Y + ARR_H / 2;
const ARR_HBAS_Y = ARR_TIP_Y + ARR_HH;  // head/body junction

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

// ─── Floor light pools (fluorescent tubes casting light on asphalt) ───────────
const FLOOR_POOLS = [
  { t: 0.28, frac: 0.13 },
  { t: 0.50, frac: 0.12 },
].map(p => {
  const rw = lerp(RR_FAR - RL_FAR, RR_NEAR - RL_NEAR, p.t);
  return {
    cx: 400,
    cy: lerp(VP_Y, SCENE_H, p.t),
    rx: rw * p.frac,
    ry: rw * p.frac * 0.38,
  };
});

// ─── Component ────────────────────────────────────────────────────────────────
export function CenterFrontScene() {
  return (
    <>
      <defs>
        {/* Concrete ceiling/wall gradient — cool dark concrete tone */}
        <linearGradient id="cfWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#16191e" />
          <stop offset="100%" stopColor="#20242a" />
        </linearGradient>

        {/* Overhead ceiling panel — slightly darker (directly above) */}
        <linearGradient id="cfCeil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0f1115" />
          <stop offset="100%" stopColor="#181c21" />
        </linearGradient>
      </defs>

      {/* ── Background base fill ───────────────────────────────────────────── */}
      <rect x={0} y={0} width={SCENE_W} height={VP_Y} fill="url(#cfWall)" />

      {/* ── Left wall panel ────────────────────────────────────────────────── */}
      {/* Covers from left edge to ceiling left edge, converging to road edge at horizon */}
      <polygon
        points={`0,0 ${CL_NEAR_X},0 ${RL_FAR},${VP_Y} 0,${VP_Y}`}
        fill="#1d2128"
      />

      {/* ── Right wall panel ───────────────────────────────────────────────── */}
      <polygon
        points={`${CR_NEAR_X},0 ${SCENE_W},0 ${SCENE_W},${VP_Y} ${RR_FAR},${VP_Y}`}
        fill="#1d2128"
      />

      {/* ── Overhead ceiling panel (directly above lane) ────────────────────── */}
      {/* Wide at near end (520px at y=0), narrows to 20px at VP — strong depth cue */}
      <polygon
        points={`${CL_NEAR_X},0 ${CR_NEAR_X},0 ${RR_FAR},${VP_Y} ${RL_FAR},${VP_Y}`}
        fill="url(#cfCeil)"
      />

      {/* ── Ceiling-to-wall edge lines ──────────────────────────────────────── */}
      {/* The junction between overhead ceiling and side walls */}
      <line x1={RL_FAR} y1={VP_Y} x2={CL_NEAR_X} y2={0}
            stroke="rgba(255,255,255,0.14)" strokeWidth={0.9} />
      <line x1={RR_FAR} y1={VP_Y} x2={CR_NEAR_X} y2={0}
            stroke="rgba(255,255,255,0.14)" strokeWidth={0.9} />

      {/* ── Perspective depth grid on ceiling ──────────────────────────────── */}
      {/* Horizontal structural lines at 3 depth levels — creates tunnel effect */}
      {CEIL_LINES.map(({ y, lx, rx }, i) => (
        <g key={i}>
          {/* Left wall band */}
          <line x1={0}  y1={y} x2={lx}       y2={y}
                stroke="rgba(255,255,255,0.055)" strokeWidth={0.8} />
          {/* Ceiling overhead band */}
          <line x1={lx} y1={y} x2={rx}       y2={y}
                stroke="rgba(255,255,255,0.045)" strokeWidth={0.7} />
          {/* Right wall band */}
          <line x1={rx} y1={y} x2={SCENE_W}  y2={y}
                stroke="rgba(255,255,255,0.055)" strokeWidth={0.8} />
        </g>
      ))}

      {/* ── Wall panel joints (vertical structural lines, perspective-correct) ─ */}
      {/* Left wall — two panel joints at 1/3 and 2/3 of wall face width */}
      <line x1={Math.round(lerp(0, RL_FAR, 0.36))} y1={VP_Y}
            x2={Math.round(lerp(0, CL_NEAR_X, 0.36))} y2={0}
            stroke="rgba(255,255,255,0.045)" strokeWidth={0.8} />
      <line x1={Math.round(lerp(0, RL_FAR, 0.68))} y1={VP_Y}
            x2={Math.round(lerp(0, CL_NEAR_X, 0.68))} y2={0}
            stroke="rgba(255,255,255,0.040)" strokeWidth={0.7} />
      {/* Right wall */}
      <line x1={Math.round(lerp(SCENE_W, RR_FAR, 0.36))} y1={VP_Y}
            x2={Math.round(lerp(SCENE_W, CR_NEAR_X, 0.36))} y2={0}
            stroke="rgba(255,255,255,0.045)" strokeWidth={0.8} />
      <line x1={Math.round(lerp(SCENE_W, RR_FAR, 0.68))} y1={VP_Y}
            x2={Math.round(lerp(SCENE_W, CR_NEAR_X, 0.68))} y2={0}
            stroke="rgba(255,255,255,0.040)" strokeWidth={0.7} />

      {/* ── Fluorescent tube light strips on ceiling ─────────────────────────── */}
      {/* Glow halo (wide, soft) */}
      <line x1={TUBE_L_X1} y1={TUBE_L_Y1} x2={TUBE_L_X2} y2={TUBE_L_Y2}
            stroke="#ece8cc" strokeWidth={18} opacity={0.06} />
      <line x1={TUBE_R_X1} y1={TUBE_R_Y1} x2={TUBE_R_X2} y2={TUBE_R_Y2}
            stroke="#ece8cc" strokeWidth={18} opacity={0.06} />
      {/* Core tube strip (narrow, bright) */}
      <line x1={TUBE_L_X1} y1={TUBE_L_Y1} x2={TUBE_L_X2} y2={TUBE_L_Y2}
            stroke="#f0ecda" strokeWidth={1.4} opacity={0.52} />
      <line x1={TUBE_R_X1} y1={TUBE_R_Y1} x2={TUBE_R_X2} y2={TUBE_R_Y2}
            stroke="#f0ecda" strokeWidth={1.4} opacity={0.52} />
      {/* Near-end glow dots (tubes are closest here) */}
      <ellipse cx={TUBE_L_X2} cy={TUBE_L_Y2 + 4} rx={14} ry={5}
               fill="#f0ecda" opacity={0.10} />
      <ellipse cx={TUBE_R_X2} cy={TUBE_R_Y2 + 4} rx={14} ry={5}
               fill="#f0ecda" opacity={0.10} />

      {/* ── Entrance archway / depth cue at far wall ─────────────────────────── */}
      {/* Semi-arch shape centered at VP, suggesting the tunnel opening */}
      <path
        d={`M ${RL_FAR - 14},${VP_Y} L ${RL_FAR - 14},${VP_Y - 32}
            A 46 32 0 0 1 ${RR_FAR + 14},${VP_Y - 32}
            L ${RR_FAR + 14},${VP_Y} Z`}
        fill="#13161b"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth={0.8}
      />

      {/* ── Entry signage panel ───────────────────────────────────────────────── */}
      {/* Green "ENTRADA" sign, mounted on ceiling at mid-depth */}
      <rect x={VP_X - 64} y={50} width={128} height={26}
            fill="#1a5a28" rx={3} />
      <rect x={VP_X - 64} y={50} width={128} height={26}
            fill="none" stroke="#278036" strokeWidth={0.9} rx={3} />
      {/* Down-triangle indicator under sign */}
      <polygon
        points={`${VP_X - 7},76 ${VP_X + 7},76 ${VP_X},84`}
        fill="#278036" opacity={0.65}
      />
      <text
        x={VP_X} y={66}
        fill="#b8f0c8"
        fontSize={11}
        fontFamily='"JetBrains Mono","Courier New",monospace'
        fontWeight="700"
        letterSpacing={2.5}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        ENTRADA
      </text>

      {/* ── Ceiling ambient light wash ────────────────────────────────────────── */}
      <ellipse cx={VP_X} cy={12} rx={200} ry={50} fill="#d0ccac" opacity={0.022} />

      {/* ── Horizon line (ceiling / floor junction) ───────────────────────────── */}
      <line x1={0} y1={VP_Y} x2={SCENE_W} y2={VP_Y}
            stroke="#34383e" strokeWidth={1.5} opacity={0.70} />

      {/* ── Dark asphalt base ─────────────────────────────────────────────────── */}
      <rect x={0} y={VP_Y} width={SCENE_W} height={SCENE_H - VP_Y} fill="#171a1e" />

      {/* ── Road polygon ──────────────────────────────────────────────────────── */}
      <polygon points={lShoulder} fill="#141618" />
      <polygon points={rShoulder} fill="#141618" />
      <polygon points={road}      fill="#1e2226" />
      <polygon points={road}      fill="url(#arAsphalt)" opacity={0.6} />

      {/* Road edge lines — yellow lane markings */}
      <line x1={RL_FAR} y1={VP_Y} x2={RL_NEAR} y2={SCENE_H}
            stroke="#d0c890" strokeWidth={1.8} opacity={0.55} />
      <line x1={RR_FAR} y1={VP_Y} x2={RR_NEAR} y2={SCENE_H}
            stroke="#d0c890" strokeWidth={1.8} opacity={0.55} />

      {/* Centre-line dashes */}
      {CENTER_DASHES.map((d, i) => (
        <line key={i} x1={d.x0} y1={d.y0} x2={d.x1} y2={d.y1}
              stroke="#c0b878" strokeWidth={d.w} opacity={0.22} />
      ))}

      {/* ── Floor light pools (cast by fluorescent tubes above) ───────────────── */}
      {FLOOR_POOLS.map((p, i) => (
        <ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry}
                 fill="#d0ccaa" opacity={0.040} />
      ))}

      {/* ── Stop line at gate position ────────────────────────────────────────── */}
      <line x1={GATE_RL} y1={GATE_Y} x2={GATE_RR} y2={GATE_Y}
            stroke="#a8a690" strokeWidth={2.5} opacity={0.42} />

      {/* ── Entry direction arrow ─────────────────────────────────────────────── */}
      {/* Painted on asphalt, pointing toward VP (into the facility). */}
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
