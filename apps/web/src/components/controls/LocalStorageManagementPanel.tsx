import { Button } from '../ui/Button';

interface ResetAction {
  key: string;
  title: string;
  description: string;
  confirmMessage: string;
  onReset: () => void;
  danger?: boolean;
}

interface LocalStorageManagementPanelProps {
  onResetPlateLists: () => void;
  onResetScheduler: () => void;
  onResetExecutionHistory: () => void;
  onResetRemoteCredentials: () => void;
  onResetAppPreferences: () => void;
  onResetScreenSaver: () => void;
  onResetSimulatorDefaults: () => void;
}

export function LocalStorageManagementPanel({
  onResetPlateLists,
  onResetScheduler,
  onResetExecutionHistory,
  onResetRemoteCredentials,
  onResetAppPreferences,
  onResetScreenSaver,
  onResetSimulatorDefaults,
}: LocalStorageManagementPanelProps) {
  const actions: ResetAction[] = [
    {
      key: 'lists',
      title: 'Plate Lists',
      description: 'Deletes every saved Plate List from this browser.',
      confirmMessage: 'Reset Plate Lists? All saved lists will be permanently deleted.',
      onReset: onResetPlateLists,
    },
    {
      key: 'scheduler',
      title: 'Scheduler',
      description: 'Deletes every saved schedule. Plate Lists are not affected.',
      confirmMessage: 'Reset Scheduler? All schedules will be permanently deleted.',
      onReset: onResetScheduler,
    },
    {
      key: 'history',
      title: 'Execution History',
      description: 'Clears the local log of past Plate List runs.',
      confirmMessage: 'Reset Execution History? All records will be permanently deleted.',
      onReset: onResetExecutionHistory,
    },
    {
      key: 'remote',
      title: 'Remote Pairing Credentials',
      description: 'Forgets this Controller\'s paired Displays and this Display\'s own registration. You will need to re-pair afterward.',
      confirmMessage: 'Reset remote pairing credentials? You will need to register/re-pair again.',
      onReset: onResetRemoteCredentials,
      danger: true,
    },
    {
      key: 'preferences',
      title: 'App Preferences / Last Screen',
      description: 'Forgets the last screen you were on and returns to Home.',
      confirmMessage: 'Reset app preferences and return to Home?',
      onReset: onResetAppPreferences,
    },
    {
      key: 'screensaver',
      title: 'Screen Saver Settings',
      description: 'Restores Screen Saver enabled/timeout/style to their defaults.',
      confirmMessage: 'Reset Screen Saver settings to defaults?',
      onReset: onResetScreenSaver,
    },
    {
      key: 'simulatorDefaults',
      title: 'Simulator Defaults',
      description: 'Restores the direction, placement, speed, color, and gate defaults a fresh run starts with.',
      confirmMessage: 'Reset Simulator Defaults to factory values?',
      onReset: onResetSimulatorDefaults,
    },
  ];

  function handleReset(action: ResetAction) {
    if (window.confirm(action.confirmMessage)) {
      action.onReset();
    }
  }

  function handleResetAll() {
    if (window.confirm(
      'Reset ALL local browser data for Plate Runner?\n\nThis deletes Plate Lists, Scheduler, Execution History, remote pairing credentials, app preferences, Screen Saver settings, and Simulator Defaults — everything stored in this browser. This cannot be undone.'
    )) {
      localStorage.clear();
      window.location.reload();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[9px] font-mono text-white/25 leading-snug mb-1">
        Each action below only affects data stored in this browser — nothing on the backend is touched.
      </p>
      {actions.map(action => (
        <div key={action.key} className="flex items-center justify-between gap-3 px-2.5 py-2 rounded-md border border-white/10 bg-white/3">
          <div className="min-w-0">
            <p className="text-[11px] font-mono text-white/70">{action.title}</p>
            <p className="text-[9px] font-mono text-white/30 leading-snug">{action.description}</p>
          </div>
          <Button tone="danger" onClick={() => handleReset(action)}>Reset</Button>
        </div>
      ))}
      <div className="flex items-center justify-between gap-3 px-2.5 py-2 rounded-md border border-red-500/25 bg-red-500/5 mt-1">
        <div className="min-w-0">
          <p className="text-[11px] font-mono text-red-300">All Local Browser Data</p>
          <p className="text-[9px] font-mono text-red-400/60 leading-snug">
            Wipes everything above at once and reloads the app. Cannot be undone.
          </p>
        </div>
        <Button tone="danger" variant="solid" onClick={handleResetAll}>Reset All</Button>
      </div>
    </div>
  );
}
