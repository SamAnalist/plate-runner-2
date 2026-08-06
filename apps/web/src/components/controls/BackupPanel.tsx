import { useRef, useState } from 'react';
import type { PlateList, ScheduledPlateListRun, ScheduledExecutionRecord } from '@plate-runner/shared';
import type { AppScreen } from '../../navigation/appScreens';
import type { ScreenSaverSettings } from '../../features/screensaver/useScreenSaver';
import { buildLocalBackup, parseLocalBackup, applyLocalBackup } from '../../features/backup/localBackup';
import { downloadJSON } from '../../lib/downloadJSON';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import { FieldError } from '../ui/FieldError';

const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024; // 5MB — a real backup is a few KB; this just rejects obviously-wrong files before reading them.

interface BackupPanelProps {
  plateLists: PlateList[];
  schedules: ScheduledPlateListRun[];
  executionHistory: ScheduledExecutionRecord[];
  lastScreen: AppScreen;
  screenSaver: ScreenSaverSettings;
}

export function BackupPanel({ plateLists, schedules, executionHistory, lastScreen, screenSaver }: BackupPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedAt, setImportedAt] = useState<string | null>(null);

  function handleExport() {
    const backup = buildLocalBackup({ plateLists, schedules, executionHistory, lastScreen, screenSaver });
    downloadJSON(`plate-runner-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(backup, null, 2));
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      setImportError(`File is too large (${Math.round(file.size / 1024)}KB, max ${MAX_IMPORT_FILE_BYTES / 1024 / 1024}MB).`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const result = parseLocalBackup(reader.result);
      if (!result.ok) {
        setImportError(result.error);
        return;
      }
      if (!window.confirm(
        'Import this backup?\n\nThis will overwrite existing local Plate Lists, Schedules, Execution History, Last Screen, and Screen Saver settings. This cannot be undone.'
      )) {
        return;
      }
      applyLocalBackup(result.backup);
      setImportError(null);
      setImportedAt(new Date().toISOString());
      window.location.reload();
    };
    reader.readAsText(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>Local Backup</Label>
      <p className="text-[9px] font-mono text-white/25 leading-snug">
        Exports Plate Lists, Scheduler, Execution History, and non-secret app
        preferences (last screen, Screen Saver settings) as a single JSON
        file. Never includes the API key, controller tokens, display
        secrets, or pairing codes.
      </p>
      <div className="flex flex-wrap gap-1.5">
        <Button tone="primary" onClick={handleExport}>Export Backup</Button>
        <Button onClick={() => fileInputRef.current?.click()}>Import Backup</Button>
        <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImportFile} className="hidden" />
      </div>
      {importError && <FieldError>{importError}</FieldError>}
      {importedAt && <p className="text-[9px] font-mono text-emerald-400/80">Imported — reloading…</p>}
    </div>
  );
}
