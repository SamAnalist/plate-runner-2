import {
  SCENE_W,
  SCENE_H,
  VP_X,
  VP_Y,
  lerp,
} from '../../utils/depth';

// Road edge coordinates
const RL_FAR  = VP_X - 10;       // 390 (road left  at horizon)
const RR_FAR  = VP_X + 10;       // 410 (road right at horizon)
const RL_NEAR = SCENE_W * 0.175; // 140 (road left  at near edge)
const RR_NEAR = SCENE_W * 0.825; // 660 (road right at near edge)

// Shoulder extends this far beyond road edge
const SHOULDER_NEAR = 55;
const SHOULDER_FAR  = 5;

export function Road() {
  // Road polygon points
  const road = [
    `${RL_FAR},${VP_Y}`,
    `${RR_FAR},${VP_Y}`,
    `${RR_NEAR},${SCENE_H}`,
    `${RL_NEAR},${SCENE_H}`,
  ].join(' ');

  // Left shoulder
  const lShoulder = [
    `${RL_FAR - SHOULDER_FAR},${VP_Y}`,
    `${RL_FAR},${VP_Y}`,
    `${RL_NEAR},${SCENE_H}`,
    `${RL_NEAR - SHOULDER_NEAR},${SCENE_H}`,
  ].join(' ');

  // Right shoulder
  const rShoulder = [
    `${RR_FAR},${VP_Y}`,
    `${RR_FAR + SHOULDER_FAR},${VP_Y}`,
    `${RR_NEAR + SHOULDER_NEAR},${SCENE_H}`,
    `${RR_NEAR},${SCENE_H}`,
  ].join(' ');

  // Dashed center-line segments — perspective-correct width & spacing
  const NUM_DASHES = 9;
  const centerDashes = Array.from({ length: NUM_DASHES }, (_, i) => {
    const t0 = (i + 0.08) / NUM_DASHES;
    const t1 = (i + 0.45) / NUM_DASHES;
    const cx = (RL_FAR + RR_FAR) / 2; // center x at horizon
    const nx = (RL_NEAR + RR_NEAR) / 2; // center x at near
    const x0 = lerp(cx, nx, t0);
    const y0 = lerp(VP_Y, SCENE_H, t0);
    const x1 = lerp(cx, nx, t1);
    const y1 = lerp(VP_Y, SCENE_H, t1);
    const w  = lerp(0.6, 4.5, (t0 + t1) / 2);
    return { x0, y0, x1, y1, w };
  });

  return (
    <g>
      {/* Left shoulder / curb */}
      <polygon points={lShoulder} fill="#181818" />
      {/* Right shoulder / curb */}
      <polygon points={rShoulder} fill="#181818" />

      {/* Road surface */}
      <polygon points={road} fill="#252525" />

      {/* Road surface sheen (subtle) */}
      <defs>
        <linearGradient id="roadSheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#3a3a3a" stopOpacity={0.4} />
          <stop offset="100%" stopColor="#1a1a1a" stopOpacity={0.0} />
        </linearGradient>
      </defs>
      <polygon points={road} fill="url(#roadSheen)" />

      {/* Edge lines */}
      <line
        x1={RL_FAR}  y1={VP_Y}
        x2={RL_NEAR} y2={SCENE_H}
        stroke="white" strokeWidth={1.8} opacity={0.55}
      />
      <line
        x1={RR_FAR}  y1={VP_Y}
        x2={RR_NEAR} y2={SCENE_H}
        stroke="white" strokeWidth={1.8} opacity={0.55}
      />

      {/* Dashed center line */}
      {centerDashes.map((d, i) => (
        <line
          key={i}
          x1={d.x0} y1={d.y0}
          x2={d.x1} y2={d.y1}
          stroke="#ffffff"
          strokeWidth={d.w}
          opacity={0.30}
        />
      ))}
    </g>
  );
}
