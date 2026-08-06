import type { ApiCommandListenerControls } from '../features/api/useApiCommandListener';
import type { DisplayCommandListenerControls } from '../features/display/useDisplayCommandListener';
import type { RemoteControllerControls } from '../features/controller/useRemoteController';
import type { PlateListsControls } from '../features/lists/usePlateLists';
import type { LocalSchedulerControls } from '../features/scheduler/useLocalScheduler';
import type { ExecutionHistoryControls } from '../features/history/useExecutionHistory';
import type { ScreenSaverControls } from '../features/screensaver/useScreenSaver';
import type { AppScreen } from '../navigation/appScreens';
import { LocalApiPanel } from '../components/controls/LocalApiPanel';
import { SystemStatusPanel } from '../components/controls/SystemStatusPanel';
import { ScreenSaverSettingsPanel } from '../components/controls/ScreenSaverSettingsPanel';
import { BackupPanel } from '../components/controls/BackupPanel';
import { LocalStorageManagementPanel } from '../components/controls/LocalStorageManagementPanel';

interface SettingsScreenProps {
  apiCommandListener: ApiCommandListenerControls;
  displayCommandListener: DisplayCommandListenerControls;
  remoteController: RemoteControllerControls;
  plateLists: PlateListsControls;
  scheduler: LocalSchedulerControls;
  executionHistory: ExecutionHistoryControls;
  queueStatus: string;
  vehicleColor: string;
  screen: AppScreen;
  onNavigateHome: () => void;
  screenSaver: ScreenSaverControls;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-mono font-bold text-white/60 uppercase tracking-widest mb-3">
      {children}
    </h2>
  );
}

export function SettingsScreen({
  apiCommandListener,
  displayCommandListener,
  remoteController,
  plateLists,
  scheduler,
  executionHistory,
  queueStatus,
  vehicleColor,
  screen,
  onNavigateHome,
  screenSaver,
}: SettingsScreenProps) {
  function resetRemoteCredentials() {
    remoteController.pairedDisplays.forEach(p => remoteController.forgetPairing(p.displayId));
    displayCommandListener.forgetRegistration();
  }

  return (
    <div className="px-6 py-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-sm font-mono font-bold text-white/70 uppercase tracking-widest">
          Settings / API
        </h1>
        <p className="text-xs text-white/35 font-mono mt-1">
          Configure API connection and local listener.
        </p>
      </div>

      <div className="mb-8">
        <SectionHeading>Local API</SectionHeading>
        <LocalApiPanel listener={apiCommandListener} />
      </div>

      <div className="mb-8">
        <SectionHeading>System Status</SectionHeading>
        <SystemStatusPanel
          apiCommandListener={apiCommandListener}
          displayRegistered={!!displayCommandListener.registration}
          controllerPairingsCount={remoteController.pairedDisplays.length}
          plateListsCount={plateLists.lists.length}
          schedulesCount={scheduler.schedules.length}
          executionHistoryCount={executionHistory.records.length}
          queueStatus={queueStatus}
          vehicleColor={vehicleColor}
          lastScreen={screen}
          screenSaverEnabled={screenSaver.settings.enabled}
          screenSaverTimeoutMinutes={screenSaver.settings.timeoutMinutes}
        />
      </div>

      <div className="mb-8">
        <ScreenSaverSettingsPanel screenSaver={screenSaver} />
      </div>

      <div className="mb-8">
        <BackupPanel
          plateLists={plateLists.lists}
          schedules={scheduler.schedules}
          executionHistory={executionHistory.records}
          lastScreen={screen}
          screenSaver={screenSaver.settings}
        />
      </div>

      <div className="mb-6">
        <LocalStorageManagementPanel
          onResetPlateLists={plateLists.resetStorage}
          onResetScheduler={scheduler.resetStorage}
          onResetExecutionHistory={executionHistory.clearHistory}
          onResetRemoteCredentials={resetRemoteCredentials}
          onResetAppPreferences={onNavigateHome}
          onResetScreenSaver={screenSaver.resetSettings}
        />
      </div>

      <div className="mt-6 pt-4 border-t border-white/8">
        <p className="text-[10px] font-mono text-white/20 leading-snug">
          Plate Runner v0.9.0 — Gate Behavior + POV Motion
        </p>
      </div>
    </div>
  );
}
