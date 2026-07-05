/**
 * AssetRealisticRenderer — parking garage / access gate environment.
 *
 * Visual character:
 *   • Concrete ceiling / wall above horizon
 *   • Wet asphalt with subtle texture
 *   • Gate arm: yellow/black safety stripe, heavy gunmetal post
 *   • Vehicle: VehicleAssetLayer (raster image + DynamicPlateOverlay)
 *   • Vignette
 *
 * Gate arm animation:
 *   The arm rotates around the pivot point at the top of the post.
 *   Pattern: outer <g transform="translate(pivot)"> + inner <motion.g rotate>
 *   This is reliable across all browsers for SVG CSS transforms (avoids the
 *   transform-origin absolute-px issue with Framer Motion on SVG elements).
 *
 *   Closed:  arm horizontal (0°), blocking the lane.
 *   Open:    arm rotated -80° (pointing nearly straight up).
 *   Transition: 0.85s easeInOut cubic.
 */
import { motion } from 'framer-motion';
import type { SceneRendererProps } from '../types';
import { VehicleAssetLayer } from './VehicleAssetLayer';
import {
  SCENE_W,
  SCENE_H,
  VP_X,
  VP_Y,
  lerp,
} from '../../../../utils/depth';
import {
  getMotionPathDebugPoints,
  getViewAwareX,
} from './viewMotionPaths';
import { getDepthValues } from '../../../../utils/depth';
import type { DetectorPlacement } from '@plate-runner/shared';

// ── Road geometry ──────────────────────────────────────────────────────────
const RL_FAR        = VP_X - 10;
const RR_FAR        = VP_X + 10;
const RL_NEAR       = SCENE_W * 0.175;
const RR_NEAR       = SCENE_W * 0.825;
const SHOULDER_NEAR = 55;
const SHOULDER_FAR  = 5;

// ── Utility ────────────────────────────────────────────────────────────────
function roadPoints(
  lFar: number, rFar: number, yFar: number,
  lNear: number, rNear: number, yNear: number,
): string {
  return `${lFar},${yFar} ${rFar},${yFar} ${rNear},${yNear} ${lNear},${yNear}`;
}

// ── Center dashes ─────────────────────────────────────────────────────────
function buildCenterDashes() {
  return Array.from({ length: 9 }, (_, i) => {
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
}
const CENTER_DASHES = buildCenterDashes();

// ── Gate component ────────────────────────────────────────────────────────
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

  // Arm geometry — pivot is near the top of the post
  const armLen   = roadWidth * 0.88;
  const armThick = Math.max(3.5, roadWidth * 0.022);
  const pivotX   = postX + postW / 2;
  const pivotY   = postY + postH * 0.14;

  // Gate states:
  //   closed  →  arm horizontal (0°)  blocking lane
  //   open    →  arm rotated -80°     pointing nearly straight up
  const armAngle = gateOpen ? -80 : 0;

  const lightR   = Math.max(2.8, postW * 0.40);
  const lightCX  = postX + postW / 2;
  const lightCY  = postY + postH * 0.10;
  const lightCol = gateOpen ? '#22c55e' : '#ef4444';

  // Stripe positions in pivot-local space (arm extends left: x ∈ [-armLen, 0])
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
      <circle cx={lightCX} cy={lightCY} r={lightR * 1.6} fill={lightCol} opacity={0.15} />
      <circle cx={lightCX} cy={lightCY} r={lightR}       fill={lightCol} opacity={0.92} />
      <circle cx={lightCX - lightR * 0.28} cy={lightCY - lightR * 0.28} r={lightR * 0.32} fill="white" opacity={0.55} />

      {/* ── Gate arm ─────────────────────────────────────────────────────── */}
      {/*
       * Rotation pattern (reliable across all browsers for SVG + Framer Motion):
       *   1. Static <g> translates the coordinate origin to the pivot point.
       *   2. <motion.g> rotates around (0,0) = the pivot.
       *   3. All arm geometry is drawn relative to (0,0), arm going LEFT (negative x).
       *
       * This avoids the CSS transform-origin absolute-px ambiguity that can cause
       * Framer Motion rotation to appear wrong on SVG elements in some browsers.
       *)
       */}
      <g transform={`translate(${pivotX}, ${pivotY})`}>
        <motion.g
          animate={{ rotate: armAngle }}
          transition={{ duration: 0.85, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Arm body — yellow, extends left from pivot */}
          <rect
            x={-armLen}
            y={-armThick / 2}
            width={armLen}
            height={armThick}
            fill="#f0b800"
            rx={armThick * 0.5}
          />
          {/* Black diagonal safety stripes */}
          {stripes.map((s, i) => (
            <rect
              key={i}
              x={s.relX}
              y={-armThick / 2}
              width={s.w}
              height={armThick}
              fill="#111"
              opacity={0.55}
              rx={armThick * 0.35}
            />
          ))}
          {/* Arm tip reflector at left end (-armLen, 0) */}
          <circle cx={-armLen} cy={0} r={armThick * 0.95} fill="white"   opacity={0.85} />
          <circle cx={-armLen} cy={0} r={armThick * 0.45} fill={lightCol} opacity={0.70} />
        </motion.g>
      </g>

      {/* Pivot cap (on top of arm, doesn't rotate) */}
      <circle cx={pivotX} cy={pivotY} r={armThick * 1.0} fill="#4a5060" />
    </g>
  );
}

// ── Motion path debug overlay ──────────────────────────────────────────────

/**
 * MotionPathDebugOverlay — QA-only component, renders in scene space.
 *
 * Colour coding:
 *   Yellow dashed line  = full motion path (xFar → xNear)
 *   Orange dot          = sampled path point
 *   Blue dot            = FAR
 *   Cyan dot            = READ
 *   Red dot             = GATE
 *   White dot           = EXIT
 *   Magenta dot         = current vehicle position
 */
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
    if (label === 'READ') return '#00ffcc';
    if (label === 'GATE') return '#ff4444';
    if (label === 'EXIT') return '#ffffff';
    if (label === 'FAR')  return '#88aaff';
    return '#f5a623';
  }

  return (
    <g>
      {/* Path line segments */}
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

      {/* Sampled key points */}
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

      {/* Current vehicle position */}
      <circle cx={curX} cy={curY} r={7}   fill="#ff00ff" opacity={0.20} />
      <circle cx={curX} cy={curY} r={4}   fill="#ff00ff" opacity={0.90} />
      <circle cx={curX} cy={curY} r={1.5} fill="white"   opacity={0.95} />

      {/* Header */}
      <rect x={8} y={154} width={240} height={15} fill="rgba(0,0,0,0.60)" rx={2} />
      <text x={12} y={165}
        fill="#f5a623" fontSize={9} fontFamily="monospace" fontWeight="700">
        {'MOTION PATH ▸ '}{placement}{'  t='}{vehicleT.toFixed(3)}
      </text>
    </g>
  );
}

// ── Main renderer ──────────────────────────────────────────────────────────
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
  const road      = roadPoints(RL_FAR, RR_FAR, VP_Y, RL_NEAR, RR_NEAR, SCENE_H);
  const lShoulder = roadPoints(RL_FAR - SHOULDER_FAR, RL_FAR, VP_Y, RL_NEAR - SHOULDER_NEAR, RL_NEAR, SCENE_H);
  const rShoulder = roadPoints(RR_FAR, RR_FAR + SHOULDER_FAR, VP_Y, RR_NEAR, RR_NEAR + SHOULDER_NEAR, SCENE_H);

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
      <defs>
        {/* Concrete wall gradient */}
        <linearGradient id="arWallGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#1d2126" />
          <stop offset="100%" stopColor="#282c32" />
        </linearGradient>

        {/* Asphalt surface texture */}
        <pattern id="arAsphalt" x="0" y="0" width="60" height="1" patternUnits="userSpaceOnUse">
          <rect width="60" height="1" fill="transparent" />
          <rect y="0" width="60" height="0.4" fill="rgba(255,255,255,0.012)" />
        </pattern>

        {/* Vignette */}
        <radialGradient id="arVignette" cx="50%" cy="50%" r="70%">
          <stop offset="0%"   stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.52)" />
        </radialGradient>

        {/* Ground contact shadow under vehicle */}
        <radialGradient id="arGroundShadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(0,0,0,0.45)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>

      {/* ── Concrete wall / ceiling (above horizon) ── */}
      <rect x={0} y={0} width={SCENE_W} height={VP_Y} fill="url(#arWallGrad)" />
      {[VP_Y - 90, VP_Y - 60, VP_Y - 30].map((wy, i) => (
        <line key={i} x1={0} y1={wy} x2={SCENE_W} y2={wy}
              stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
      ))}

      {/* Utility lighting glows on ceiling */}
      <ellipse cx={SCENE_W * 0.28} cy={0} rx={80} ry={30} fill="#e8d090" opacity={0.04} />
      <ellipse cx={SCENE_W * 0.72} cy={0} rx={80} ry={30} fill="#e8d090" opacity={0.04} />

      {/* ── Dark asphalt ground (below horizon) ── */}
      <rect x={0} y={VP_Y} width={SCENE_W} height={SCENE_H - VP_Y} fill="#171a1e" />
      <line x1={0} y1={VP_Y} x2={SCENE_W} y2={VP_Y} stroke="#34383e" strokeWidth={1.5} opacity={0.7} />

      {/* ── Road ── */}
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

      {/* ── Z-ordered gate + vehicle ── */}
      {vehicleBehindGate
        ? <>{vehicle}{gate}</>
        : <>{gate}{vehicle}</>
      }

      {/* ── Vignette ── */}
      <rect x={0} y={0} width={SCENE_W} height={SCENE_H}
            fill="url(#arVignette)" pointerEvents="none" />

      {/* ── Motion path debug overlay (Visual QA only, hidden in camera mode) ── */}
      {showMotionPathOverlay && (
        <MotionPathDebugOverlay
          placement={config.detectorPlacement}
          vehicleT={vehicleT}
        />
      )}
    </>
  );
}
