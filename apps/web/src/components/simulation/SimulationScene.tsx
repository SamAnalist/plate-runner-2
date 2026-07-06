import { useMemo } from 'react';
import type { SimulationConfig } from '@plate-runner/shared';
import type { SimulationControls } from '../../hooks/useSimulation';
import { DebugOverlay } from './DebugOverlay';
import {
  SCENE_W,
  SCENE_H,
  VP_X,
  VP_Y,
  GATE_T,
  GATE_T_BACK,
  getDepthValues,
} from '../../utils/depth';
import { AssetRealisticRenderer } from './renderers/asset-realistic/AssetRealisticRenderer';
import type { SceneRendererProps } from './renderers/asset-realistic/rendererProps';

interface Props {
  config: SimulationConfig;
  simulation: SimulationControls;
  showDebug?: boolean;
  /** Camera mode: suppress status overlays and debug for a clean capture image */
  cameraMode?: boolean;
  /** Visual QA: show plate anchor bounding rect overlay */
  showAnchorOverlay?: boolean;
  /** Visual QA: show motion path curve + key points overlay */
  showMotionPathOverlay?: boolean;
}

export function SimulationScene({
  config,
  simulation,
  showDebug = false,
  cameraMode = false,
  showAnchorOverlay = false,
  showMotionPathOverlay = false,
}: Props) {
  const { state } = simulation;
  const { vehicleT, gateOpen, phase } = state;

  const activeGateT  = config.direction === 'away' ? GATE_T_BACK : GATE_T;
  const gateDepth    = useMemo(() => getDepthValues(activeGateT), [activeGateT]);
  const vehicleDepth = getDepthValues(vehicleT);

  // Z-ordering: vehicle behind gate (farther from camera) → draw first
  const vehicleBehindGate = vehicleT < activeGateT;

  const rendererProps: SceneRendererProps = {
    config,
    vehicleT,
    vehicleDepth,
    gateDepth,
    gateOpen,
    phase,
    vehicleBehindGate,
    // QA overlays are suppressed in camera mode regardless of caller intent
    showAnchorOverlay:     !cameraMode && showAnchorOverlay,
    showMotionPathOverlay: !cameraMode && showMotionPathOverlay,
  };

  const isGateOpening = phase === 'gate_opening';

  return (
    <div
      className="relative w-full rounded-lg overflow-hidden border border-white/10 shadow-2xl"
      style={{ aspectRatio: `${SCENE_W}/${SCENE_H}`, maxWidth: '100%' }}
    >
      {/* ── SVG Scene ─────────────────────────────────────────────────────── */}
      <svg
        viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}
      >
        <AssetRealisticRenderer {...rendererProps} />

        {/* Status overlays (hidden in camera mode) */}
        {!cameraMode && phase === 'idle' && (
          <text x={VP_X} y={VP_Y - 18} textAnchor="middle"
            fill="rgba(255,255,255,0.25)" fontSize={11}
            fontFamily='"JetBrains Mono", monospace' fontWeight="600" letterSpacing="0.12em">
            READY — PRESS START
          </text>
        )}

        {!cameraMode && phase === 'waiting_for_signal' && (
          <>
            <rect x={VP_X - 110} y={VP_Y - 36} width={220} height={24} rx={4}
                  fill="rgba(234,179,8,0.15)" stroke="rgba(234,179,8,0.5)" strokeWidth={1} />
            <text x={VP_X} y={VP_Y - 20} textAnchor="middle"
              fill="#fbbf24" fontSize={11}
              fontFamily='"JetBrains Mono", monospace' fontWeight="700" letterSpacing="0.10em">
              WAITING FOR SIGNAL
            </text>
          </>
        )}

        {!cameraMode && phase === 'stopped_at_gate' && (
          <>
            <rect x={VP_X - 90} y={VP_Y - 36} width={180} height={24} rx={4}
                  fill="rgba(251,146,60,0.12)" stroke="rgba(251,146,60,0.4)" strokeWidth={1} />
            <text x={VP_X} y={VP_Y - 20} textAnchor="middle"
              fill="#fb923c" fontSize={11}
              fontFamily='"JetBrains Mono", monospace' fontWeight="700" letterSpacing="0.10em">
              STOPPED AT GATE
            </text>
          </>
        )}

        {!cameraMode && isGateOpening && (
          <>
            <rect x={VP_X - 80} y={VP_Y - 36} width={160} height={24} rx={4}
                  fill="rgba(34,211,238,0.10)" stroke="rgba(34,211,238,0.35)" strokeWidth={1} />
            <text x={VP_X} y={VP_Y - 20} textAnchor="middle"
              fill="#22d3ee" fontSize={11}
              fontFamily='"JetBrains Mono", monospace' fontWeight="700" letterSpacing="0.10em">
              GATE OPENING
            </text>
          </>
        )}

        {!cameraMode && phase === 'done' && (
          <>
            <rect x={VP_X - 100} y={VP_Y - 36} width={200} height={24} rx={4}
                  fill="rgba(34,197,94,0.12)" stroke="rgba(34,197,94,0.4)" strokeWidth={1} />
            <text x={VP_X} y={VP_Y - 20} textAnchor="middle"
              fill="#4ade80" fontSize={11}
              fontFamily='"JetBrains Mono", monospace' fontWeight="700" letterSpacing="0.10em">
              VEHICLE PASSED
            </text>
          </>
        )}


      </svg>

      {/* ── HTML Debug overlay (not visible in camera mode) ─────────────── */}
      {!cameraMode && showDebug && (
        <DebugOverlay
          phase={phase}
          vehicleT={vehicleT}
          gateOpen={gateOpen}
          config={config}
        />
      )}
    </div>
  );
}
