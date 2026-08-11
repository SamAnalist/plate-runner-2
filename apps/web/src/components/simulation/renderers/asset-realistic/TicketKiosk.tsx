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

export interface TicketKioskProps {
  /** Depth position (0 = far/horizon, 1 = near/bottom of frame). Drives both Y and scale. */
  t?: number;
  /** Which side of the road it stands on. Match the gate post's side. */
  side?: 'left' | 'right';
  /** Extra horizontal offset (px), positive = further out onto the shoulder. */
  marginPx?: number;
  /** When true, the screen shows a green checkmark instead of the idle glow — pass `phase === 'done'`. */
  success?: boolean;
  /** Road geometry to position against — defaults to the "center" scene road. Use DIAGONAL_ROAD for driver_front/passenger_back. */
  road?: KioskRoadGeometry;
}

export function TicketKiosk({ t = 0.42, side = 'left', marginPx = 0, success = false, road = CENTER_ROAD }: TicketKioskProps) {
  const scale  = lerp(0.04, 1.0, Math.pow(t, 0.8));
  const roadL  = lerp(road.lFar, road.lNear, t);
  const roadR  = lerp(road.rFar, road.rNear, t);
  const yBase  = lerp(VP_Y, SCENE_H, t);

  const w = Math.max(14, 60  * scale);
  const h = Math.max(38, 165 * scale);
  const x = side === 'left'
    ? roadL - w * 1.15 - marginPx
    : roadR + w * 0.15 + marginPx;

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
      {success ? (
        <>
          {/* Success wash — green, replaces the idle blue glow */}
          <rect x={x + w * 0.20} y={yBase - h * 0.80}
                width={w * 0.60} height={h * 0.28}
                fill="#1a5c34" opacity={0.45} />
          {/* Checkmark */}
          <path
            d={`M ${x + w * 0.34} ${yBase - h * 0.655}
                L ${x + w * 0.46} ${yBase - h * 0.60}
                L ${x + w * 0.68} ${yBase - h * 0.72}`}
            fill="none"
            stroke="#4ade80"
            strokeWidth={Math.max(1, w * 0.055)}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <rect x={x + w * 0.20} y={yBase - h * 0.80}
              width={w * 0.60} height={h * 0.28}
              fill="#25597a" opacity={0.35} />
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
