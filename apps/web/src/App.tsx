import { useState, useEffect, useCallback } from 'react';
import {
  DEFAULT_CONFIG,
  DEFAULT_FOCUS_ZONE,
  type SimulationConfig,
  type FocusZoneConfig,
} from '@plate-runner/shared';
import { SimulationScene } from './components/simulation/SimulationScene';
import { ControlPanel } from './components/controls/ControlPanel';
import { useSimulation } from './hooks/useSimulation';
import { READING_T_INCOMING, READING_T_AWAY } from './hooks/useSimulation';
import { getPlateReadability } from './utils/depth';
import type { VisualStyle } from './components/simulation/renderers/types';

type AppMode = 'normal' | 'fullscreen' | 'camera';

export default function App() {
  const [config, setConfig]           = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [focusZone, setFocusZone]     = useState<FocusZoneConfig>(DEFAULT_FOCUS_ZONE);
  const [appMode, setAppMode]         = useState<AppMode>('normal');
  const [calibrationMode, setCalibrationMode] = useState(false);
  const [showDebug, setShowDebug]     = useState(false);
  const [visualStyle, setVisualStyle] = useState<VisualStyle>('classic');

  const simulation = useSimulation(config);

  // ── Calibration mode: freeze vehicle at reading position ────────────────
  const handleCalibrationMode = useCallback((enabled: boolean) => {
    setCalibrationMode(enabled);
    if (enabled) {
      const readingT = config.direction === 'incoming'
        ? READING_T_INCOMING
        : READING_T_AWAY;
      simulation.holdAt(readingT);
    } else {
      simulation.reset();
    }
  }, [config.direction, simulation]);

  // Re-apply holdAt when direction changes while in calibration mode
  useEffect(() => {
    if (calibrationMode) {
      const readingT = config.direction === 'incoming'
        ? READING_T_INCOMING
        : READING_T_AWAY;
      simulation.holdAt(readingT);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.direction, calibrationMode]);

  // ── Keyboard: Escape exits fullscreen / camera mode ─────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && appMode !== 'normal') {
        setAppMode('normal');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [appMode]);

  // ── Live readability for header badge ────────────────────────────────────
  const readability = getPlateReadability(
    simulation.state.vehicleT,
    config.detectorPlacement,
    focusZone,
  );

  const isExpanded = appMode === 'fullscreen' || appMode === 'camera';
  const isCameraMode = appMode === 'camera';

  // ─── Normal layout ───────────────────────────────────────────────────────
  const normalLayout = (
    <div className="flex flex-col h-screen bg-[#0a0b0f] overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-2.5 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-mono font-bold text-white tracking-[0.12em] uppercase">
            Plate Runner
          </span>
          <span className="text-[10px] text-white/25 font-mono bg-white/5 px-1.5 py-0.5 rounded">
            v0.2
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px] font-mono text-white/30">
          <span>
            <span className="text-white/50">plate:</span>{' '}
            <span className="text-blue-400 font-bold tracking-wider">{config.plate}</span>
          </span>
          <span>
            <span className="text-white/50">dir:</span>{' '}
            <span className="text-white/60">{config.direction}</span>
          </span>
          <span>
            <span className="text-white/50">detector:</span>{' '}
            <span className="text-white/60">{config.detectorPlacement}</span>
          </span>
          {/* Live readability badge */}
          {focusZone.enabled && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
              readability.readability === 'good'    ? 'bg-emerald-500/20 text-emerald-400' :
              readability.readability === 'partial' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {readability.readability === 'good'    ? '● GOOD' :
               readability.readability === 'partial' ? '◐ PARTIAL' :
               '○ POOR'}
            </span>
          )}
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        <main className="flex-1 flex items-center justify-center p-6 min-w-0 bg-[#080910]">
          <SimulationScene
            config={config}
            simulation={simulation}
            focusZone={focusZone}
            visualStyle={visualStyle}
            showDebug={showDebug}
            calibrationMode={calibrationMode}
          />
        </main>
        <aside className="w-72 shrink-0 border-l border-white/8 overflow-y-auto">
          <ControlPanel
            config={config}
            simulation={simulation}
            focusZone={focusZone}
            onConfigChange={setConfig}
            onFocusZoneChange={setFocusZone}
            showDebug={showDebug}
            onShowDebugChange={setShowDebug}
            calibrationMode={calibrationMode}
            onCalibrationModeChange={handleCalibrationMode}
            onEnterFullscreen={() => setAppMode('fullscreen')}
            onEnterCamera={() => setAppMode('camera')}
            visualStyle={visualStyle}
            onVisualStyleChange={setVisualStyle}
          />
        </aside>
      </div>
    </div>
  );

  // ─── Expanded layout (Fullscreen / Camera Mode) ──────────────────────────
  const expandedLayout = (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* Simulation fills the screen */}
      <div className="w-full h-full flex items-center justify-center p-0">
        <SimulationScene
          config={config}
          simulation={simulation}
          focusZone={focusZone}
          visualStyle={visualStyle}
          showDebug={!isCameraMode && showDebug}
          cameraMode={isCameraMode}
          calibrationMode={!isCameraMode && calibrationMode}
        />
      </div>

      {/* Exit button — always visible, minimal in camera mode */}
      <button
        onClick={() => setAppMode('normal')}
        className={`
          absolute top-3 right-3 z-20 font-mono font-semibold rounded
          transition-all
          ${isCameraMode
            ? 'text-[9px] px-2 py-1 bg-black/40 border border-white/10 text-white/20 hover:text-white/60 hover:border-white/30'
            : 'text-xs px-3 py-1.5 bg-white/10 border border-white/20 text-white/70 hover:bg-white/20 hover:text-white'}
        `}
      >
        {isCameraMode ? 'EXIT' : '✕ Exit'}
      </button>

      {/* Mode badge */}
      {!isCameraMode && (
        <div className="absolute top-3 left-3 z-20
          bg-black/50 border border-white/15 rounded px-2.5 py-1.5
          font-mono text-xs text-white/50 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          FULLSCREEN
        </div>
      )}

      {/* Status info overlay for fullscreen mode (bottom-right) */}
      {!isCameraMode && (
        <div className="absolute bottom-3 right-3 z-20
          bg-black/50 border border-white/12 rounded px-2.5 py-1.5
          font-mono text-[10px] text-white/40 flex flex-col items-end gap-0.5">
          <span>
            <span className="text-white/25">plate:</span>{' '}
            <span className="text-blue-400 font-bold tracking-wider">{config.plate}</span>
          </span>
          <span>
            <span className="text-white/25">phase:</span>{' '}
            <span>{simulation.state.phase}</span>
          </span>
          <span className="text-white/25">local</span>
        </div>
      )}

      {/* Keyboard hint */}
      {!isCameraMode && (
        <p className="absolute bottom-3 left-3 z-20 text-[9px] font-mono text-white/20">
          Press Esc to exit
        </p>
      )}
    </div>
  );

  return isExpanded ? expandedLayout : normalLayout;
}
