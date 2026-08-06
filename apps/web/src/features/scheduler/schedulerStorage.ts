import type { ScheduledPlateListRun } from '@plate-runner/shared';

export const STORAGE_KEY = 'plate-runner:schedules:v1';

export function generateScheduleId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `sched-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Reads and parses the raw array from localStorage. Never throws — corrupted data becomes an error string. */
function readRaw(): { schedules: ScheduledPlateListRun[]; error: string | null } {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { schedules: [], error: null };
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return { schedules: [], error: 'Stored schedules were corrupted (not an array). Reset storage to start fresh.' };
    }
    return { schedules: parsed as ScheduledPlateListRun[], error: null };
  } catch {
    return { schedules: [], error: 'Stored schedules were corrupted (invalid JSON). Reset storage to start fresh.' };
  }
}

function writeRaw(schedules: ScheduledPlateListRun[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
}

export function getSchedules(): { schedules: ScheduledPlateListRun[]; error: string | null } {
  return readRaw();
}

export function getSchedule(id: string): ScheduledPlateListRun | null {
  return readRaw().schedules.find(s => s.id === id) ?? null;
}

/** Upserts by id. Caller is responsible for constructing the full schedule (id, timestamps). */
export function saveSchedule(schedule: ScheduledPlateListRun): void {
  const { schedules } = readRaw();
  const index = schedules.findIndex(s => s.id === schedule.id);
  if (index === -1) {
    writeRaw([...schedules, schedule]);
  } else {
    const next = schedules.slice();
    next[index] = schedule;
    writeRaw(next);
  }
}

export function deleteSchedule(id: string): void {
  const { schedules } = readRaw();
  writeRaw(schedules.filter(s => s.id !== id));
}

function setStatus(id: string, status: ScheduledPlateListRun['status']): void {
  const schedule = getSchedule(id);
  if (!schedule) return;
  saveSchedule({ ...schedule, status, updatedAt: nowIso() });
}

export function enableSchedule(id: string): void {
  setStatus(id, 'enabled');
}

export function disableSchedule(id: string): void {
  setStatus(id, 'disabled');
}

export function duplicateSchedule(id: string): ScheduledPlateListRun | null {
  const original = getSchedule(id);
  if (!original) return null;
  const timestamp = nowIso();
  const copy: ScheduledPlateListRun = {
    ...original,
    id: generateScheduleId(),
    name: `Copy of ${original.name}`,
    runCount: 0,
    lastRunAt: undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  saveSchedule(copy);
  return copy;
}

export function resetScheduleRunCount(id: string): void {
  const schedule = getSchedule(id);
  if (!schedule) return;
  saveSchedule({ ...schedule, runCount: 0, lastRunAt: undefined, updatedAt: nowIso() });
}

/** Clears all stored schedules — the recovery action for corrupted storage. */
export function clearSchedules(): void {
  localStorage.removeItem(STORAGE_KEY);
}
