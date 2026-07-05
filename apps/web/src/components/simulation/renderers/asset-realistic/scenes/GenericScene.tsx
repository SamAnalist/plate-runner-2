/**
 * GenericScene — parking interior background used for driver/passenger POV placements.
 *
 * Visual character:
 *   Dark concrete ceiling above horizon.
 *   Flat asphalt with road polygon, edge lines and centre dashes.
 *   Two ambient utility light glows on ceiling.
 *   No architectural detail beyond a generic garage feel —
 *   driver/passenger views are angled, so structural detail would be mis-aligned.
 *
 * Relies on shared defs in AssetRealisticRenderer:
 *   #arAsphalt — road surface texture pattern
 */
import {
  SCENE_W, SCENE_H, VP_X, VP_Y, lerp,
} from '../../../../../utils/depth';

const RL_FAR  = VP_X - 10;          // 390
const RR_FAR  = VP_X + 10;          // 410
const RL_NEAR = SCENE_W * 0.175;    // 140
const RR_NEAR = SCENE_W * 0.825;    // 660
const SHOULDER_NEAR = 55;
const SHOULDER_FAR  = 5;

function rp(lf: number, rf: number, yf: number, ln: number, rn: number, yn: number) {
  return `${lf},${yf} ${rf},${yf} ${rn},${yn} ${ln},${yn}`;
}

const road      = rp(RL_FAR, RR_FAR, VP_Y, RL_NEAR, RR_NEAR, SCENE_H);
const lShoulder = rp(RL_FAR - SHOULDER_FAR, RL_FAR, VP_Y, RL_NEAR - SHOULDER_NEAR, RL_NEAR, SCENE_H);
const rShoulder = rp(RR_FAR, RR_FAR + SHOULDER_FAR, VP_Y, RR_NEAR, RR_NEAR + SHOULDER_NEAR, SCENE_H);

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

export function GenericScene() {
  return (
    <>
      <defs>
        <linearGradient id="gsWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#1d2126" />
          <stop offset="100%" stopColor="#282c32" />
        </linearGradient>
      </defs>

      {/* Concrete wall / ceiling (above horizon) */}
      <rect x={0} y={0} width={SCENE_W} height={VP_Y} fill="url(#gsWall)" />

      {/* Subtle horizontal hints on far wall */}
      {[VP_Y - 90, VP_Y - 60, VP_Y - 30].map((wy, i) => (
        <line key={i} x1={0} y1={wy} x2={SCENE_W} y2={wy}
              stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
      ))}

      {/* Utility lighting glows on ceiling */}
      <ellipse cx={SCENE_W * 0.28} cy={0} rx={80} ry={30} fill="#e8d090" opacity={0.04} />
      <ellipse cx={SCENE_W * 0.72} cy={0} rx={80} ry={30} fill="#e8d090" opacity={0.04} />

      {/* Dark asphalt ground (below horizon) */}
      <rect x={0} y={VP_Y} width={SCENE_W} height={SCENE_H - VP_Y} fill="#171a1e" />
      <line x1={0} y1={VP_Y} x2={SCENE_W} y2={VP_Y}
            stroke="#34383e" strokeWidth={1.5} opacity={0.7} />

      {/* Road polygon */}
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
    </>
  );
}
