import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MAX_PLATE_LIST_NAME_LENGTH,
  MAX_PLATE_LIST_DESCRIPTION_LENGTH,
  MAX_PLATE_LIST_PLATES,
  type PlateList,
  type PlateListSimulationDefaults,
  type SimulationConfig,
  type TriggeredBy,
  speedPhasesForPreset,
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
import type { ExecutionHistoryControls } from '../history/useExecutionHistory';
import { summarizeGateConfig } from '../scheduler/schedulerLogic';

interface UsePlateListsArgs {
  config: SimulationConfig;
  onConfigChange: (c: SimulationConfig) => void;
  plateQueue: PlateQueueControls;
  executionHistory: ExecutionHistoryControls;
}

export interface RunResult {
  ok: boolean;
  reason?: 'missing_list';
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
  /**
   * A new object identity every time runList/runListForSchedule/loadListIntoQueue
   * loads a *saved* list (id must exist in `lists` — API-driven runListSnapshot
   * of an ephemeral list doesn't set this). Local Mode's Plate Queue section
   * watches this to switch its Manual/From List toggle to "From List" and
   * select the right list, even when the run was triggered from the Plate
   * Lists screen or a schedule rather than from Local Mode itself.
   */
  lastLoadedList: { id: string } | null;

  createList: (draft: PlateListDraft) => MutationResult;
  updateList: (id: string, draft: PlateListDraft) => MutationResult;
  deleteList: (id: string) => void;
  duplicateList: (id: string) => void;
  resetStorage: () => void;

  /** Applies the list's simulationDefaults, immediately runs its plates through the queue, and creates an execution history record (triggeredBy: 'manual_list_run'). */
  runList: (id: string) => RunResult;
  /** Applies the list's simulationDefaults and loads its plates into the queue, without starting playback. */
  loadListIntoQueue: (id: string) => void;
  /** Used by useLocalScheduler: same as runList, but with a pre-ordered plate array (e.g. shuffled) and triggeredBy: 'schedule'. */
  runListForSchedule: (id: string, opts: { plates: string[]; scheduleId: string }) => RunResult;
  /**
   * Used by useApiCommandListener: runs a full PlateList snapshot directly
   * (no local-storage lookup — the snapshot may not even exist locally,
   * e.g. it was embedded in a run_plate/run_queue/run_list API command payload).
   */
  runListSnapshot: (list: PlateList, triggeredBy: TriggeredBy) => void;

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

export function usePlateLists({ config, onConfigChange, plateQueue, executionHistory }: UsePlateListsArgs): PlateListsControls {
  const [{ lists, error: storageError }, setStore] = useState(() => getPlateLists());
  const [lastImportResult, setLastImportResult] = useState<ImportSummary | null>(null);
  const [lastLoadedList, setLastLoadedList] = useState<{ id: string } | null>(null);

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
    const speedFields = d.speedPreset
      ? { speedPreset: d.speedPreset, speedIncoming: speedPhasesForPreset(d.speedPreset), speedAway: speedPhasesForPreset(d.speedPreset) }
      : {};
    return {
      ...configRef.current,
      direction: d.direction,
      detectorPlacement: d.detectorPlacement,
      vehicleColor: d.vehicleColor,
      ...d.gateConfig,
      ...speedFields,
    };
  }, []);

  /** Shared by runList/runListForSchedule/runListSnapshot: applies defaults, starts an execution record, queues the deferred queue-start. */
  const executeList = useCallback((
    list: PlateList,
    plates: string[],
    triggeredBy: TriggeredBy,
    scheduleId?: string,
  ) => {
    onConfigChange(applyListDefaults(list));
    plateQueueRef.current.setQueueConfig(list.simulationDefaults.queueConfig);
    executionHistory.startExecution({
      plateListId: list.id,
      plateListName: list.name,
      totalPlates: plates.length,
      vehicleColor: list.simulationDefaults.vehicleColor,
      direction: list.simulationDefaults.direction,
      detectorPlacement: list.simulationDefaults.detectorPlacement,
      gateModeSummary: summarizeGateConfig(list.simulationDefaults.gateConfig),
      queueMode: list.simulationDefaults.queueConfig.mode,
      triggeredBy,
      scheduleId,
    });
    pendingActionRef.current = { plates, autoRun: true };
  }, [onConfigChange, applyListDefaults, executionHistory]);

  const runList = useCallback((id: string): RunResult => {
    const list = listsRef.current.find(l => l.id === id);
    if (!list) return { ok: false, reason: 'missing_list' };
    executeList(list, list.plates, 'manual_list_run');
    setLastLoadedList({ id: list.id });
    return { ok: true };
  }, [executeList]);

  const runListForSchedule = useCallback((id: string, opts: { plates: string[]; scheduleId: string }): RunResult => {
    const list = listsRef.current.find(l => l.id === id);
    if (!list) return { ok: false, reason: 'missing_list' };
    executeList(list, opts.plates, 'schedule', opts.scheduleId);
    setLastLoadedList({ id: list.id });
    return { ok: true };
  }, [executeList]);

  const runListSnapshot = useCallback((list: PlateList, triggeredBy: TriggeredBy) => {
    executeList(list, list.plates, triggeredBy);
  }, [executeList]);

  const loadListIntoQueue = useCallback((id: string) => {
    const list = listsRef.current.find(l => l.id === id);
    if (!list) return;
    onConfigChange(applyListDefaults(list));
    plateQueueRef.current.setQueueConfig(list.simulationDefaults.queueConfig);
    setLastLoadedList({ id: list.id });
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
    lastLoadedList,
    createList,
    updateList,
    deleteList,
    duplicateList,
    resetStorage,
    runList,
    loadListIntoQueue,
    runListForSchedule,
    runListSnapshot,
    exportListToJSON,
    exportAllToJSON,
    importFromJSON,
  };
}
