/**
 * AssetRealisticRenderer — parking scene renderer with per-POV scene variants.
 *
 * Architecture:
 *   Scene variant is selected from placement via getSceneVariant():
 *     center_front    → CenterFrontScene    (parking entry, centered)
 *     center_back     → CenterBackScene     (parking exit,  centered)
 *     driver_front    → DriverFrontScene    (parking entry, driver/left side)
 *     passenger_front → PassengerFrontScene (parking entry, passenger/right side)
 *     driver_back     → DriverBackScene     (parking exit,  driver/left side)
 *     passenger_back  → PassengerBackScene  (parking exit,  passenger/right side)
 *
 *   Rendering order (back to front):
 *     1. Scene background (selected variant)
 *     2. Gate arm + post
 *     3. Vehicle (or gate before vehicle based on vehicleBehindGate)
 *     4. Vignette overlay
 *     5. Motion path debug overlay (QA only)
 *
 * Shared SVG defs (referenced by all scene components):
 *   #arAsphalt — road surface texture pattern
 *   #arVignette — radial vignette gradient
 *
 * Gate arm animation:
 *   Closed: arm horizontal (0°), blocking lane.
 *   Open:   arm rotated 84°, pointing nearly straight up.
 *   Animated via CSS style.transform + transition (not Framer Motion) for
 *   reliable SVG cross-browser behaviour.
 */
import type { SceneRendererProps } from './rendererProps';
import { VehicleAssetLayer }         from './VehicleAssetLayer';
import { getSceneVariant }           from './sceneVariants';
import { CenterFrontScene }          from './scenes/CenterFrontScene';
import { CenterBackScene }           from './scenes/CenterBackScene';
import { DriverFrontScene }          from './scenes/DriverFrontScene';
import { PassengerFrontScene }       from './scenes/PassengerFrontScene';
import { DriverBackScene }           from './scenes/DriverBackScene';
import { PassengerBackScene }        from './scenes/PassengerBackScene';
import {
  SCENE_W, SCENE_H,
  getDepthValues,
} from '../../../../utils/depth';
import {
  getMotionPathDebugPoints,
  getViewAwareX,
} from './viewMotionPaths';
import type { DetectorPlacement } from '@plate-runner/shared';

// ── Gate component ────────────────────────────────────────────────────────────
function AssetGate({
  gateDepth,
  gateOpen,
  gateMode,
}: Pick<SceneRendererProps, 'gateDepth' | 'gateOpen'> & { gateMode: string }) {
  if (gateMode === 'hidden') return null;

  const { roadRight, roadWidth, y, scale } = gateDepth;

  const postW  = Math.max(7,  roadWidth * 0.042);
  const postH  = Math.max(32, 95 * scale);
  const postX  = roadRight - postW;
  const postY  = y - postH;

  const armLen   = roadWidth * 0.88;
  const armThick = Math.max(3.5, roadWidth * 0.022);
  const pivotX   = postX + postW / 2;
  const pivotY   = postY + postH * 0.14;

  // 84° = arm pointing nearly straight up (open), 0° = horizontal (closed)
  const armAngle = gateOpen ? 84 : 0;

  const lightR  = Math.max(2.8, postW * 0.40);
  const lightCX = postX + postW / 2;
  const lightCY = postY + postH * 0.10;
  const lightCol = gateOpen ? '#4ade80' : '#f87171';

  const numStripes = 5;
  const stripes = Array.from({ length: numStripes }, (_, i) => ({
    relX: -armLen + armLen * (0.08 + i * 0.18),
    w:    armLen * 0.058,
  }));

  return (
    <g>
      {/* Post shadow on road */}
      <ellipse
        cx={postX + postW / 2} cy={y + 1}
        rx={postW * 2.4} ry={4 * scale}
        fill="rgba(0,0,0,0.35)"
      />

      {/* Post body */}
      <rect
        x={postX} y={postY}
        width={postW} height={postH}
        fill="#252930"
        rx={postW * 0.20}
      />
      {/* Post edge highlight */}
      <rect
        x={postX + postW * 0.14}
        y={postY + postH * 0.04}
        width={postW * 0.20}
        height={postH * 0.80}
        fill="rgba(255,255,255,0.07)"
        rx={postW * 0.08}
      />
      {/* Post base plate */}
      <rect
        x={postX - postW * 0.65}
        y={y - 5 * scale}
        width={postW * 2.3}
        height={5 * scale}
        fill="#3a3e48"
        rx={2}
      />
      {/* Bolt details */}
      <circle cx={postX + postW * 0.5} cy={postY + postH * 0.28} r={postW * 0.14} fill="#1a1d22" />
      <circle cx={postX + postW * 0.5} cy={postY + postH * 0.72} r={postW * 0.14} fill="#1a1d22" />

      {/* Status LED */}
      <circle cx={lightCX} cy={lightCY} r={lightR * 2.0} fill={lightCol} opacity={0.08} />
      <circle cx={lightCX} cy={lightCY} r={lightR}       fill={lightCol} opacity={0.75} />
      <circle cx={lightCX - lightR * 0.28} cy={lightCY - lightR * 0.28} r={lightR * 0.32} fill="white" opacity={0.45} />

      {/* ── Gate arm — CSS transition for reliable SVG animation ─────────── */}
      <g
        style={{
          transform: `translate(${pivotX}px, ${pivotY}px) rotate(${armAngle}deg)`,
          transition: 'transform 0.85s cubic-bezier(0.4, 0, 0.2, 1)',
          transformOrigin: '0 0',
        }}
      >
        {/* Arm body — white parking barrier */}
        <rect
          x={-armLen}
          y={-armThick / 2}
          width={armLen}
          height={armThick}
          fill="#f0f0f0"
          rx={armThick * 0.4}
        />
        {/* Red diagonal safety stripes */}
        {stripes.map((s, i) => (
          <rect
            key={i}
            x={s.relX}
            y={-armThick / 2}
            width={s.w}
            height={armThick}
            fill="#cc2222"
            opacity={0.80}
            rx={armThick * 0.3}
          />
        ))}
        {/* Arm tip reflector */}
        <circle cx={-armLen} cy={0} r={armThick * 0.95} fill="white"    opacity={0.90} />
        <circle cx={-armLen} cy={0} r={armThick * 0.45} fill={lightCol} opacity={0.65} />
      </g>

      {/* Pivot cap (static, on top of arm) */}
      <circle cx={pivotX} cy={pivotY} r={armThick * 1.0} fill="#4a5060" />
    </g>
  );
}

// ── Motion path debug overlay ─────────────────────────────────────────────────
function MotionPathDebugOverlay({
  placement,
  vehicleT,
}: {
  placement: DetectorPlacement;
  vehicleT:  number;
}) {
  const pts = getMotionPathDebugPoints(placement);
  const { y: curY } = getDepthValues(vehicleT);
  const curX = getViewAwareX(vehicleT, placement);

  function dotColor(label: string) {
    if (label === 'READ')  return '#00ffcc';
    if (label === 'GATE')  return '#ff4444';
    if (label === 'EXIT')  return '#ffffff';
    if (label === 'FAR')   return '#88aaff';
    if (label === 'SPAWN') return '#ffff44';
    return '#f5a623';
  }

  return (
    <g>
      {pts.map((p, i) => {
        if (i === 0) return null;
        const prev = pts[i - 1];
        return (
          <line key={i}
            x1={prev.x} y1={prev.y}
            x2={p.x}    y2={p.y}
            stroke="#f5a623" strokeWidth={1.2}
            strokeDasharray="5 3" opacity={0.55}
          />
        );
      })}

      {pts.map((p, i) => {
        const r    = p.label ? 5 : 2.5;
        const fill = dotColor(p.label);
        const labelLeft = p.label === 'FAR' || p.label === 'READ';
        return (
          <g key={i}>
            {p.label && <circle cx={p.x} cy={p.y} r={r + 3} fill={fill} opacity={0.15} />}
            <circle cx={p.x} cy={p.y} r={r} fill={fill} opacity={0.85} />
            {p.label && (
              <text
                x={p.x + (labelLeft ? -55 : 8)}
                y={p.y - 4}
                fill={fill} fontSize={9} fontFamily="monospace" fontWeight="700" opacity={0.9}
              >
                {p.label} t={p.t.toFixed(2)}
              </text>
            )}
          </g>
        );
      })}

      <circle cx={curX} cy={curY} r={7}   fill="#ff00ff" opacity={0.20} />
      <circle cx={curX} cy={curY} r={4}   fill="#ff00ff" opacity={0.90} />
      <circle cx={curX} cy={curY} r={1.5} fill="white"   opacity={0.95} />

      <rect x={8} y={154} width={240} height={15} fill="rgba(0,0,0,0.60)" rx={2} />
      <text x={12} y={165}
        fill="#f5a623" fontSize={9} fontFamily="monospace" fontWeight="700">
        {'MOTION PATH ▸ '}{placement}{'  t='}{vehicleT.toFixed(3)}
      </text>
    </g>
  );
}

// ── Main renderer ─────────────────────────────────────────────────────────────
export function AssetRealisticRenderer({
  config,
  vehicleT,
  vehicleDepth,
  gateDepth,
  gateOpen,
  vehicleBehindGate,
  showAnchorOverlay = false,
  showMotionPathOverlay = false,
}: SceneRendererProps) {
  const sceneVariant = getSceneVariant(config.detectorPlacement);

  const vehicle = (
    <VehicleAssetLayer
      config={config}
      vehicleT={vehicleT}
      vehicleDepth={vehicleDepth}
      showAnchorOverlay={showAnchorOverlay}
    />
  );

  const gate = (
    <AssetGate
      gateDepth={gateDepth}
      gateOpen={gateOpen}
      gateMode={config.gateMode}
    />
  );

  return (
    <>
      {/* ── Shared SVG defs ─────────────────────────────────────────────────── */}
      {/*    Referenced by all scene components via url(#arAsphalt) etc.       */}
      <defs>
        {/* Road surface texture — horizontal micro-lines */}
        <pattern id="arAsphalt" x="0" y="0" width="60" height="1" patternUnits="userSpaceOnUse">
          <rect width="60" height="1" fill="transparent" />
          <rect y="0" width="60" height="0.4" fill="rgba(255,255,255,0.012)" />
        </pattern>

        {/* Radial vignette overlay */}
        <radialGradient id="arVignette" cx="50%" cy="50%" r="70%">
          <stop offset="0%"   stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.52)" />
        </radialGradient>
      </defs>

      {/* ── Scene background ────────────────────────────────────────────────── */}
      {sceneVariant === 'center_front'    && <CenterFrontScene    />}
      {sceneVariant === 'center_back'     && <CenterBackScene     />}
      {sceneVariant === 'driver_front'    && <DriverFrontScene    />}
      {sceneVariant === 'passenger_front' && <PassengerFrontScene />}
      {sceneVariant === 'driver_back'     && <DriverBackScene     />}
      {sceneVariant === 'passenger_back'  && <PassengerBackScene  />}

      {/* ── Z-ordered gate + vehicle ────────────────────────────────────────── */}
      {vehicleBehindGate
        ? <>{vehicle}{gate}</>
        : <>{gate}{vehicle}</>
      }

      {/* ── Vignette ────────────────────────────────────────────────────────── */}
      <rect x={0} y={0} width={SCENE_W} height={SCENE_H}
            fill="url(#arVignette)" pointerEvents="none" />

      {/* ── Motion path debug overlay (QA only) ─────────────────────────────── */}
      {showMotionPathOverlay && (
        <MotionPathDebugOverlay
          placement={config.detectorPlacement}
          vehicleT={vehicleT}
        />
      )}
    </>
  );
}
