import type { FocusZoneConfig } from '@plate-runner/shared';
import type { PlateReadability } from '../../utils/depth';
import { SCENE_W, SCENE_H } from '../../utils/depth';

interface FocusZoneOverlayProps {
  focusZone: FocusZoneConfig;
  /** When true, show coordinate labels and readability info */
  showDebug?: boolean;
  /** Current plate readability result (optional, shown in debug) */
  plateReadability?: PlateReadability;
}

export function FocusZoneOverlay({
  focusZone,
  showDebug = false,
  plateReadability,
}: FocusZoneOverlayProps) {
  if (!focusZone.enabled || !focusZone.showOverlay) return null;

  // Convert percent to scene coordinates
  const x = (focusZone.xPercent / 100) * SCENE_W;
  const y = (focusZone.yPercent / 100) * SCENE_H;
  const w = (focusZone.widthPercent / 100) * SCENE_W;
  const h = (focusZone.heightPercent / 100) * SCENE_H;

  const c = focusZone.borderColor;

  // Corner bracket length = 12% of the shorter side
  const bl = Math.min(w, h) * 0.12;
  const bw = 1.5; // bracket stroke width

  // Readability color
  const readColor =
    plateReadability?.readability === 'good'    ? '#4ade80' :
    plateReadability?.readability === 'partial' ? '#fbbf24' :
    plateReadability?.readability === 'poor'    ? '#f87171' :
    'transparent';

  return (
    <g pointerEvents="none">
      {/* ── Dim fill inside zone (very subtle) ──────────────────────────── */}
      <rect
        x={x} y={y} width={w} height={h}
        fill={c}
        fillOpacity={0.04}
      />

      {/* ── Dashed border ────────────────────────────────────────────────── */}
      <rect
        x={x} y={y} width={w} height={h}
        fill="none"
        stroke={c}
        strokeWidth={1}
        strokeOpacity={0.55}
        strokeDasharray="6 4"
      />

      {/* ── Corner brackets ──────────────────────────────────────────────── */}
      {/* Top-left */}
      <path d={`M${x},${y + bl} L${x},${y} L${x + bl},${y}`}
        fill="none" stroke={c} strokeWidth={bw} strokeOpacity={0.9} />
      {/* Top-right */}
      <path d={`M${x + w - bl},${y} L${x + w},${y} L${x + w},${y + bl}`}
        fill="none" stroke={c} strokeWidth={bw} strokeOpacity={0.9} />
      {/* Bottom-left */}
      <path d={`M${x},${y + h - bl} L${x},${y + h} L${x + bl},${y + h}`}
        fill="none" stroke={c} strokeWidth={bw} strokeOpacity={0.9} />
      {/* Bottom-right */}
      <path d={`M${x + w - bl},${y + h} L${x + w},${y + h} L${x + w},${y + h - bl}`}
        fill="none" stroke={c} strokeWidth={bw} strokeOpacity={0.9} />

      {/* ── Zone label ───────────────────────────────────────────────────── */}
      <text
        x={x + 5}
        y={y - 5}
        fontSize={8}
        fontFamily='"JetBrains Mono", monospace'
        fontWeight="600"
        fill={c}
        fillOpacity={0.75}
        letterSpacing="0.08em"
      >
        {focusZone.label || 'CAMERA FOCUS'}
      </text>

      {/* ── Readability badge (shown when debug or when plate is in zone) ── */}
      {plateReadability && (
        <>
          <rect
            x={x + w - 58}
            y={y - 16}
            width={58}
            height={13}
            rx={2}
            fill={readColor}
            fillOpacity={0.18}
          />
          <text
            x={x + w - 4}
            y={y - 6}
            textAnchor="end"
            fontSize={8}
            fontFamily='"JetBrains Mono", monospace'
            fontWeight="700"
            fill={readColor}
            fillOpacity={0.9}
            letterSpacing="0.06em"
          >
            {plateReadability.inZone
              ? `IN ZONE ${plateReadability.overlapPercent}%`
              : 'OUT OF ZONE'}
          </text>
        </>
      )}

      {/* ── Debug: coordinate labels ─────────────────────────────────────── */}
      {showDebug && (
        <>
          <text
            x={x + 4} y={y + h - 5}
            fontSize={7}
            fontFamily='"JetBrains Mono", monospace'
            fill={c}
            fillOpacity={0.6}
          >
            {`(${focusZone.xPercent}%,${focusZone.yPercent}%) ${focusZone.widthPercent}×${focusZone.heightPercent}%`}
          </text>
          <text
            x={x + 4} y={y + h - 14}
            fontSize={7}
            fontFamily='"JetBrains Mono", monospace'
            fill={c}
            fillOpacity={0.6}
          >
            {`scene: (${Math.round(x)},${Math.round(y)}) ${Math.round(w)}×${Math.round(h)}px`}
          </text>
        </>
      )}
    </g>
  );
}
