import { useState, useEffect } from 'react';
import {
  DEFAULT_CONFIG,
  type SimulationConfig,
  type SetConfigPayload,
  remapPlacementForDirection,
  isPlacementAllowedForDirection,
} from '@plate-runner/shared';
import { SimulationScene } from './components/simulation/SimulationScene';
import { ControlPanel } from './components/controls/ControlPanel';
import { DisplayModePanel } from './components/controls/DisplayModePanel';
import { ControllerModePanel } from './components/controls/ControllerModePanel';
import { useSimulation } from './hooks/useSimulation';
import { usePlateQueue } from './features/queue/usePlateQueue';
import { usePlateLists } from './features/lists/usePlateLists';
import { useExecutionHistory } from './features/history/useExecutionHistory';
import { useLocalScheduler } from './features/scheduler/useLocalScheduler';
import { useApiCommandListener } from './features/api/useApiCommandListener';
import { useDisplayCommandListener } from './features/display/useDisplayCommandListener';
import { useRemoteController } from './features/controller/useRemoteController';

type AppMode = 'normal' | 'fullscreen' | 'camera';
type UsageMode = 'local' | 'display' | 'controller';

export default function App() {
  const [config, setConfig]           = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [appMode, setAppMode]         = useState<AppMode>('normal');
  const [usageMode, setUsageMode]     = useState<UsageMode>('local');
  const [showDebug, setShowDebug]     = useState(false);
  // Default ON for Phase 1.2 camera-aware asset calibration session.
  // Set back to false once all plate anchors are visually verified.
  const [showAnchorOverlay, setShowAnchorOverlay]         = useState(true);
  const [showMotionPathOverlay, setShowMotionPathOverlay] = useState(false);

  const simulation = useSimulation(config);

  /**
   * Config change interceptor — auto-remaps detectorPlacement when direction
   * changes so the combination is always valid (incoming→front, away→back).
   */
  function handleConfigChange(next: SimulationConfig) {
    if (
      next.direction !== config.direction &&
      !isPlacementAllowedForDirection(next.direction, next.detectorPlacement)
    ) {
      next = {
        ...next,
        detectorPlacement: remapPlacementForDirection(
          next.detectorPlacement,
          next.direction,
        ),
      };
    }
    setConfig(next);
  }

  /** Applies a partial SimulationConfig change (from a set_config remote/local command) through the same direction/placement remap guard as manual edits. */
  function applyPartialConfig(partial: SetConfigPayload) {
    handleConfigChange({ ...config, ...partial });
  }

  const plateQueue = usePlateQueue({ config, onConfigChange: handleConfigChange, simulation });
  const executionHistory = useExecutionHistory({ plateQueue });
  const plateLists = usePlateLists({ config, onConfigChange: handleConfigChange, plateQueue, executionHistory });
  const scheduler = useLocalScheduler({ plateLists, plateQueue, executionHistory });
  const apiCommandListener = useApiCommandListener({ simulation, plateQueue, plateLists, onSetConfig: applyPartialConfig });
  const displayCommandListener = useDisplayCommandListener({ simulation, plateQueue, plateLists, onSetConfig: applyPartialConfig });
  const remoteController = useRemoteController();

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

  const isExpanded  = appMode === 'fullscreen' || appMode === 'camera';
  const isCameraMode = appMode === 'camera';

  // ─── Normal layout ───────────────────────────────────────────────────────
  const USAGE_MODES: { value: UsageMode; label: string }[] = [
    { value: 'local',      label: 'Local' },
    { value: 'display',    label: 'Display' },
    { value: 'controller', label: 'Controller' },
  ];

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
            v0.9
          </span>
          <div className="flex items-center gap-0.5 ml-2 bg-white/5 rounded p-0.5">
            {USAGE_MODES.map(m => (
              <button
                key={m.value}
                onClick={() => setUsageMode(m.value)}
                className={`px-2 py-1 rounded text-[10px] font-mono font-semibold transition-all ${
                  usageMode === m.value ? 'bg-blue-600/80 text-white' : 'text-white/40 hover:text-white/70'}`}
              >
                {m.label}
              </button>
            ))}
          </div>
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
        </div>
      </header>

      {/* Main layout */}
      {usageMode === 'controller' ? (
        <div className="flex-1 overflow-y-auto px-6 py-6 bg-[#080910]">
          <ControllerModePanel controller={remoteController} localLists={plateLists.lists} />
        </div>
      ) : (
      <div className="flex flex-1 overflow-hidden min-h-0">
        <main className="flex-1 flex items-center justify-center p-6 min-w-0 bg-[#080910]">
          <SimulationScene
            config={config}
            simulation={simulation}
            showDebug={showDebug}
            showAnchorOverlay={showAnchorOverlay}
            showMotionPathOverlay={showMotionPathOverlay}
          />
        </main>
        <aside className="w-72 shrink-0 border-l border-white/8 overflow-y-auto">
          {usageMode === 'local' ? (
            <ControlPanel
              config={config}
              simulation={simulation}
              plateQueue={plateQueue}
              plateLists={plateLists}
              scheduler={scheduler}
              executionHistory={executionHistory}
              apiCommandListener={apiCommandListener}
              onConfigChange={handleConfigChange}
              showDebug={showDebug}
              onShowDebugChange={setShowDebug}
              onEnterFullscreen={() => setAppMode('fullscreen')}
              onEnterCamera={() => setAppMode('camera')}
              showAnchorOverlay={showAnchorOverlay}
              onShowAnchorOverlayChange={setShowAnchorOverlay}
              showMotionPathOverlay={showMotionPathOverlay}
              onShowMotionPathOverlayChange={setShowMotionPathOverlay}
            />
          ) : (
            <div className="flex flex-col h-full bg-[#0f1117]">
              <div className="px-4 py-3 border-b border-white/8 shrink-0">
                <p className="text-xs font-mono font-bold text-white/60 uppercase tracking-widest">
                  Display Mode
                </p>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <DisplayModePanel listener={displayCommandListener} />
              </div>
              <div className="px-4 py-3 border-t border-white/8 shrink-0 flex flex-col gap-1.5">
                <button
                  onClick={() => setAppMode('camera')}
                  className="py-1.5 rounded text-xs font-mono font-semibold
                    bg-white/5 border border-white/12 text-white/50
                    hover:text-white/80 hover:border-white/25 transition-all"
                >
                  ◉  Camera Mode
                </button>
                <button
                  onClick={() => setAppMode('fullscreen')}
                  className="py-1.5 rounded text-xs font-mono font-semibold
                    bg-white/5 border border-white/12 text-white/50
                    hover:text-white/80 hover:border-white/25 transition-all"
                >
                  ⛶  Fullscreen Scene
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
      )}
    </div>
  );

  // ─── Expanded layout (Fullscreen / Camera Mode) ──────────────────────────
  const expandedLayout = (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <div className="w-full h-full flex items-center justify-center p-0">
        <SimulationScene
          config={config}
          simulation={simulation}
          showDebug={!isCameraMode && showDebug}
          cameraMode={isCameraMode}
        />
      </div>

      {/* Exit button */}
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

      {!isCameraMode && (
        <div className="absolute top-3 left-3 z-20
          bg-black/50 border border-white/15 rounded px-2.5 py-1.5
          font-mono text-xs text-white/50 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          FULLSCREEN
        </div>
      )}

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

      {!isCameraMode && (
        <p className="absolute bottom-3 left-3 z-20 text-[9px] font-mono text-white/20">
          Press Esc to exit
        </p>
      )}
    </div>
  );

  return isExpanded ? expandedLayout : normalLayout;
}
