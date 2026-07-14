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
const RL_FAR  = VP_X + 320;         // 720 — road left edge at horizon (upper right)
const RR_FAR  = VP_X + 450;         // 850 — road right edge at horizon (exits right)
const RL_NEAR = SCENE_W * 0.125;    // 100 — road left edge at bottom
const RR_NEAR = SCENE_W * 0.830;    // 628 — road right edge at bottom
const SHOULDER_NEAR = 45;
const SHOULDER_FAR  = 4;

// ─── Ceiling geometry — asymmetric (camera on LEFT/driver side) ──────────────
// Near left pulled inward (x=90): camera flush with left wall.
// Near right = road right near (628). Both far edges follow road at horizon.
const CL_NEAR_X = 90;               // ceiling near left edge  (camera side)
const CR_NEAR_X = 800;          // ceiling near right edge (628)

// Road center at far (horizon) and near (bottom) — used by arrow
const CX_FAR  = (RL_FAR + RR_FAR) / 2;   // 785
const CX_NEAR = (RL_NEAR + RR_NEAR) / 2; // 364

// ─── Road polygon strings ────────────────────────────────────────────────────
function rp(lf: number, rf: number, yf: number, ln: number, rn: number, yn: number) {
  return `${lf},${yf} ${rf},${yf} ${rn},${yn} ${ln},${yn}`;
}
const road      = rp(RL_FAR, RR_FAR, VP_Y, RL_NEAR, RR_NEAR, SCENE_H);
const lShoulder = rp(RL_FAR - SHOULDER_FAR, RL_FAR, VP_Y, RL_NEAR - SHOULDER_NEAR, RL_NEAR, SCENE_H);
const rShoulder = rp(RR_FAR, RR_FAR + SHOULDER_FAR, VP_Y, RR_NEAR, RR_NEAR + SHOULDER_NEAR, SCENE_H);

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

// ─── Fluorescent tube lights ──────────────────────────────────────────────────
// Far ends sweep toward upper-right (road VP area). Near ends shift left toward camera.
const TUBE_L_X1 = 820;   const TUBE_L_Y1 = VP_Y;   // far end — near road left at horizon
const TUBE_L_X2 = 320;   const TUBE_L_Y2 = -20;      // near end — shifted hard LEFT
const TUBE_R_X1 = 860;   const TUBE_R_Y1 = VP_Y;   // far end — at scene right edge
const TUBE_R_X2 = 430;   const TUBE_R_Y2 = -20;      // near end — slightly left of center

// ─── Gate / stop-line geometry ────────────────────────────────────────────────
const GATE_Y  = Math.round(lerp(VP_Y, SCENE_H, GATE_T));
const GATE_RL = Math.round(lerp(RL_FAR, RL_NEAR, GATE_T));
const GATE_RR = Math.round(lerp(RR_FAR, RR_NEAR, GATE_T));

// ─── Entry direction arrow ────────────────────────────────────────────────────
const ARR_T    = 0.35;
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
const ARR_CX = Math.round(lerp(CX_FAR, CX_NEAR, ARR_T)) - 50; // ≈ 650
// Lean: total horizontal shift at the TOP of the arrow (base). Adjust to taste.
const ARR_LEAN_X    = 100;
// Proportional lean at each Y level so the whole arrow tilts uniformly:
//   tip (bottom) = 0 lean, head junction = partial lean, base (top) = full lean
const ARR_LEAN_HEAD = Math.round(ARR_LEAN_X * (ARR_HH / ARR_H)); // lean at head/body junction
const ARR_LEAN_BASE = ARR_LEAN_X;                                  // lean at base (top)

// ─── Centre-line dashes ───────────────────────────────────────────────────────
const CENTER_DASHES = Array.from({ length: 9 }, (_, i) => {
  const t0 = (i + 0.08) / 9;
  const t1 = (i + 0.45) / 9;
  return {
    x0: lerp(CX_FAR, CX_NEAR, t0), y0: lerp(VP_Y, SCENE_H, t0),
    x1: lerp(CX_FAR, CX_NEAR, t1), y1: lerp(VP_Y, SCENE_H, t1),
    w:  lerp(0.6, 4.5, (t0 + t1) / 2),
  };
});

// ─── Floor light pools ────────────────────────────────────────────────────────
// Positioned below ceiling tubes — slightly left of road center (camera-left bias).
const FLOOR_POOLS = [
  { t: 0.14, cx: 727, frac: 0.21 },
  { t: 0.70, cx: 500, frac: 0.21 },
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
      <polygon
        points={`0,0 ${CL_NEAR_X},0 ${RL_FAR},${VP_Y} 0,${VP_Y}`}
        fill="#1c2028"
      />

      {/* ── Right wall panel — thin right strip ─────────────────────────────── */}
      {/* RR_FAR=850 exits scene right — SVG clips at x=800. */}
      <polygon
        points={`${CR_NEAR_X},0 ${SCENE_W},0 ${SCENE_W},${VP_Y} ${RR_FAR},${VP_Y}`}
        fill="#1d2128"
      />

      {/* ── Overhead ceiling panel ──────────────────────────────────────────── */}
      {/* Diagonal strip: spans 80→628 at top, 720→850(clipped) at horizon. */}
      <polygon
        points={`${CL_NEAR_X},0 ${CR_NEAR_X},0 ${RR_FAR},${VP_Y} ${RL_FAR},${VP_Y}`}
        fill="url(#dfCeil)"
      />

      {/* ── Ceiling-to-wall edge lines ──────────────────────────────────────── */}
      {/* Left edge: (720,145)→(80,0) — strong diagonal sweep */}
      <line x1={RL_FAR} y1={VP_Y} x2={CL_NEAR_X} y2={0}
            stroke="rgba(255,255,255,0.14)" strokeWidth={1.0} />
      {/* Right edge: (850,145)→(628,0) — exits scene, SVG clips */}
      <line x1={RR_FAR} y1={VP_Y} x2={CR_NEAR_X} y2={0}
            stroke="rgba(255,255,255,0.12)" strokeWidth={0.9} />

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
      <line x1={Math.round(RL_FAR  * 0.36)} y1={VP_Y}
            x2={Math.round(CL_NEAR_X * 0.36)} y2={0}
            stroke="rgba(255,255,255,0.042)" strokeWidth={0.7} />
      <line x1={Math.round(RL_FAR  * 0.68)} y1={VP_Y}
            x2={Math.round(CL_NEAR_X * 0.68)} y2={0}
            stroke="rgba(255,255,255,0.035)" strokeWidth={0.6} />

      {/* ── Right wall joints ────────────────────────────────────────────────── */}
      <line x1={Math.round(lerp(SCENE_W, RR_FAR, 0.36))} y1={VP_Y}
            x2={Math.round(lerp(SCENE_W, CR_NEAR_X, 0.36))} y2={0}
            stroke="rgba(255,255,255,0.038)" strokeWidth={0.7} />
      <line x1={Math.round(lerp(SCENE_W, RR_FAR, 0.68))} y1={VP_Y}
            x2={Math.round(lerp(SCENE_W, CR_NEAR_X, 0.68))} y2={0}
            stroke="rgba(255,255,255,0.032)" strokeWidth={0.6} />

      {/* ── Fluorescent tubes — diagonal sweep toward upper-right VP ─────────── */}
      {/* Far ends at upper-right (road VP area), near ends biased LEFT toward camera. */}
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
      <rect x={0} y={0} width={16} height={SCENE_H} fill="url(#dfPillar)" opacity={0.70} />
      <line x1={16} y1={0} x2={16} y2={VP_Y}
            stroke="rgba(255,255,255,0.09)" strokeWidth={0.8} />

      {/* ── Entry glow at horizon — lane exits scene to the right ─────────────── */}
      {/* Soft glow where the diagonal lane converges off-screen upper-right. */}
      <ellipse cx={760} cy={VP_Y} rx={55} ry={14}
               fill="rgba(180,200,160,0.06)" />

      {/* ── Ceiling ambient wash ─────────────────────────────────────────────── */}
      {/* Centered over visible ceiling area (CL_NEAR_X=80 to CR_NEAR_X=628 at top). */}
      <ellipse cx={350} cy={12} rx={200} ry={50} fill="#d0ccac" opacity={0.020} />

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

      {/* Road edge lines — diagonal, converge upper-right */}
      <line x1={RL_FAR} y1={VP_Y} x2={RL_NEAR} y2={SCENE_H}
            stroke="#d0c890" strokeWidth={1.8} opacity={0.55} />
      <line x1={RR_FAR} y1={VP_Y} x2={RR_NEAR} y2={SCENE_H}
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
        fill="rgba(180,195,80,0.17)"
        stroke="rgba(180,195,80,0.35)"
        strokeWidth={0.9}
        strokeLinejoin="round"
      />
    </>
  );
}
