import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MAX_PLATE_LIST_NAME_LENGTH,
  MAX_PLATE_LIST_DESCRIPTION_LENGTH,
  MAX_PLATE_LIST_PLATES,
  type PlateList,
  type PlateListSimulationDefaults,
  type SimulationConfig,
} from '@plate-runner/shared';
import {
  getPlateLists,
  savePlateList,
  deletePlateList,
  duplicatePlateList,
  resetPlateListStorage,
  generateListId,
  exportPlateList,
  exportAllPlateLists,
  importPlateLists,
} from './plateListStorage';
import type { PlateQueueControls } from '../queue/usePlateQueue';

interface UsePlateListsArgs {
  config: SimulationConfig;
  onConfigChange: (c: SimulationConfig) => void;
  plateQueue: PlateQueueControls;
}

export interface PlateListDraft {
  name: string;
  description?: string;
  plates: string[];
  simulationDefaults: PlateListSimulationDefaults;
}

export interface MutationResult {
  ok: boolean;
  error?: string;
}

export interface ImportSummary {
  importedCount: number;
  errors: string[];
}

export interface PlateListsControls {
  lists: PlateList[];
  storageError: string | null;
  lastImportResult: ImportSummary | null;

  createList: (draft: PlateListDraft) => MutationResult;
  updateList: (id: string, draft: PlateListDraft) => MutationResult;
  deleteList: (id: string) => void;
  duplicateList: (id: string) => void;
  resetStorage: () => void;

  /** Applies the list's simulationDefaults and immediately runs its plates through the queue. */
  runList: (id: string) => void;
  /** Applies the list's simulationDefaults and loads its plates into the queue, without starting playback. */
  loadListIntoQueue: (id: string) => void;

  exportListToJSON: (id: string) => string | null;
  exportAllToJSON: () => string;
  /** Parses and imports a JSON payload (single-list or collection envelope). Result is also stored in lastImportResult. */
  importFromJSON: (raw: string) => ImportSummary;
}

function validateDraft(draft: PlateListDraft): string | null {
  const name = draft.name.trim();
  if (!name) return 'Name is required.';
  if (name.length > MAX_PLATE_LIST_NAME_LENGTH) return `Name cannot exceed ${MAX_PLATE_LIST_NAME_LENGTH} characters.`;
  if (draft.description && draft.description.length > MAX_PLATE_LIST_DESCRIPTION_LENGTH) {
    return `Description cannot exceed ${MAX_PLATE_LIST_DESCRIPTION_LENGTH} characters.`;
  }
  if (draft.plates.length > MAX_PLATE_LIST_PLATES) {
    return `Too many plates: ${draft.plates.length} detected, max is ${MAX_PLATE_LIST_PLATES}.`;
  }
  return null;
}

export function usePlateLists({ config, onConfigChange, plateQueue }: UsePlateListsArgs): PlateListsControls {
  const [{ lists, error: storageError }, setStore] = useState(() => getPlateLists());
  const [lastImportResult, setLastImportResult] = useState<ImportSummary | null>(null);

  const refresh = useCallback(() => {
    setStore(getPlateLists());
  }, []);

  const listsRef = useRef(lists);
  listsRef.current = lists;
  const configRef = useRef(config);
  configRef.current = config;
  const plateQueueRef = useRef(plateQueue);
  plateQueueRef.current = plateQueue;

  /**
   * Applying a list's defaults changes direction/placement/gate/color — fields
   * useSimulation reads via its own configRef, which only updates on next
   * render. So we can't call onConfigChange() and start the queue in the same
   * tick (unlike the plate-only case usePlateQueue handles internally). This
   * effect waits for the real re-render (config actually changing) before
   * touching the queue — mirrors useSimulation's own "wait for next render"
   * discipline (e.g. its direction-change effect).
   */
  const pendingActionRef = useRef<{ plates: string[]; autoRun: boolean } | null>(null);
  useEffect(() => {
    if (!pendingActionRef.current) return;
    const { plates, autoRun } = pendingActionRef.current;
    pendingActionRef.current = null;
    const rawInput = plates.join('\n');
    if (autoRun) plateQueueRef.current.loadAndRunQueue(rawInput);
    else plateQueueRef.current.loadQueue(rawInput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const applyListDefaults = useCallback((list: PlateList): SimulationConfig => {
    const d = list.simulationDefaults;
    return {
      ...configRef.current,
      direction: d.direction,
      detectorPlacement: d.detectorPlacement,
      vehicleColor: d.vehicleColor,
      ...d.gateConfig,
    };
  }, []);

  const runList = useCallback((id: string) => {
    const list = listsRef.current.find(l => l.id === id);
    if (!list) return;
    onConfigChange(applyListDefaults(list));
    plateQueueRef.current.setQueueConfig(list.simulationDefaults.queueConfig);
    pendingActionRef.current = { plates: list.plates, autoRun: true };
  }, [onConfigChange, applyListDefaults]);

  const loadListIntoQueue = useCallback((id: string) => {
    const list = listsRef.current.find(l => l.id === id);
    if (!list) return;
    onConfigChange(applyListDefaults(list));
    plateQueueRef.current.setQueueConfig(list.simulationDefaults.queueConfig);
    pendingActionRef.current = { plates: list.plates, autoRun: false };
  }, [onConfigChange, applyListDefaults]);

  const createList = useCallback((draft: PlateListDraft): MutationResult => {
    const validationError = validateDraft(draft);
    if (validationError) return { ok: false, error: validationError };

    const timestamp = new Date().toISOString();
    const list: PlateList = {
      id: generateListId(),
      name: draft.name.trim(),
      description: draft.description?.trim() || undefined,
      plates: draft.plates,
      simulationDefaults: draft.simulationDefaults,
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
    };
    savePlateList(list);
    refresh();
    return { ok: true };
  }, [refresh]);

  const updateList = useCallback((id: string, draft: PlateListDraft): MutationResult => {
    const validationError = validateDraft(draft);
    if (validationError) return { ok: false, error: validationError };

    const existing = lists.find(l => l.id === id);
    if (!existing) return { ok: false, error: 'List not found.' };

    const updated: PlateList = {
      ...existing,
      name: draft.name.trim(),
      description: draft.description?.trim() || undefined,
      plates: draft.plates,
      simulationDefaults: draft.simulationDefaults,
      updatedAt: new Date().toISOString(),
    };
    savePlateList(updated);
    refresh();
    return { ok: true };
  }, [lists, refresh]);

  const deleteList = useCallback((id: string) => {
    deletePlateList(id);
    refresh();
  }, [refresh]);

  const duplicateList = useCallback((id: string) => {
    duplicatePlateList(id);
    refresh();
  }, [refresh]);

  const resetStorage = useCallback(() => {
    resetPlateListStorage();
    refresh();
  }, [refresh]);

  const exportListToJSON = useCallback((id: string): string | null => {
    const envelope = exportPlateList(id);
    return envelope ? JSON.stringify(envelope, null, 2) : null;
  }, []);

  const exportAllToJSON = useCallback((): string => {
    return JSON.stringify(exportAllPlateLists(), null, 2);
  }, []);

  const importFromJSON = useCallback((raw: string): ImportSummary => {
    const { imported, errors } = importPlateLists(raw);
    const summary: ImportSummary = { importedCount: imported.length, errors };
    setLastImportResult(summary);
    if (imported.length > 0) refresh();
    return summary;
  }, [refresh]);

  return {
    lists,
    storageError,
    lastImportResult,
    createList,
    updateList,
    deleteList,
    duplicateList,
    resetStorage,
    runList,
    loadListIntoQueue,
    exportListToJSON,
    exportAllToJSON,
    importFromJSON,
  };
}
