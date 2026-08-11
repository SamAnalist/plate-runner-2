import { useMemo } from 'react';
import type { SimulationConfig } from '@plate-runner/shared';
import type { SimulationControls } from '../../hooks/useSimulation';
import { DebugOverlay } from './DebugOverlay';
import {
  SCENE_W,
  SCENE_H,
  getDepthValues,
} from '../../utils/depth';
import { AssetRealisticRenderer } from './renderers/asset-realistic/AssetRealisticRenderer';
import type { SceneRendererProps } from './renderers/asset-realistic/rendererProps';
import { getSceneConfig }          from './renderers/asset-realistic/scene-configs/getSceneConfig';

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

  const sceneConfig  = getSceneConfig(config.detectorPlacement);
  const activeGateT  = sceneConfig.gate.t;
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
          <text x={SCENE_W - 78} y={21} textAnchor="middle"
            fill="rgba(255,255,255,0.4)" fontSize={8}
            fontFamily='"JetBrains Mono", monospace' fontWeight="600" letterSpacing="0.08em">
            READY — PRESS START
          </text>
        )}

        {!cameraMode && phase === 'waiting_for_signal' && (
          <>
            <rect x={10} y={10} width={132} height={16} rx={3}
                  fill="rgba(234,179,8,0.15)" stroke="rgba(234,179,8,0.5)" strokeWidth={1} />
            <text x={76} y={21} textAnchor="middle"
              fill="#fbbf24" fontSize={8}
              fontFamily='"JetBrains Mono", monospace' fontWeight="700" letterSpacing="0.08em">
              WAITING FOR SIGNAL
            </text>
          </>
        )}

        {!cameraMode && phase === 'stopped_at_gate' && (
          <>
            <rect x={10} y={10} width={104} height={16} rx={3}
                  fill="rgba(251,146,60,0.12)" stroke="rgba(251,146,60,0.4)" strokeWidth={1} />
            <text x={62} y={21} textAnchor="middle"
              fill="#fb923c" fontSize={8}
              fontFamily='"JetBrains Mono", monospace' fontWeight="700" letterSpacing="0.08em">
              STOPPED AT GATE
            </text>
          </>
        )}

        {!cameraMode && isGateOpening && (
          <>
            <rect x={10} y={10} width={104} height={16} rx={3}
                  fill="rgba(34,211,238,0.10)" stroke="rgba(34,211,238,0.35)" strokeWidth={1} />
            <text x={62} y={21} textAnchor="middle"
              fill="#22d3ee" fontSize={8}
              fontFamily='"JetBrains Mono", monospace' fontWeight="700" letterSpacing="0.08em">
              GATE OPENING
            </text>
          </>
        )}

        {!cameraMode && phase === 'done' && (
          <>
            <rect x={10} y={10} width={104} height={16} rx={3}
                  fill="rgba(34,197,94,0.12)" stroke="rgba(34,197,94,0.4)" strokeWidth={1} />
            <text x={62} y={21} textAnchor="middle"
              fill="#4ade80" fontSize={8}
              fontFamily='"JetBrains Mono", monospace' fontWeight="700" letterSpacing="0.08em">
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
