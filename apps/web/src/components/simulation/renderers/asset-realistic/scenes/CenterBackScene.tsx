/**
 * CenterBackScene — Parking exit environment (center_back POV).
 *
 * Camera is positioned at the exit gate, looking toward cars exiting
 * (away direction). The scene simulates a covered parking exit lane —
 * same ceiling/wall/road color palette as CenterFrontScene (kept in sync
 * so both center scenes read as the same physical space), just with the
 * exit direction arrow oriented for this lane.
 *
 * Ceiling geometry is identical to CenterFrontScene.
 * See CenterFrontScene.tsx for derivation notes.
 *
 * Relies on shared defs in AssetRealisticRenderer:
 *   #arAsphalt — road surface texture pattern
 */
import {
  SCENE_W, SCENE_H, VP_X, VP_Y, GATE_T_BACK, lerp,
} from '../../../../../utils/depth';

// ─── Road geometry constants ─────────────────────────────────────────────────
const RL_FAR  = VP_X - 10;
const RR_FAR  = VP_X + 10;
const RL_NEAR = SCENE_W * 0.175;
const RR_NEAR = SCENE_W * 0.825;
const SHOULDER_NEAR = 55;
const SHOULDER_FAR  = 5;

// ─── Ceiling geometry (same derivation as CenterFrontScene) ─────────────────
const CL_NEAR_X = RL_NEAR;
const CR_NEAR_X = RR_NEAR;

// ─── Polygon helpers ─────────────────────────────────────────────────────────
function rp(lf: number, rf: number, yf: number, ln: number, rn: number, yn: number) {
  return `${lf},${yf} ${rf},${yf} ${rn},${yn} ${ln},${yn}`;
}
const road      = rp(RL_FAR, RR_FAR, VP_Y, RL_NEAR, RR_NEAR, SCENE_H);
const lShoulder = rp(RL_FAR - SHOULDER_FAR, RL_FAR, VP_Y, RL_NEAR - SHOULDER_NEAR, RL_NEAR, SCENE_H);
const rShoulder = rp(RR_FAR, RR_FAR + SHOULDER_FAR, VP_Y, RR_NEAR, RR_NEAR + SHOULDER_NEAR, SCENE_H);

// ─── Fluorescent tubes ───────────────────────────────────────────────────────
const TUBE_L_X1 = VP_X - 2;   const TUBE_L_Y1 = VP_Y;
const TUBE_L_X2 = VP_X - 57;  const TUBE_L_Y2 = 0;
const TUBE_R_X1 = VP_X + 2;   const TUBE_R_Y1 = VP_Y;
const TUBE_R_X2 = VP_X + 57;  const TUBE_R_Y2 = 0;

// ─── Gate / stop-line ────────────────────────────────────────────────────────
const GATE_Y  = Math.round(lerp(VP_Y, SCENE_H, GATE_T_BACK));
const GATE_RL = Math.round(lerp(RL_FAR, RL_NEAR, GATE_T_BACK));
const GATE_RR = Math.round(lerp(RR_FAR, RR_NEAR, GATE_T_BACK));

// ─── Exit direction arrow ─────────────────────────────────────────────────────
// Same position as entry arrow. Up-pointing (toward VP) = exit direction in this lane.
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

// ─── Floor light pools ───────────────────────────────────────────────────────
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
export function CenterBackScene() {
  return (
    <>
      <defs>
        {/* Concrete ceiling/wall gradient — same cool dark tone as CenterFrontScene */}
        <linearGradient id="cbWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#16191e" />
          <stop offset="100%" stopColor="#20242a" />
        </linearGradient>

        {/* Overhead ceiling panel — slightly darker (directly above) */}
        <linearGradient id="cbCeil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0f1115" />
          <stop offset="100%" stopColor="#181c21" />
        </linearGradient>
      </defs>

      {/* ── Background base fill ───────────────────────────────────────────── */}
      <rect x={0} y={0} width={SCENE_W} height={VP_Y} fill="url(#cbWall)" />

      {/* ── Left wall panel ────────────────────────────────────────────────── */}
      <polygon
        points={`0,0 ${CL_NEAR_X},0 ${RL_FAR},${VP_Y} 0,${VP_Y}`}
        fill="#1d2128"
      />

      {/* ── Right wall panel ───────────────────────────────────────────────── */}
      <polygon
        points={`${CR_NEAR_X},0 ${SCENE_W},0 ${SCENE_W},${VP_Y} ${RR_FAR},${VP_Y}`}
        fill="#1d2128"
      />

      {/* ── Overhead ceiling panel ──────────────────────────────────────────── */}
      <polygon
        points={`${CL_NEAR_X},0 ${CR_NEAR_X},0 ${RR_FAR},${VP_Y} ${RL_FAR},${VP_Y}`}
        fill="url(#cbCeil)"
      />

      {/* ── Ceiling-to-wall edge lines ──────────────────────────────────────── */}
      <line x1={RL_FAR} y1={VP_Y} x2={CL_NEAR_X} y2={0}
            stroke="rgba(255,255,255,0.13)" strokeWidth={0.9} />
      <line x1={RR_FAR} y1={VP_Y} x2={CR_NEAR_X} y2={0}
            stroke="rgba(255,255,255,0.13)" strokeWidth={0.9} />

      {/* ── Wall panel joints ───────────────────────────────────────────────── */}
      <line x1={Math.round(lerp(0, RL_FAR, 0.36))} y1={VP_Y}
            x2={Math.round(lerp(0, CL_NEAR_X, 0.36))} y2={0}
            stroke="rgba(255,255,255,0.040)" strokeWidth={0.8} />
      <line x1={Math.round(lerp(0, RL_FAR, 0.68))} y1={VP_Y}
            x2={Math.round(lerp(0, CL_NEAR_X, 0.68))} y2={0}
            stroke="rgba(255,255,255,0.035)" strokeWidth={0.7} />
      <line x1={Math.round(lerp(SCENE_W, RR_FAR, 0.36))} y1={VP_Y}
            x2={Math.round(lerp(SCENE_W, CR_NEAR_X, 0.36))} y2={0}
            stroke="rgba(255,255,255,0.040)" strokeWidth={0.8} />
      <line x1={Math.round(lerp(SCENE_W, RR_FAR, 0.68))} y1={VP_Y}
            x2={Math.round(lerp(SCENE_W, CR_NEAR_X, 0.68))} y2={0}
            stroke="rgba(255,255,255,0.035)" strokeWidth={0.7} />

      {/* ── Fluorescent tube light strips ────────────────────────────────────── */}
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

      {/* ── Exit archway at far wall ──────────────────────────────────────────── */}
      <path
        d={`M ${RL_FAR - 14},${VP_Y} L ${RL_FAR - 14},${VP_Y - 32}
            A 46 32 0 0 1 ${RR_FAR + 14},${VP_Y - 32}
            L ${RR_FAR + 14},${VP_Y} Z`}
        fill="#13161b"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth={0.8}
      />

      {/* ── Ceiling ambient light wash ────────────────────────────────────────── */}
      <ellipse cx={VP_X} cy={12} rx={200} ry={50} fill="#d0ccac" opacity={0.022} />

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

      {/* ── Floor light pools ─────────────────────────────────────────────────── */}
      {FLOOR_POOLS.map((p, i) => (
        <ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry}
                 fill="#d0ccaa" opacity={0.040} />
      ))}

      {/* ── Stop line at gate position ────────────────────────────────────────── */}
      <line x1={GATE_RL} y1={GATE_Y} x2={GATE_RR} y2={GATE_Y}
            stroke="#a8a690" strokeWidth={2.5} opacity={0.42} />

      {/* ── Exit direction arrow ──────────────────────────────────────────────── */}
      {/* Amber tint — up-pointing (toward VP = exit direction in this lane). */}
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
        fill="rgba(180,170,90,0.87)"
        stroke="rgba(180,195,80,0.55)"
        strokeWidth={0.9}
        strokeLinejoin="round"
      />
    </>
  );
}
