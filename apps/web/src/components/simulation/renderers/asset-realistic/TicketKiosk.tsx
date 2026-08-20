/**
 * TicketKiosk — small decorative self-service ticket kiosk, rendered next
 * to the gate in "center"/diagonal scenes. Purely visual (no plate/detector
 * logic).
 *
 * Computes its road-edge position from a `road` geometry (far/near left+right
 * edges) — defaults to the shared "center" scene road formula
 * (CenterFrontScene.tsx / CenterBackScene.tsx). Scenes with a different road
 * (e.g. driver_front / passenger_back's diagonal lane — see DIAGONAL_ROAD
 * below) must pass their own `road` prop, matching that scene's own
 * RL_FAR/RR_FAR/RL_NEAR/RR_NEAR constants exactly (check the scene .tsx
 * file's actual code, not just its header comment — some have drifted out
 * of sync).
 *
 * WHERE TO MOVE IT (X/Y):
 *   - `t` (0 = far/horizon, 1 = near/bottom of frame) is the main knob —
 *     it drives BOTH the Y position (depth on the road) and the scale
 *     (perspective size), same convention as vehicleT/gateT elsewhere.
 *     Pick a `t` close to that scene's gate.t (see the scene's
 *     `*.config.ts` in ../scene-configs/) so it visually sits near the gate.
 *   - `side` ('left' | 'right') picks which side of the road it stands on —
 *     match the gate's side (`armDirection` in that scene's config: the
 *     gate POST is on the side opposite `armDirection`, since the arm
 *     swings from the post across the road).
 *   - `marginPx` nudges it further from the road edge (positive = further
 *     out onto the shoulder) without changing depth/scale.
 *   - `scaleMultiplier` — grows/shrinks the kiosk WITHOUT moving it, for
 *     when the `t` picked for X/Y placement makes the perspective size look
 *     too small/large for that spot (e.g. a shallow `t` chosen to sit it
 *     further back still reads as too tiny). Default 1 = pure perspective
 *     scale off `t`, no boost.
 *   - `road` — only needed for non-"center" scenes, see above.
 *   - Where it's actually placed in the scene is decided by AssetRealisticRenderer.tsx
 *     (which scenes render it, and whether it's before or after the gate in
 *     the JSX — that ordering is what controls front/behind the gate arm).
 *   - Proportions (screen size, slot size, canopy, etc.) are the multipliers
 *     of KIOSK_W/KIOSK_H below, in the shapes themselves — tweak those
 *     directly for a different shape.
 */
import { SCENE_W, SCENE_H, VP_X, VP_Y, lerp } from '../../../../utils/depth';

export interface KioskRoadGeometry {
  lFar: number;
  rFar: number;
  lNear: number;
  rNear: number;
}

/** Default: the shared road formula used by CenterFrontScene / CenterBackScene. */
const CENTER_ROAD: KioskRoadGeometry = {
  lFar:  VP_X - 10,
  rFar:  VP_X + 10,
  lNear: SCENE_W * 0.175,
  rNear: SCENE_W * 0.825,
};

/**
 * The diagonal-lane road shared by driver_front and passenger_back — see
 * DriverFrontScene.tsx / PassengerBackScene.tsx's actual RL_FAR/RR_FAR/
 * RL_NEAR/RR_NEAR constants (not their header comments, which have drifted).
 */
export const DIAGONAL_ROAD: KioskRoadGeometry = {
  lFar:  VP_X + 300,   // 700
  rFar:  VP_X + 580,   // 980
  lNear: SCENE_W * 0.125, // 100
  rNear: SCENE_W * 0.830, // 664
};

/**
 * Horizontal mirror of DIAGONAL_ROAD, used by passenger_front (and any other
 * scene built as a true left/right mirror of driver_front) — see
 * PassengerFrontScene.tsx's RL_FAR/RR_FAR/RL_NEAR/RR_NEAR constants.
 */
export const MIRRORED_DIAGONAL_ROAD: KioskRoadGeometry = {
  lFar:  VP_X - 580,   // -180
  rFar:  VP_X - 300,   // 100
  lNear: SCENE_W * 0.170, // 136
  rNear: SCENE_W * 0.875, // 700
};

/**
 * What the kiosk screen shows, in sequence over one run:
 *   hello   — vehicle hasn't reached the gate yet (idle, or approaching).
 *   reading — vehicle stopped at the gate (stopped_at_gate / waiting_for_signal).
 *   welcome — gate is opening, or vehicle has resumed past the gate.
 *   check   — run complete (phase === 'done').
 * Compute this in AssetRealisticRenderer (it has phase + gate-crossing info)
 * and pass the result down — TicketKiosk itself has no simulation knowledge.
 */
export type KioskIcon = 'hello' | 'reading' | 'welcome' | 'check';

export interface TicketKioskProps {
  /** Depth position (0 = far/horizon, 1 = near/bottom of frame). Drives both Y and scale. */
  t?: number;
  /** Which side of the road it stands on. Match the gate post's side. */
  side?: 'left' | 'right';
  /** Extra horizontal offset (px), positive = further out onto the shoulder. */
  marginPx?: number;
  /** What the screen shows — see KioskIcon. Default 'hello'. */
  icon?: KioskIcon;
  /** Road geometry to position against — defaults to the "center" scene road. Use DIAGONAL_ROAD for driver_front/passenger_back. */
  road?: KioskRoadGeometry;
  /** Multiplies the perspective scale `t` produces, without touching position (x/yBase are unaffected — only w/h and everything derived from them grow/shrink). Use when a `t` chosen for X/Y placement makes the kiosk read too small/large for that spot. Default 1 = pure perspective scale, no boost. */
  scaleMultiplier?: number;
}

const ICON_WASH: Record<KioskIcon, string> = {
  hello:   '#25597a',
  reading: '#8a6a1a',
  welcome: '#1a5f6b',
  check:   '#1a5c34',
};

const ICON_COLOR: Record<KioskIcon, string> = {
  hello:   '#8fb8d8',
  reading: '#fbbf24',
  welcome: '#22d3ee',
  check:   '#4ade80',
};

/** Shrinks all icon glyphs uniformly without touching the kiosk body/screen. */
const ICON_SCALE = 0.75;

export function TicketKiosk({ t = 0.42, side = 'left', marginPx = 0, icon = 'hello', road = CENTER_ROAD, scaleMultiplier = 1 }: TicketKioskProps) {
  const scale  = lerp(0.04, 1.0, Math.pow(t, 0.8)) * scaleMultiplier;
  const roadL  = lerp(road.lFar, road.lNear, t);
  const roadR  = lerp(road.rFar, road.rNear, t);
  const yBase  = lerp(VP_Y, SCENE_H, t);

  const w = Math.max(14, 60  * scale);
  const h = Math.max(38, 165 * scale);
  const x = side === 'left'
    ? roadL - w * 1.15 - marginPx
    : roadR + w * 0.15 + marginPx;

  // Center of the screen wash rect (x + w*0.20, yBase - h*0.80, w*0.60 x h*0.28).
  const iconCx = x + w * 0.5;
  const iconCy = yBase - h * 0.66;

  return (
    <g>
      {/* Ground shadow */}
      <ellipse cx={x + w / 2} cy={yBase + 1}
                rx={w * 0.9} ry={h * 0.045} fill="rgba(0,0,0,0.35)" />

      {/* Body */}
      <rect x={x} y={yBase - h} width={w} height={h}
            rx={w * 0.12} fill="#23262c" stroke="rgba(255,255,255,0.08)" strokeWidth={0.8} />

      {/* Canopy cap */}
      <rect x={x - w * 0.08} y={yBase - h - h * 0.05}
            width={w * 1.16} height={h * 0.07}
            rx={w * 0.10} fill="#3a3e48" />

      {/* Screen */}
      <rect x={x + w * 0.14} y={yBase - h * 0.86}
            width={w * 0.72} height={h * 0.40}
            rx={w * 0.06} fill="#161a22" stroke="rgba(120,170,255,0.18)" strokeWidth={0.6} />
      {/* Screen wash — color follows the icon (same palette as the phase
          badges: amber=waiting, cyan=gate opening, green=done). */}
      <rect x={x + w * 0.20} y={yBase - h * 0.80}
            width={w * 0.60} height={h * 0.28}
            fill={ICON_WASH[icon]} opacity={icon === 'hello' ? 0.35 : 0.45} />

      {icon === 'hello' && (
        <g stroke={ICON_COLOR.hello} fill="none" strokeWidth={Math.max(0.5, w * 0.011)} opacity={0.9}>
          {/* Smiley face — "not at the gate yet" idle greeting */}
          <circle cx={iconCx} cy={iconCy} r={h * ICON_SCALE * 0.11} />
          <circle cx={iconCx - h * ICON_SCALE * 0.045} cy={iconCy - h * ICON_SCALE * 0.02} r={Math.max(0.4, h * ICON_SCALE * 0.014)} fill={ICON_COLOR.hello} stroke="none" />
          <circle cx={iconCx + h * ICON_SCALE * 0.045} cy={iconCy - h * ICON_SCALE * 0.02} r={Math.max(0.4, h * ICON_SCALE * 0.014)} fill={ICON_COLOR.hello} stroke="none" />
          <path d={`M ${iconCx - h * ICON_SCALE * 0.05} ${iconCy + h * ICON_SCALE * 0.03} Q ${iconCx} ${iconCy + h * ICON_SCALE * 0.075} ${iconCx + h * ICON_SCALE * 0.05} ${iconCy + h * ICON_SCALE * 0.03}`}
                strokeLinecap="round" />
        </g>
      )}

      {icon === 'reading' && (
        <g stroke={ICON_COLOR.reading} fill="none" strokeLinecap="round">
          {/* Magnifying glass — plate/vehicle being scanned at the gate */}
          <circle cx={iconCx - h * ICON_SCALE * 0.03} cy={iconCy - h * ICON_SCALE * 0.02} r={h * ICON_SCALE * 0.09} strokeWidth={Math.max(0.5, w * 0.012)} />
          <line x1={iconCx + h * ICON_SCALE * 0.035} y1={iconCy + h * ICON_SCALE * 0.045}
                x2={iconCx + h * ICON_SCALE * 0.10}  y2={iconCy + h * ICON_SCALE * 0.10}
                strokeWidth={Math.max(0.7, w * 0.015)} />
        </g>
      )}

      {icon === 'welcome' && (
        <path
          d={`M ${iconCx} ${iconCy - h * ICON_SCALE * 0.10}
              L ${iconCx + h * ICON_SCALE * 0.03} ${iconCy - h * ICON_SCALE * 0.03}
              L ${iconCx + h * ICON_SCALE * 0.10} ${iconCy}
              L ${iconCx + h * ICON_SCALE * 0.03} ${iconCy + h * ICON_SCALE * 0.03}
              L ${iconCx} ${iconCy + h * ICON_SCALE * 0.10}
              L ${iconCx - h * ICON_SCALE * 0.03} ${iconCy + h * ICON_SCALE * 0.03}
              L ${iconCx - h * ICON_SCALE * 0.10} ${iconCy}
              L ${iconCx - h * ICON_SCALE * 0.03} ${iconCy - h * ICON_SCALE * 0.03} Z`}
          fill={ICON_COLOR.welcome}
          opacity={0.85}
        />
      )}

      {icon === 'check' && (
        <path
          d={`M ${iconCx - w * ICON_SCALE * 0.16} ${iconCy}
              L ${iconCx - w * ICON_SCALE * 0.04} ${iconCy + h * ICON_SCALE * 0.045}
              L ${iconCx + w * ICON_SCALE * 0.18} ${iconCy - h * ICON_SCALE * 0.045}`}
          fill="none"
          stroke={ICON_COLOR.check}
          strokeWidth={Math.max(0.9, w * 0.045)}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Ticket/card slot */}
      <rect x={x + w * 0.28} y={yBase - h * 0.40}
            width={w * 0.44} height={h * 0.07}
            rx={w * 0.02} fill="#8a2020" opacity={0.85} />

      {/* Status LED */}
      {/* <circle cx={x + w * 0.5} cy={yBase - h - h * 0.10}
              r={Math.max(1, w * 0.07)} fill="#4ade80" opacity={0.9} /> */}
    </g>
  );
}
