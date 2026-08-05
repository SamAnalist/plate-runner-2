import { MAX_EXECUTION_HISTORY_RECORDS, type ScheduledExecutionRecord } from '@plate-runner/shared';

const STORAGE_KEY = 'plate-runner:execution-history:v1';

export function generateExecutionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `exec-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Reads and parses the raw array from localStorage. Never throws — corrupted data becomes an error string. */
function readRaw(): { records: ScheduledExecutionRecord[]; error: string | null } {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { records: [], error: null };
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return { records: [], error: 'Stored execution history was corrupted (not an array). Reset storage to start fresh.' };
    }
    return { records: parsed as ScheduledExecutionRecord[], error: null };
  } catch {
    return { records: [], error: 'Stored execution history was corrupted (invalid JSON). Reset storage to start fresh.' };
  }
}

function writeRaw(records: ScheduledExecutionRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function getExecutionHistory(): { records: ScheduledExecutionRecord[]; error: string | null } {
  return readRaw();
}

/** Appends a record, trimming the oldest entries once MAX_EXECUTION_HISTORY_RECORDS is exceeded. */
export function addExecutionRecord(record: ScheduledExecutionRecord): void {
  const { records } = readRaw();
  const next = [...records, record];
  const trimmed = next.length > MAX_EXECUTION_HISTORY_RECORDS
    ? next.slice(next.length - MAX_EXECUTION_HISTORY_RECORDS)
    : next;
  writeRaw(trimmed);
}

export function updateExecutionRecord(id: string, patch: Partial<ScheduledExecutionRecord>): void {
  const { records } = readRaw();
  const index = records.findIndex(r => r.id === id);
  if (index === -1) return;
  const next = records.slice();
  next[index] = { ...next[index], ...patch };
  writeRaw(next);
}

/** Clears all stored execution history — the recovery action for corrupted storage, also used by "Clear History". */
export function clearExecutionHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function exportExecutionHistory(): { exportedAt: string; records: ScheduledExecutionRecord[] } {
  return { exportedAt: new Date().toISOString(), records: getExecutionHistory().records };
}
