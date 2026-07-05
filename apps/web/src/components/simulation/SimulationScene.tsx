import { useMemo } from 'react';
import type { SimulationConfig, FocusZoneConfig } from '@plate-runner/shared';
import type { SimulationControls } from '../../hooks/useSimulation';
import { FocusZoneOverlay } from './FocusZoneOverlay';
import { DebugOverlay } from './DebugOverlay';
import {
  SCENE_W,
  SCENE_H,
  VP_X,
  VP_Y,
  GATE_T,
  getDepthValues,
  getPlateReadability,
} from '../../utils/depth';
import type { VisualStyle, SceneRendererProps } from './renderers/types';
import { ClassicSvgRenderer } from './renderers/ClassicSvgRenderer';
import { RealisticRenderer } from './renderers/RealisticRenderer';
import { GateCameraRenderer } from './renderers/GateCameraRenderer';
import { OverheadRenderer } from './renderers/OverheadRenderer';
import { CinematicRenderer } from './renderers/CinematicRenderer';
import { AssetRealisticRenderer } from './renderers/asset-realistic/AssetRealisticRenderer';
import type React from 'react';

const RENDERERS: Record<VisualStyle, React.FC<SceneRendererProps>> = {
  classic:            ClassicSvgRenderer,
  realistic:          RealisticRenderer,
  'gate-camera':      GateCameraRenderer,
  overhead:           OverheadRenderer,
  cinematic:          CinematicRenderer,
  'asset-realistic':  AssetRealisticRenderer,
};

interface Props {
  config: SimulationConfig;
  simulation: SimulationControls;
  focusZone: FocusZoneConfig;
  visualStyle?: VisualStyle;
  showDebug?: boolean;
  /** Camera mode: suppress status overlays and debug for a clean capture image */
  cameraMode?: boolean;
  calibrationMode?: boolean;
  /** Visual QA: show anchor bounding rect in asset-realistic renderer */
  showAnchorOverlay?: boolean;
  /** Visual QA: show motion path curve + key points in asset-realistic renderer */
  showMotionPathOverlay?: boolean;
}

export function SimulationScene({
  config,
  simulation,
  focusZone,
  visualStyle = 'classic',
  showDebug = false,
  cameraMode = false,
  calibrationMode = false,
  showAnchorOverlay = false,
  showMotionPathOverlay = false,
}: Props) {
  const { state } = simulation;
  const { vehicleT, gateOpen, phase } = state;

  const gateDepth    = useMemo(() => getDepthValues(GATE_T), []);
  const vehicleDepth = getDepthValues(vehicleT);

  // Z-ordering: vehicle behind gate (farther from camera) → draw first
  const vehicleBehindGate = vehicleT < GATE_T;

  // Plate readability: live-calculated for debug/focus zone display
  const plateReadability = getPlateReadability(vehicleT, config.detectorPlacement, focusZone);

  const ActiveRenderer = RENDERERS[visualStyle];

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
        {/* Active renderer provides background + road + vehicle + gate */}
        <ActiveRenderer {...rendererProps} />

        {/* Focus zone overlay (renderer-agnostic, always on top) */}
        {!cameraMode && (
          <FocusZoneOverlay
            focusZone={focusZone}
            showDebug={showDebug}
            plateReadability={plateReadability}
          />
        )}
        {/* In camera mode: show focus zone only if showOverlay is explicitly on */}
        {cameraMode && focusZone.showOverlay && (
          <FocusZoneOverlay focusZone={focusZone} />
        )}

        {/* Status overlays (hidden in camera mode) */}
        {!cameraMode && phase === 'idle' && (
          <text x={VP_X} y={VP_Y - 18} textAnchor="middle"
            fill="rgba(255,255,255,0.25)" fontSize={11}
            fontFamily='"JetBrains Mono", monospace' fontWeight="600" letterSpacing="0.12em">
            READY — PRESS START
          </text>
        )}

        {!cameraMode && phase === 'at_gate' && (
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

        {!cameraMode && calibrationMode && (
          <text x={VP_X} y={18} textAnchor="middle"
            fill="#22d3ee" fontSize={9}
            fontFamily='"JetBrains Mono", monospace' fontWeight="700" letterSpacing="0.16em"
            opacity={0.8}>
            CALIBRATION MODE
          </text>
        )}
      </svg>

      {/* ── HTML Debug overlay (not visible in camera mode) ─────────────── */}
      {!cameraMode && showDebug && (
        <DebugOverlay
          phase={phase}
          vehicleT={vehicleT}
          gateOpen={gateOpen}
          config={config}
          focusZone={focusZone}
          plateReadability={plateReadability}
          calibrationMode={calibrationMode}
        />
      )}
    </div>
  );
}
