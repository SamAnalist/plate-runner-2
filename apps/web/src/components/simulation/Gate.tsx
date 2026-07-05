import { motion } from 'framer-motion';
import type { GateMode } from '@plate-runner/shared';
import type { DepthValues } from '../../utils/depth';

interface GateProps {
  gateDepth: DepthValues;
  gateOpen: boolean;
  gateMode: GateMode;
}

export function Gate({ gateDepth, gateOpen, gateMode }: GateProps) {
  // 'hidden' suppresses the gate entirely
  if (gateMode === 'hidden') return null;

  const { roadRight, roadWidth, y, scale } = gateDepth;

  // ── Post dimensions (scale with perspective) ──────────────────────────────
  const postW  = Math.max(5, roadWidth * 0.032);
  const postH  = Math.max(28, 88 * scale);
  const postX  = roadRight - postW;
  const postY  = y - postH;

  // ── Arm (pivots at right end, extends left when closed) ───────────────────
  const armLen   = roadWidth * 0.90;
  const armThick = Math.max(3, roadWidth * 0.020);

  // Pivot point: top-right of post
  const pivotX = postX + postW / 2;
  const pivotY = postY + postH * 0.14;

  // Arm origin (left tip) when in natural (horizontal) position
  const armTipX = pivotX - armLen;

  // Rotation: 0° = closed (horizontal), −76° = open (arm nearly vertical)
  const armAngle = gateOpen ? -76 : 0;

  // ── Status light ──────────────────────────────────────────────────────────
  const lightR    = Math.max(2.5, postW * 0.42);
  const lightCX   = postX + postW / 2;
  const lightCY   = postY + postH * 0.10;
  // Soft indicator — camera-friendly (no neon bleed)
  const lightColor = gateOpen ? '#4ade80' : '#f87171';

  // ── Stripes on arm (safety reflective bands) ─────────────────────────────
  const numStripes = 5;
  const stripes = Array.from({ length: numStripes }, (_, i) => ({
    x: armTipX + armLen * (0.12 + i * 0.17),
    w: armLen * 0.056,
  }));

  return (
    <g>
      {/* ── Post shadow on road ───────────────────────────────────────────── */}
      <ellipse
        cx={postX + postW / 2}
        cy={y + 1}
        rx={postW * 2.2}
        ry={3.5 * scale}
        fill="rgba(0,0,0,0.35)"
      />

      {/* ── Post ─────────────────────────────────────────────────────────── */}
      <rect
        x={postX}
        y={postY}
        width={postW}
        height={postH}
        fill="#3d4555"
        rx={postW * 0.22}
        ry={postW * 0.22}
      />
      {/* Post edge highlight */}
      <rect
        x={postX + postW * 0.15}
        y={postY + postH * 0.04}
        width={postW * 0.22}
        height={postH * 0.78}
        fill="rgba(255,255,255,0.08)"
        rx={postW * 0.1}
      />

      {/* Post base plate */}
      <rect
        x={postX - postW * 0.6}
        y={y - 5 * scale}
        width={postW * 2.2}
        height={5 * scale}
        fill="#555e6e"
        rx={2}
      />

      {/* ── Status LED on post ───────────────────────────────────────────── */}
      <circle cx={lightCX} cy={lightCY} r={lightR * 1.5} fill={lightColor} opacity={0.18} />
      <circle cx={lightCX} cy={lightCY} r={lightR}       fill={lightColor} opacity={0.92} />
      <circle
        cx={lightCX - lightR * 0.28}
        cy={lightCY - lightR * 0.28}
        r={lightR * 0.35}
        fill="white"
        opacity={0.55}
      />

      {/* ── Parking arm (Framer Motion for smooth rotation) ─────────────── */}
      <motion.g
        style={{
          transformOrigin: `${pivotX}px ${pivotY}px`,
        }}
        animate={{ rotate: armAngle }}
        transition={{ duration: 0.85, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Arm body — white parking barrier */}
        <rect
          x={armTipX}
          y={pivotY - armThick / 2}
          width={armLen}
          height={armThick}
          fill="#f0f0f0"
          rx={armThick * 0.4}
        />

        {/* Red safety stripes */}
        {stripes.map((s, i) => (
          <rect
            key={i}
            x={s.x}
            y={pivotY - armThick / 2}
            width={s.w}
            height={armThick}
            fill="#cc2222"
            opacity={0.80}
            rx={armThick * 0.3}
          />
        ))}

        {/* Arm tip cap (reflective bulb) */}
        <circle
          cx={armTipX}
          cy={pivotY}
          r={armThick * 0.9}
          fill="white"
          opacity={0.85}
        />
        <circle
          cx={armTipX}
          cy={pivotY}
          r={armThick * 0.45}
          fill={gateOpen ? '#22c55e' : '#ef4444'}
          opacity={0.7}
        />
      </motion.g>

      {/* ── Pivot cap (covers arm attachment to post) ────────────────────── */}
      <circle
        cx={pivotX}
        cy={pivotY}
        r={armThick * 0.95}
        fill="#5a6378"
      />
    </g>
  );
}
