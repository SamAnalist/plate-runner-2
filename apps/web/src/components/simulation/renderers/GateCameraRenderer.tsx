import type { SceneRendererProps } from './types';
import { Vehicle } from '../Vehicle';
import { Gate } from '../Gate';
import {
  SCENE_W,
  SCENE_H,
  VP_X,
  VP_Y,
  lerp,
  getPlateSceneRect,
} from '../../../utils/depth';

// Road edge constants (mirrored from Road.tsx)
const RL_FAR   = VP_X - 10;
const RR_FAR   = VP_X + 10;
const RL_NEAR  = SCENE_W * 0.175;
const RR_NEAR  = SCENE_W * 0.825;
const SHOULDER_NEAR = 55;
const SHOULDER_FAR  = 5;

// Approach lane guide lines (inside road trapezoid, left of center)
function getApproachLine(xFarFraction: number, xNearFraction: number) {
  const farX  = lerp(RL_FAR,  RR_FAR,  xFarFraction);
  const nearX = lerp(RL_NEAR, RR_NEAR, xNearFraction);
  return { x1: farX, y1: VP_Y, x2: nearX, y2: SCENE_H };
}

export function GateCameraRenderer({
  config,
  vehicleT,
  vehicleDepth,
  gateDepth,
  gateOpen,
  phase,
  vehicleBehindGate,
}: SceneRendererProps) {
  const plateRect = (phase === 'stopped_at_gate' || phase === 'waiting_for_signal' || phase === 'gate_opening')
    ? getPlateSceneRect(vehicleT, config.detectorPlacement)
    : null;

  // Road polygon strings
  const road = [
    `${RL_FAR},${VP_Y}`,
    `${RR_FAR},${VP_Y}`,
    `${RR_NEAR},${SCENE_H}`,
    `${RL_NEAR},${SCENE_H}`,
  ].join(' ');

  const lShoulder = [
    `${RL_FAR - SHOULDER_FAR},${VP_Y}`,
    `${RL_FAR},${VP_Y}`,
    `${RL_NEAR},${SCENE_H}`,
    `${RL_NEAR - SHOULDER_NEAR},${SCENE_H}`,
  ].join(' ');

  const rShoulder = [
    `${RR_FAR},${VP_Y}`,
    `${RR_FAR + SHOULDER_FAR},${VP_Y}`,
    `${RR_NEAR + SHOULDER_NEAR},${SCENE_H}`,
    `${RR_NEAR},${SCENE_H}`,
  ].join(' ');

  const centerDashes = Array.from({ length: 9 }, (_, i) => {
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

  // Approach lane guides (two parallel dashed lines inside the road)
  const leftGuide  = getApproachLine(0.25, 0.25);
  const rightGuide = getApproachLine(0.75, 0.75);

  // Timestamp hint (static display string)
  const tsHint = '2025-07-03  12:34:56';

  // Plate scan corners
  const px  = plateRect ? plateRect.x - 4 : 0;
  const py  = plateRect ? plateRect.y - 4 : 0;
  const pw  = plateRect ? plateRect.w + 8 : 0;
  const ph  = plateRect ? plateRect.h + 8 : 0;

  return (
    <>
      <defs>
        {/* Concrete wall gradient */}
        <linearGradient id="gcWallGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#1a1d22" />
          <stop offset="100%" stopColor="#22252a" />
        </linearGradient>
        {/* Vignette */}
        <radialGradient id="gcVignette" cx="50%" cy="50%" r="70%">
          <stop offset="0%"   stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.45)" />
        </radialGradient>
      </defs>

      {/* ── Concrete wall (top 45%) ── */}
      <rect x={0} y={0} width={SCENE_W} height={VP_Y} fill="url(#gcWallGrad)" />

      {/* Wall horizontal texture lines */}
      {[VP_Y - 100, VP_Y - 70, VP_Y - 40, VP_Y - 12].map((wy, i) => (
        <line
          key={i}
          x1={0} y1={wy}
          x2={SCENE_W} y2={wy}
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={1}
        />
      ))}

      {/* ── Dark asphalt (bottom 55%) ── */}
      <rect x={0} y={VP_Y} width={SCENE_W} height={SCENE_H - VP_Y} fill="#18191c" />

      {/* Divider */}
      <line x1={0} y1={VP_Y} x2={SCENE_W} y2={VP_Y} stroke="#30333a" strokeWidth={1.5} opacity={0.8} />

      {/* ── Road ── */}
      <polygon points={lShoulder} fill="#141518" />
      <polygon points={rShoulder} fill="#141518" />
      <polygon points={road} fill="#1e2024" />

      {/* Edge lines */}
      <line x1={RL_FAR} y1={VP_Y} x2={RL_NEAR} y2={SCENE_H} stroke="white" strokeWidth={1.6} opacity={0.45} />
      <line x1={RR_FAR} y1={VP_Y} x2={RR_NEAR} y2={SCENE_H} stroke="white" strokeWidth={1.6} opacity={0.45} />

      {/* Center dashes */}
      {centerDashes.map((d, i) => (
        <line key={i} x1={d.x0} y1={d.y0} x2={d.x1} y2={d.y1}
              stroke="white" strokeWidth={d.w} opacity={0.20} />
      ))}

      {/* Approach lane guide lines */}
      <line
        x1={leftGuide.x1}  y1={leftGuide.y1}
        x2={leftGuide.x2}  y2={leftGuide.y2}
        stroke="rgba(255,255,255,0.10)"
        strokeWidth={1}
        strokeDasharray="6 8"
      />
      <line
        x1={rightGuide.x1} y1={rightGuide.y1}
        x2={rightGuide.x2} y2={rightGuide.y2}
        stroke="rgba(255,255,255,0.10)"
        strokeWidth={1}
        strokeDasharray="6 8"
      />

      {/* ── Gate + Vehicle (Z-ordered) ── */}
      {vehicleBehindGate ? (
        <>
          <Vehicle config={config} vehicleT={vehicleT} vehicleDepth={vehicleDepth} />
          <Gate gateDepth={gateDepth} gateOpen={gateOpen} gateMode={config.gateMode} />
        </>
      ) : (
        <>
          <Gate gateDepth={gateDepth} gateOpen={gateOpen} gateMode={config.gateMode} />
          <Vehicle config={config} vehicleT={vehicleT} vehicleDepth={vehicleDepth} />
        </>
      )}

      {/* Vignette */}
      <rect x={0} y={0} width={SCENE_W} height={SCENE_H} fill="url(#gcVignette)" pointerEvents="none" />

      {/* ── Plate scan indicator (when at_gate) ── */}
      {plateRect && (
        <g>
          {/* Scan bounding box */}
          <rect
            x={px} y={py}
            width={pw} height={ph}
            fill="none"
            stroke="#22c55e"
            strokeWidth={1.5}
            opacity={0.9}
            rx={2}
          />
          {/* Corner bracket: top-left */}
          <path
            d={`M${px},${py + 8} L${px},${py} L${px + 8},${py}`}
            fill="none" stroke="#22c55e" strokeWidth={2}
          />
          {/* Corner bracket: top-right */}
          <path
            d={`M${px + pw - 8},${py} L${px + pw},${py} L${px + pw},${py + 8}`}
            fill="none" stroke="#22c55e" strokeWidth={2}
          />
          {/* Corner bracket: bottom-left */}
          <path
            d={`M${px},${py + ph - 8} L${px},${py + ph} L${px + 8},${py + ph}`}
            fill="none" stroke="#22c55e" strokeWidth={2}
          />
          {/* Corner bracket: bottom-right */}
          <path
            d={`M${px + pw - 8},${py + ph} L${px + pw},${py + ph} L${px + pw},${py + ph - 8}`}
            fill="none" stroke="#22c55e" strokeWidth={2}
          />
          {/* READING label */}
          <text
            x={plateRect.x}
            y={plateRect.y + plateRect.h + 14}
            fontSize={8}
            fill="#22c55e"
            fontFamily='"JetBrains Mono", monospace'
            fontWeight={700}
          >
            READING...
          </text>
        </g>
      )}

      {/* ── Camera UI overlay (always on top) ── */}
      <g>
        {/* CAM-01 label */}
        <text
          x={8} y={16}
          fontSize={10}
          fill="rgba(255,255,255,0.55)"
          fontFamily='"JetBrains Mono", monospace'
        >
          CAM-01
        </text>
        {/* Timestamp hint */}
        <text
          x={8} y={28}
          fontSize={8}
          fill="rgba(255,255,255,0.35)"
          fontFamily='"JetBrains Mono", monospace'
        >
          {tsHint}
        </text>

        {/* REC indicator — pulsing circle + text */}
        <circle cx={SCENE_W - 52} cy={11} r={4} fill="#ef4444">
          <animate
            attributeName="opacity"
            values="1;0.2;1"
            dur="1.4s"
            repeatCount="indefinite"
          />
        </circle>
        <text
          x={SCENE_W - 8} y={16}
          textAnchor="end"
          fontSize={10}
          fill="#ef4444"
          fontFamily='"JetBrains Mono", monospace'
          fontWeight={700}
        >
          REC
        </text>

        {/* Resolution / fps */}
        <text
          x={8} y={SCENE_H - 8}
          fontSize={8}
          fill="rgba(255,255,255,0.25)"
          fontFamily='"JetBrains Mono", monospace'
        >
          1920×1080  30fps
        </text>

        {/* Viewfinder corner brackets */}
        {/* Top-left */}
        <path
          d="M8,45 L8,35 L18,35"
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={1.5}
        />
        {/* Top-right */}
        <path
          d={`M${SCENE_W - 18},35 L${SCENE_W - 8},35 L${SCENE_W - 8},45`}
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={1.5}
        />
        {/* Bottom-left */}
        <path
          d={`M8,${SCENE_H - 45} L8,${SCENE_H - 35} L18,${SCENE_H - 35}`}
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={1.5}
        />
        {/* Bottom-right */}
        <path
          d={`M${SCENE_W - 18},${SCENE_H - 35} L${SCENE_W - 8},${SCENE_H - 35} L${SCENE_W - 8},${SCENE_H - 45}`}
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={1.5}
        />
      </g>
    </>
  );
}
