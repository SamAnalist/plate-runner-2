import type { ApiCommandListenerControls } from '../features/api/useApiCommandListener';
import type { DisplayCommandListenerControls } from '../features/display/useDisplayCommandListener';
import type { RemoteControllerControls } from '../features/controller/useRemoteController';
import type { PlateListsControls } from '../features/lists/usePlateLists';
import type { LocalSchedulerControls } from '../features/scheduler/useLocalScheduler';
import type { ExecutionHistoryControls } from '../features/history/useExecutionHistory';
import type { ScreenSaverControls } from '../features/screensaver/useScreenSaver';
import type { SimulatorDefaultsControls } from '../features/simulatorDefaults/useSimulatorDefaults';
import type { AppScreen } from '../navigation/appScreens';
import { LocalApiPanel } from '../components/controls/LocalApiPanel';
import { SystemStatusPanel } from '../components/controls/SystemStatusPanel';
import { ScreenSaverSettingsPanel } from '../components/controls/ScreenSaverSettingsPanel';
import { SimulatorDefaultsPanel } from '../components/controls/SimulatorDefaultsPanel';
import { BackupPanel } from '../components/controls/BackupPanel';
import { LocalStorageManagementPanel } from '../components/controls/LocalStorageManagementPanel';
import { SettingsCard } from '../components/ui/SettingsCard';

interface SettingsScreenProps {
  apiCommandListener: ApiCommandListenerControls;
  displayCommandListener: DisplayCommandListenerControls;
  remoteController: RemoteControllerControls;
  plateLists: PlateListsControls;
  scheduler: LocalSchedulerControls;
  executionHistory: ExecutionHistoryControls;
  screen: AppScreen;
  onNavigateHome: () => void;
  screenSaver: ScreenSaverControls;
  simulatorDefaults: SimulatorDefaultsControls;
}

export function SettingsScreen({
  apiCommandListener,
  displayCommandListener,
  remoteController,
  plateLists,
  scheduler,
  executionHistory,
  screen,
  onNavigateHome,
  screenSaver,
  simulatorDefaults,
}: SettingsScreenProps) {
  function resetRemoteCredentials() {
    remoteController.pairedDisplays.forEach(p => remoteController.forgetPairing(p.displayId));
    displayCommandListener.forgetRegistration();
  }

  return (
    <div className="px-6 py-6 max-w-3xl">
      <div className="mb-6 relative">
        <div className="absolute -top-4 -left-2 w-40 h-24 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <h1 className="relative text-sm font-mono font-bold text-white/90 uppercase tracking-widest">
          Settings <span className="text-blue-400">/</span> API
        </h1>
        <p className="relative text-xs text-white/35 font-mono mt-1">
          Simulator defaults, API connection, System Status, Screen Saver, backups, and local storage.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <SettingsCard title="Simulator Defaults" accent="blue"
          description="What a fresh run starts with — direction, placement, speed, color, and gate behavior.">
          <SimulatorDefaultsPanel controls={simulatorDefaults} />
        </SettingsCard>

        <SettingsCard title="Local API" accent="cyan"
          description="Point this browser at a backend (local or remote) to send/receive simulation commands.">
          <LocalApiPanel listener={apiCommandListener} />
        </SettingsCard>

        <SettingsCard title="System Status" accent="slate">
          <SystemStatusPanel
            apiCommandListener={apiCommandListener}
            displayRegistered={!!displayCommandListener.registration}
            controllerPairingsCount={remoteController.pairedDisplays.length}
            plateListsCount={plateLists.lists.length}
            schedulesCount={scheduler.schedules.length}
            executionHistoryCount={executionHistory.records.length}
            screenSaverEnabled={screenSaver.settings.enabled}
            screenSaverTimeoutMinutes={screenSaver.settings.timeoutMinutes}
          />
        </SettingsCard>

        <SettingsCard title="Screen Saver" accent="violet">
          <ScreenSaverSettingsPanel screenSaver={screenSaver} />
        </SettingsCard>

        <SettingsCard title="Local Backup" accent="emerald">
          <BackupPanel
            plateLists={plateLists.lists}
            schedules={scheduler.schedules}
            executionHistory={executionHistory.records}
            lastScreen={screen}
            screenSaver={screenSaver.settings}
          />
        </SettingsCard>

        <SettingsCard title="Local Storage" accent="red">
          <LocalStorageManagementPanel
            onResetPlateLists={plateLists.resetStorage}
            onResetScheduler={scheduler.resetStorage}
            onResetExecutionHistory={executionHistory.clearHistory}
            onResetRemoteCredentials={resetRemoteCredentials}
            onResetAppPreferences={onNavigateHome}
            onResetScreenSaver={screenSaver.resetSettings}
            onResetSimulatorDefaults={simulatorDefaults.resetSettings}
          />
        </SettingsCard>
      </div>

      <div className="mt-6 pt-4 border-t border-white/8">
        <p className="text-[10px] font-mono text-white/20 leading-snug">
          Plate Runner v0.9.0 — Gate Behavior + POV Motion
        </p>
      </div>
    </div>
  );
}
