import type { PlateList } from '@plate-runner/shared';

const STORAGE_KEY = 'plate-runner:plate-lists:v1';

export function generateListId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `list-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Reads and parses the raw array from localStorage. Never throws — corrupted data becomes an error string. */
function readRaw(): { lists: PlateList[]; error: string | null } {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { lists: [], error: null };
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return { lists: [], error: 'Stored plate lists were corrupted (not an array). Reset storage to start fresh.' };
    }
    return { lists: parsed as PlateList[], error: null };
  } catch {
    return { lists: [], error: 'Stored plate lists were corrupted (invalid JSON). Reset storage to start fresh.' };
  }
}

function writeRaw(lists: PlateList[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
}

export function getPlateLists(): { lists: PlateList[]; error: string | null } {
  return readRaw();
}

export function getPlateList(id: string): PlateList | null {
  return readRaw().lists.find(l => l.id === id) ?? null;
}

/** Upserts by id. Caller is responsible for constructing the full list (id, timestamps). */
export function savePlateList(list: PlateList): void {
  const { lists } = readRaw();
  const index = lists.findIndex(l => l.id === list.id);
  if (index === -1) {
    writeRaw([...lists, list]);
  } else {
    const next = lists.slice();
    next[index] = list;
    writeRaw(next);
  }
}

export function deletePlateList(id: string): void {
  const { lists } = readRaw();
  writeRaw(lists.filter(l => l.id !== id));
}

export function duplicatePlateList(id: string): PlateList | null {
  const original = getPlateList(id);
  if (!original) return null;
  const timestamp = nowIso();
  const copy: PlateList = {
    ...original,
    id: generateListId(),
    name: `Copy of ${original.name}`,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  savePlateList(copy);
  return copy;
}

/** Clears all stored plate lists — the recovery action for corrupted storage. */
export function resetPlateListStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}
