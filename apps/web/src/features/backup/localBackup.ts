import type { PlateList, ScheduledPlateListRun, ScheduledExecutionRecord } from '@plate-runner/shared';
import type { AppScreen } from '../../navigation/appScreens';
import { isAppScreen } from '../../navigation/appScreens';
import type { ScreenSaverSettings } from '../screensaver/useScreenSaver';
import { SCREEN_SAVER_STORAGE_KEY } from '../screensaver/useScreenSaver';
import { STORAGE_KEY as PLATE_LISTS_STORAGE_KEY } from '../lists/plateListStorage';
import { STORAGE_KEY as SCHEDULES_STORAGE_KEY } from '../scheduler/schedulerStorage';
import { STORAGE_KEY as EXECUTION_HISTORY_STORAGE_KEY } from '../history/executionHistoryStorage';
import { LAST_SCREEN_STORAGE_KEY } from '../../hooks/usePersistentAppScreen';

export const BACKUP_SCHEMA_VERSION = 1;
export const BACKUP_TYPE = 'plate_runner_local_backup';

/** Well above any realistic list/schedule/history size — guards against a
 * malicious or corrupted backup file bloating localStorage on import. */
const MAX_ARRAY_ENTRIES = 2000;

export interface LocalBackupV1 {
  schemaVersion: 1;
  type: 'plate_runner_local_backup';
  exportedAt: string;
  data: {
    plateLists: PlateList[];
    schedules: ScheduledPlateListRun[];
    executionHistory: ScheduledExecutionRecord[];
    preferences: { lastScreen: AppScreen };
    screenSaver: ScreenSaverSettings;
  };
}

/**
 * Never reads apiKey/controllerToken/displaySecret/pairing codes — those live in
 * hook state this function never touches, so there is nothing to accidentally leak.
 */
export function buildLocalBackup(input: {
  plateLists: PlateList[];
  schedules: ScheduledPlateListRun[];
  executionHistory: ScheduledExecutionRecord[];
  lastScreen: AppScreen;
  screenSaver: ScreenSaverSettings;
}): LocalBackupV1 {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    type: BACKUP_TYPE,
    exportedAt: new Date().toISOString(),
    data: {
      plateLists: input.plateLists,
      schedules: input.schedules,
      executionHistory: input.executionHistory,
      preferences: { lastScreen: input.lastScreen },
      screenSaver: input.screenSaver,
    },
  };
}

export type ParseBackupResult =
  | { ok: true; backup: LocalBackupV1 }
  | { ok: false; error: string };

export function parseLocalBackup(json: string): ParseBackupResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: 'Not valid JSON.' };
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, error: 'Backup file is not an object.' };
  }
  const obj = parsed as Record<string, unknown>;
  if (obj.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    return { ok: false, error: `Unsupported schemaVersion (expected ${BACKUP_SCHEMA_VERSION}).` };
  }
  if (obj.type !== BACKUP_TYPE) {
    return { ok: false, error: `Unexpected type — this doesn't look like a Plate Runner backup.` };
  }
  const data = obj.data as Record<string, unknown> | undefined;
  if (typeof data !== 'object' || data === null) {
    return { ok: false, error: 'Backup is missing its data section.' };
  }
  if (!Array.isArray(data.plateLists) || !Array.isArray(data.schedules) || !Array.isArray(data.executionHistory)) {
    return { ok: false, error: 'Backup data is malformed (plateLists/schedules/executionHistory must be arrays).' };
  }
  if (data.plateLists.length > MAX_ARRAY_ENTRIES || data.schedules.length > MAX_ARRAY_ENTRIES || data.executionHistory.length > MAX_ARRAY_ENTRIES) {
    return { ok: false, error: `Backup contains too many entries in one section (max ${MAX_ARRAY_ENTRIES} each).` };
  }
  if (typeof data.preferences !== 'object' || data.preferences === null) {
    return { ok: false, error: 'Backup data is malformed (missing preferences).' };
  }
  if (typeof data.screenSaver !== 'object' || data.screenSaver === null) {
    return { ok: false, error: 'Backup data is malformed (missing screenSaver settings).' };
  }
  const lastScreen = (data.preferences as Record<string, unknown>).lastScreen;
  return {
    ok: true,
    backup: {
      schemaVersion: 1,
      type: BACKUP_TYPE,
      exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : new Date().toISOString(),
      data: {
        plateLists: data.plateLists as PlateList[],
        schedules: data.schedules as ScheduledPlateListRun[],
        executionHistory: data.executionHistory as ScheduledExecutionRecord[],
        preferences: { lastScreen: isAppScreen(lastScreen) ? lastScreen : 'home' },
        screenSaver: data.screenSaver as ScreenSaverSettings,
      },
    },
  };
}

/** Writes the backup's contents to the same localStorage keys the app already reads on
 * mount. Caller is expected to reload the page afterward so every hook picks up the
 * fresh state — avoids adding a bulk-import API to each feature hook. */
export function applyLocalBackup(backup: LocalBackupV1): void {
  localStorage.setItem(PLATE_LISTS_STORAGE_KEY, JSON.stringify(backup.data.plateLists));
  localStorage.setItem(SCHEDULES_STORAGE_KEY, JSON.stringify(backup.data.schedules));
  localStorage.setItem(EXECUTION_HISTORY_STORAGE_KEY, JSON.stringify(backup.data.executionHistory));
  localStorage.setItem(LAST_SCREEN_STORAGE_KEY, backup.data.preferences.lastScreen);
  localStorage.setItem(SCREEN_SAVER_STORAGE_KEY, JSON.stringify(backup.data.screenSaver));
}
