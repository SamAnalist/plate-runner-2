/**
 * DriverFrontScene — Parking entry environment (driver_front POV).
 *
 * Camera is mounted on the driver/left side of the lane, elevated ~2–3 m,
 * looking diagonally inward toward approaching cars (incoming direction).
 *
 * Road geometry
 * ─────────────
 * The road VP is shifted to the right (upper-right area), giving a genuine
 * diagonal perspective. The road converges toward x=720–850 at the horizon
 * while spanning x=100–628 at the bottom — the lane recedes toward the right.
 *
 *   RL_FAR  = VP_X + 320 = 720   (road left edge at horizon — upper right)
 *   RR_FAR  = VP_X + 450 = 850   (road right edge at horizon — off-screen right)
 *   RL_NEAR = SCENE_W * 0.125 = 100  (road left edge at bottom)
 *   RR_NEAR = SCENE_W * 0.785 = 628  (road right edge at bottom)
 *
 * Ceiling geometry
 * ────────────────
 * Follows the road perspective. Camera is close to the left wall so the
 * ceiling near-left edge is pulled toward x=80 (camera almost flush with wall).
 *
 *   Left ceiling edge:   (RL_FAR=720, VP_Y=145) → (CL_NEAR_X=80,  y=0)
 *   Right ceiling edge:  (RR_FAR=850, VP_Y=145) → (CR_NEAR_X=628, y=0)
 *                        (RR_FAR=850 exits scene right — SVG clips at 800)
 *
 * Panels:
 *   Left wall:  (0,0)→(80,0)→(720,145)→(0,145)       — dominates near-horizon
 *   Right wall: (628,0)→(800,0)→(800,145)→(850,145)  — thin right strip (clipped)
 *   Ceiling:    (80,0)→(628,0)→(850,145)→(720,145)   — diagonal strip, goes off-screen right
 *
 * Relies on shared defs in AssetRealisticRenderer:
 *   #arAsphalt — road surface texture pattern
 */
import {
  SCENE_W, SCENE_H, VP_X, VP_Y, GATE_T, lerp,
} from '../../../../../utils/depth';

// ─── Road geometry constants ──────────────────────────────────────────────────
const RL_FAR  = VP_X + 300;         // road left edge at horizon
const RR_FAR  = VP_X + 580;         // road right edge at horizon (exits right)
const RL_NEAR = SCENE_W * 0.125;    // road left edge at bottom
const RR_NEAR = SCENE_W * 0.830;    // road right edge at bottom
const SHOULDER_NEAR = 45;
const SHOULDER_FAR  = 4;

// Project road edges beyond the horizon up to y=0 (top of scene).
// Each road edge is a straight line; we continue it from VP_Y upward to y=0.
// At VP_Y the edge is at RL_FAR/RR_FAR; at SCENE_H it is at RL_NEAR/RR_NEAR.
// t_top = VP_Y / (SCENE_H - VP_Y) is how far above the horizon y=0 sits,
// in units of the (horizon→bottom) segment length.
const T_TOP    = VP_Y / (SCENE_H - VP_Y);
const RL_TOP   = Math.round(RL_FAR  + (RL_FAR  - RL_NEAR)  * T_TOP);
const RR_TOP   = Math.round(RR_FAR  + (RR_FAR  - RR_NEAR)  * T_TOP);

// ─── Ceiling geometry — asymmetric (camera on LEFT/driver side) ──────────────
// Near left pulled inward (x=90): camera flush with left wall.
const CL_NEAR_X = 90;
const CR_NEAR_X = 800;

// Road center at far (horizon) and near (bottom) — used by arrow
const CX_FAR  = (RL_FAR + RR_FAR) / 2;
const CX_NEAR = (RL_NEAR + RR_NEAR) / 2;

// ─── Road polygon strings ────────────────────────────────────────────────────
// Road polygon now extends from y=0 (top) through horizon to bottom.
// SVG clips anything outside the viewBox automatically.
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
// Interpolates ceiling edges between far (road horizon) and near values.
// At horizon: lx=720, rx=850. At top: lx=90, rx=628.
// Creates a strongly diagonal asymmetric grid — sweeps from lower-left to upper-right.
const CEIL_LINES = [0.25, 0.50, 0.75].map(t => ({
  y:  Math.round(lerp(VP_Y, 0, t)),
  lx: Math.round(lerp(RL_FAR, CL_NEAR_X, t)),   // left ceiling edge
  rx: Math.round(lerp(RR_FAR, CR_NEAR_X, t)),   // right ceiling edge
}));
// t=0.25 → y=109, lx=560, rx=795
// t=0.50 → y=73,  lx=400, rx=739
// t=0.75 → y=36,  lx=240, rx=684


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
// Arrow center X follows road center at ARR_T depth (not hardcoded 400)
const ARR_CX = Math.round(lerp(CX_FAR, CX_NEAR, ARR_T)) - 72; // ≈ 650
// Lean: total horizontal shift at the TOP of the arrow (base). Adjust to taste.
const ARR_LEAN_X    = 160;
// Proportional lean at each Y level so the whole arrow tilts uniformly:
//   tip (bottom) = 0 lean, head junction = partial lean, base (top) = full lean
const ARR_LEAN_HEAD = Math.round(ARR_LEAN_X * (ARR_HH / ARR_H)); // lean at head/body junction
const ARR_LEAN_BASE = ARR_LEAN_X;                                  // lean at base (top)

// ─── Centre-line dashes ───────────────────────────────────────────────────────
// Extended full height: from y=0 (top) to y=SCENE_H (bottom).
// t=0 → y=0 (top), t=1 → y=SCENE_H (bottom).
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
// Positioned below ceiling tubes — slightly left of road center (camera-left bias).
const FLOOR_POOLS = [
  { t: 0.14, cx: 787, frac: 0.21 },
  { t: 0.80, cx: 480, frac: 0.21 },
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
export function DriverFrontScene() {
  return (
    <>
      <defs>
        {/* Concrete ceiling/wall gradient — cool parking-entry grey */}
        <linearGradient id="dfWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#16191e" />
          <stop offset="100%" stopColor="#20242a" />
        </linearGradient>

        <linearGradient id="dfCeil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0f1115" />
          <stop offset="100%" stopColor="#181c21" />
        </linearGradient>

        {/* Near-camera pillar gradient — left edge column */}
        <linearGradient id="dfPillar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#2a2e35" />
          <stop offset="100%" stopColor="#1a1e24" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* ── Background base fill ───────────────────────────────────────────── */}
      <rect x={0} y={0} width={SCENE_W} height={VP_Y} fill="url(#dfWall)" />

      {/* ── Left wall panel ─────────────────────────────────────────────────── */}
      {/* At top (y=0): 0→80px. At horizon: 0→720px. Diagonal road receding right. */}
      {/* ── Ceiling-to-wall edge lines ──────────────────────────────────────── */}
      {/* Left edge: (720,145)→(80,0) — strong diagonal sweep */}


      {/* ── Asymmetric ceiling depth grid ──────────────────────────────────── */}
      {/* Horizontal depth lines trace the diagonal perspective of the ceiling. */}
      {CEIL_LINES.map(({ y, lx, rx }, i) => (
        <g key={i}>
          {/* Left wall band */}
          <line x1={0}  y1={y} x2={lx}      y2={y}
                stroke="rgba(255,255,255,0.050)" strokeWidth={0.8} />
          {/* Ceiling band */}
          <line x1={lx} y1={y} x2={rx}      y2={y}
                stroke="rgba(255,255,255,0.040)" strokeWidth={0.7} />
          {/* Right wall band */}
          <line x1={rx} y1={y} x2={SCENE_W} y2={y}
                stroke="rgba(255,255,255,0.050)" strokeWidth={0.8} />
        </g>
      ))}

      {/* ── Left wall joints ────────────────────────────────────────────────── */}
      {/* Lines converge from far (RL_FAR-fraction, 145) to near (CL_NEAR-fraction, 0). */}


      {/* ── Right wall joints ────────────────────────────────────────────────── */}


      {/* ── Fluorescent tubes — diagonal sweep toward upper-right VP ─────────── */}
      {/* Far ends at upper-right (road VP area), near ends biased LEFT toward camera. */}


      {/* ── Near-camera structural column (left edge) ────────────────────────── */}
      <rect x={0} y={0} width={16} height={SCENE_H} fill="url(#dfPillar)" opacity={0.70} />
      <line x1={16} y1={0} x2={16} y2={VP_Y}
            stroke="rgba(255,255,255,0.09)" strokeWidth={0.8} />

      {/* ── Entry glow at horizon — lane exits scene to the right ─────────────── */}

      {/* ── Ceiling ambient wash ─────────────────────────────────────────────── */}
      {/* Centered over visible ceiling area (CL_NEAR_X=80 to CR_NEAR_X=628 at top). */}
      <ellipse cx={350} cy={12} rx={200} ry={50} fill="#d0ccac" opacity={0.020} />

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
