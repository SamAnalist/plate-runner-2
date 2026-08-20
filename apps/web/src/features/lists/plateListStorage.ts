import {
  validatePlate,
  VEHICLE_COLORS,
  VEHICLE_TYPES,
  DIRECTIONS,
  DETECTOR_PLACEMENTS,
  GATE_MODES,
  GATE_INITIAL_STATES,
  PLATE_QUEUE_MODES,
  MAX_PLATE_LIST_NAME_LENGTH,
  MAX_PLATE_LIST_DESCRIPTION_LENGTH,
  MAX_PLATE_LIST_PLATES,
  PLATE_LIST_SCHEMA_VERSION,
  type PlateList,
  type PlateListExportEnvelope,
  type PlateListCollectionExportEnvelope,
} from '@plate-runner/shared';

export const STORAGE_KEY = 'plate-runner:plate-lists:v1';

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

// ─── Export ──────────────────────────────────────────────────────────────

export function exportPlateList(id: string): PlateListExportEnvelope | null {
  const list = getPlateList(id);
  if (!list) return null;
  return { schemaVersion: PLATE_LIST_SCHEMA_VERSION, type: 'plate_runner_plate_list', data: list };
}

export function exportAllPlateLists(): PlateListCollectionExportEnvelope {
  return { schemaVersion: PLATE_LIST_SCHEMA_VERSION, type: 'plate_runner_plate_list_collection', data: getPlateLists().lists };
}

// ─── Import ──────────────────────────────────────────────────────────────

/**
 * Validates one candidate object against the PlateList shape. Returns the
 * sanitized list (fresh id/timestamps — see importPlateLists) or an error.
 * Invalid individual plates are dropped rather than rejecting the whole list;
 * every other field must be structurally valid or the list is rejected.
 */
function sanitizeImportedList(candidate: unknown): { list: PlateList | null; error?: string } {
  if (typeof candidate !== 'object' || candidate === null) {
    return { list: null, error: 'Entry is not an object.' };
  }
  const c = candidate as Record<string, unknown>;

  const name = typeof c.name === 'string' ? c.name.trim() : '';
  if (!name) return { list: null, error: 'Missing or empty name.' };
  if (name.length > MAX_PLATE_LIST_NAME_LENGTH) {
    return { list: null, error: `"${name}": name exceeds ${MAX_PLATE_LIST_NAME_LENGTH} characters.` };
  }

  const description = typeof c.description === 'string' ? c.description : undefined;
  if (description && description.length > MAX_PLATE_LIST_DESCRIPTION_LENGTH) {
    return { list: null, error: `"${name}": description exceeds ${MAX_PLATE_LIST_DESCRIPTION_LENGTH} characters.` };
  }

  if (!Array.isArray(c.plates)) return { list: null, error: `"${name}": plates is not an array.` };
  const plates = c.plates
    .filter((p): p is string => typeof p === 'string')
    .map(p => validatePlate(p))
    .filter(r => r.valid && r.normalized)
    .map(r => r.normalized as string);
  if (plates.length > MAX_PLATE_LIST_PLATES) {
    return { list: null, error: `"${name}": too many plates (${plates.length}), max is ${MAX_PLATE_LIST_PLATES}.` };
  }

  const d = c.simulationDefaults as Record<string, unknown> | undefined;
  if (typeof d !== 'object' || d === null) {
    return { list: null, error: `"${name}": missing simulationDefaults.` };
  }
  if (typeof d.direction !== 'string' || !DIRECTIONS.includes(d.direction as never)) {
    return { list: null, error: `"${name}": invalid direction.` };
  }
  if (typeof d.detectorPlacement !== 'string' || !DETECTOR_PLACEMENTS.includes(d.detectorPlacement as never)) {
    return { list: null, error: `"${name}": invalid detectorPlacement.` };
  }
  if (typeof d.vehicleColor !== 'string' || !VEHICLE_COLORS.includes(d.vehicleColor as never)) {
    return { list: null, error: `"${name}": invalid vehicleColor.` };
  }
  if (d.vehicleType !== undefined && (typeof d.vehicleType !== 'string' || !VEHICLE_TYPES.includes(d.vehicleType as never))) {
    return { list: null, error: `"${name}": invalid vehicleType.` };
  }
  const g = d.gateConfig as Record<string, unknown> | undefined;
  if (
    typeof g !== 'object' || g === null ||
    typeof g.gateMode !== 'string' || !GATE_MODES.includes(g.gateMode as never) ||
    typeof g.gateInitialState !== 'string' || !GATE_INITIAL_STATES.includes(g.gateInitialState as never) ||
    typeof g.stopBeforeOpenMs !== 'number' ||
    typeof g.delayAfterOpenMs !== 'number'
  ) {
    return { list: null, error: `"${name}": invalid gateConfig.` };
  }
  const q = d.queueConfig as Record<string, unknown> | undefined;
  if (
    typeof q !== 'object' || q === null ||
    typeof q.mode !== 'string' || !PLATE_QUEUE_MODES.includes(q.mode as never) ||
    typeof q.gapBetweenVehiclesMs !== 'number' ||
    typeof q.loop !== 'boolean'
  ) {
    return { list: null, error: `"${name}": invalid queueConfig.` };
  }

  const timestamp = nowIso();
  return {
    list: {
      id: generateListId(),
      name,
      description,
      plates,
      simulationDefaults: {
        direction: d.direction,
        detectorPlacement: d.detectorPlacement,
        vehicleColor: d.vehicleColor,
        vehicleType: d.vehicleType,
        gateConfig: {
          gateMode: g.gateMode,
          gateInitialState: g.gateInitialState,
          stopBeforeOpenMs: g.stopBeforeOpenMs,
          delayAfterOpenMs: g.delayAfterOpenMs,
        },
        queueConfig: {
          mode: q.mode,
          gapBetweenVehiclesMs: q.gapBetweenVehiclesMs,
          loop: q.loop,
        },
      } as PlateList['simulationDefaults'],
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
    },
  };
}

/**
 * Parses and imports a JSON payload — either a single-list envelope or a
 * collection envelope. Never throws: invalid JSON or an unrecognized shape
 * is reported in `errors` with zero imports.
 *
 * Every imported list gets a brand-new local id and fresh createdAt/updatedAt
 * (even if the source had an id) — this avoids ever silently overwriting a
 * local list via an id collision from a foreign export. The original `name`
 * is preserved. See docs/IMPORT_EXPORT_SPEC.md.
 */
export function importPlateLists(raw: string): { imported: PlateList[]; errors: string[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { imported: [], errors: ['Invalid JSON — could not parse the file.'] };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { imported: [], errors: ['Unrecognized format — expected a plate_runner_plate_list(_collection) envelope.'] };
  }
  const envelope = parsed as Record<string, unknown>;
  if (envelope.schemaVersion !== PLATE_LIST_SCHEMA_VERSION) {
    return { imported: [], errors: [`Unsupported schemaVersion: ${String(envelope.schemaVersion)}.`] };
  }

  let candidates: unknown[];
  if (envelope.type === 'plate_runner_plate_list') {
    candidates = [envelope.data];
  } else if (envelope.type === 'plate_runner_plate_list_collection') {
    if (!Array.isArray(envelope.data)) {
      return { imported: [], errors: ['Collection envelope "data" is not an array.'] };
    }
    candidates = envelope.data;
  } else {
    return { imported: [], errors: [`Unrecognized envelope type: ${String(envelope.type)}.`] };
  }

  const imported: PlateList[] = [];
  const errors: string[] = [];
  for (const candidate of candidates) {
    const { list, error } = sanitizeImportedList(candidate);
    if (list) {
      savePlateList(list);
      imported.push(list);
    } else if (error) {
      errors.push(error);
    }
  }
  return { imported, errors };
}
