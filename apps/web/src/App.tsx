import { useState, useEffect } from 'react';
import {
  DEFAULT_CONFIG,
  type SimulationConfig,
  type SetConfigPayload,
  remapPlacementForDirection,
  isPlacementAllowedForDirection,
} from '@plate-runner/shared';
import { SimulationScene } from './components/simulation/SimulationScene';
import { AppShell, type StatusChip } from './components/layout/AppShell';
import type { BadgeTone } from './components/ui/Badge';
import { HomeScreen } from './screens/HomeScreen';
import { LocalModeScreen, QUEUE_ACTIVE_STATUSES } from './screens/LocalModeScreen';
import { DisplayModeScreen } from './screens/DisplayModeScreen';
import { ControllerModeScreen } from './screens/ControllerModeScreen';
import { PlateListsScreen } from './screens/PlateListsScreen';
import { SchedulerScreen } from './screens/SchedulerScreen';
import { ExecutionHistoryScreen } from './screens/ExecutionHistoryScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { useSimulation } from './hooks/useSimulation';
import { usePersistentAppScreen } from './hooks/usePersistentAppScreen';
import { usePlateQueue } from './features/queue/usePlateQueue';
import { usePlateLists } from './features/lists/usePlateLists';
import { useExecutionHistory } from './features/history/useExecutionHistory';
import { useLocalScheduler } from './features/scheduler/useLocalScheduler';
import { useApiCommandListener } from './features/api/useApiCommandListener';
import { useDisplayCommandListener } from './features/display/useDisplayCommandListener';
import { useRemoteController } from './features/controller/useRemoteController';
import { useScreenSaver } from './features/screensaver/useScreenSaver';
import { ScreenSaverOverlay } from './components/screensaver/ScreenSaverOverlay';

type AppMode = 'normal' | 'fullscreen' | 'camera';

export default function App() {
  const [config, setConfig]           = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [appMode, setAppMode]         = useState<AppMode>('normal');
  const { screen, setScreen }         = usePersistentAppScreen();
  const [showDebug, setShowDebug]     = useState(false);
  const [showAnchorOverlay, setShowAnchorOverlay]         = useState(false);
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

  const queueActive = QUEUE_ACTIVE_STATUSES.includes(plateQueue.queueStatus);

  // ── Screen Saver — active whenever nothing "busy" has happened for a while ──
  const isAtGateOrWaiting = ['stopped_at_gate', 'waiting_for_signal', 'gate_opening'].includes(simulation.state.phase);
  const screenSaverBusy = simulation.state.isRunning || isAtGateOrWaiting || queueActive || displayCommandListener.pairingRequests.length > 0;
  const screenSaver = useScreenSaver({ busy: screenSaverBusy });

  // Non-DOM activity sources (remote/API commands, queue/sim starting, pairing requests,
  // screen navigation) all flow through this one effect instead of being hand-wired individually.
  useEffect(() => {
    screenSaver.notifyActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    displayCommandListener.lastCommandAt,
    apiCommandListener.pendingCount,
    plateQueue.queueStatus,
    simulation.state.phase,
    displayCommandListener.pairingRequests.length,
    screen,
  ]);

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

  const navigateToLocal = () => setScreen('local');

  // ─── Normal layout ───────────────────────────────────────────────────────

  const connectionTone = (status: string): BadgeTone =>
    status === 'connected' ? 'success' :
    status === 'unauthorized' || status === 'error' ? 'danger' :
    'neutral';

  const queueTone = (status: string): BadgeTone =>
    status === 'running' ? 'success' :
    status === 'waiting_for_signal' || status === 'paused' ? 'warning' :
    status === 'completed' ? 'info' :
    'neutral';

  const statusChips: StatusChip[] = [
    {
      label: 'Local API',
      active: apiCommandListener.enabled,
      detail: apiCommandListener.connectionStatus,
      tone: connectionTone(apiCommandListener.connectionStatus),
    },
    {
      label: 'Display',
      active: displayCommandListener.enabled,
      detail: displayCommandListener.connectionStatus,
      tone: connectionTone(displayCommandListener.connectionStatus),
    },
    {
      label: 'Queue',
      active: queueActive,
      detail: plateQueue.queueStatus,
      tone: queueTone(plateQueue.queueStatus),
    },
  ];

  const homeStatus = {
    local: undefined,
    display: displayCommandListener.registration
      ? `Registered as ${displayCommandListener.registration.displayName}`
      : 'Not registered',
    controller: `${remoteController.pairedDisplays.length} display${remoteController.pairedDisplays.length === 1 ? '' : 's'} paired`,
    lists: `${plateLists.lists.length} saved list${plateLists.lists.length === 1 ? '' : 's'}`,
    scheduler: `${scheduler.schedules.length} schedule${scheduler.schedules.length === 1 ? '' : 's'}`,
    history: `${executionHistory.records.length} record${executionHistory.records.length === 1 ? '' : 's'}`,
    settings: apiCommandListener.enabled ? `API: ${apiCommandListener.connectionStatus}` : 'API not connected',
  };

  let screenContent;
  switch (screen) {
    case 'local':
      screenContent = (
        <LocalModeScreen
          config={config}
          simulation={simulation}
          plateQueue={plateQueue}
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
      );
      break;
    case 'display':
      screenContent = (
        <DisplayModeScreen
          config={config}
          simulation={simulation}
          displayCommandListener={displayCommandListener}
          onEnterFullscreen={() => setAppMode('fullscreen')}
          onEnterCamera={() => setAppMode('camera')}
        />
      );
      break;
    case 'controller':
      screenContent = (
        <ControllerModeScreen controller={remoteController} localLists={plateLists.lists} />
      );
      break;
    case 'lists':
      screenContent = (
        <PlateListsScreen plateLists={plateLists} onNavigateToLocal={navigateToLocal} />
      );
      break;
    case 'scheduler':
      screenContent = (
        <SchedulerScreen
          scheduler={scheduler}
          lists={plateLists.lists}
          queueActive={queueActive}
          onNavigateToLocal={navigateToLocal}
        />
      );
      break;
    case 'history':
      screenContent = <ExecutionHistoryScreen history={executionHistory} />;
      break;
    case 'settings':
      screenContent = (
        <SettingsScreen
          apiCommandListener={apiCommandListener}
          displayCommandListener={displayCommandListener}
          remoteController={remoteController}
          plateLists={plateLists}
          scheduler={scheduler}
          executionHistory={executionHistory}
          queueStatus={plateQueue.queueStatus}
          vehicleColor={config.vehicleColor}
          screen={screen}
          onNavigateHome={() => setScreen('home')}
          screenSaver={screenSaver}
        />
      );
      break;
    case 'home':
    default:
      screenContent = <HomeScreen onNavigate={setScreen} statusById={homeStatus} />;
      break;
  }

  const normalLayout = (
    <AppShell screen={screen} onNavigate={setScreen} statusChips={statusChips}>
      {screenContent}
    </AppShell>
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

  return (
    <>
      {isExpanded ? expandedLayout : normalLayout}
      {screenSaver.isActive && <ScreenSaverOverlay style={screenSaver.settings.style} />}
    </>
  );
}
