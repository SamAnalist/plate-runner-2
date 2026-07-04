import { useMemo } from 'react';
import type { SimulationConfig, FocusZoneConfig } from '@plate-runner/shared';
import type { SimulationControls } from '../../hooks/useSimulation';
import { Road } from './Road';
import { Vehicle } from './Vehicle';
import { Gate } from './Gate';
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

interface Props {
  config: SimulationConfig;
  simulation: SimulationControls;
  focusZone: FocusZoneConfig;
  showDebug?: boolean;
  /** Camera mode: suppress status overlays and debug for a clean capture image */
  cameraMode?: boolean;
  calibrationMode?: boolean;
}

const SKY_TOP    = '#060810';
const SKY_MID    = '#0d1728';
const SKY_BOTTOM = '#1a2a3e';

export function SimulationScene({
  config,
  simulation,
  focusZone,
  showDebug = false,
  cameraMode = false,
  calibrationMode = false,
}: Props) {
  const { state } = simulation;
  const { vehicleT, gateOpen, phase } = state;

  const gateDepth    = useMemo(() => getDepthValues(GATE_T), []);
  const vehicleDepth = getDepthValues(vehicleT);

  // Z-ordering: vehicle behind gate (farther from camera) → draw first
  const vehicleBehindGate = vehicleT < GATE_T;

  // Plate readability: live-calculated for debug/focus zone display
  const plateReadability = getPlateReadability(vehicleT, config.detectorPlacement, focusZone);

  return (
    <div
      className="relative w-full rounded-lg overflow-hidden border border-white/10 shadow-2xl"
      style={{ aspectRatio: `${SCENE_W}/${SCENE_H}`, maxWidth: '100%' }}
    >
      {/* ── SVG Scene ──��──────────────────────────────────────────────────── */}
      <svg
        viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}
      >
        <defs>
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={SKY_TOP} />
            <stop offset="55%"  stopColor={SKY_MID} />
            <stop offset="100%" stopColor={SKY_BOTTOM} />
          </linearGradient>

          <radialGradient id="horizGlow" cx="50%" cy="100%" r="60%">
            <stop offset="0%"   stopColor="#1e4a7a" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#0d1728"  stopOpacity={0}    />
          </radialGradient>

          <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
            <stop offset="0%"   stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
          </radialGradient>
        </defs>

        {/* Background */}
        <rect x={0} y={0} width={SCENE_W} height={SCENE_H} fill="url(#skyGrad)" />
        <rect x={0} y={VP_Y - 40} width={SCENE_W} height={120} fill="url(#horizGlow)" />
        <line x1={0} y1={VP_Y + 2} x2={SCENE_W} y2={VP_Y + 2}
              stroke="#2a3a50" strokeWidth={1} opacity={0.6} />

        {/* Road */}
        <Road />

        {/* Gate + Vehicle (depth-ordered) */}
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
        <rect x={0} y={0} width={SCENE_W} height={SCENE_H}
              fill="url(#vignette)" pointerEvents="none" />

        {/* Focus Zone overlay (always on top, inside SVG for correct scaling) */}
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
