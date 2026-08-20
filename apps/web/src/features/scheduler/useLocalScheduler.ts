import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MAX_SCHEDULE_NAME_LENGTH,
  MAX_SCHEDULE_DESCRIPTION_LENGTH,
  MIN_INTERVAL_MS,
  MAX_INTERVAL_MS,
  type ScheduledPlateListRun,
  type ScheduleStatus,
  type ScheduleRunMode,
  type SchedulePlateOrder,
  type RunWindow,
  type PlateQueueStatus,
  type PlateList,
} from '@plate-runner/shared';
import {
  getSchedules,
  saveSchedule as saveScheduleStorage,
  deleteSchedule as deleteScheduleStorage,
  disableSchedule as disableScheduleStorage,
  duplicateSchedule as duplicateScheduleStorage,
  clearSchedules,
  generateScheduleId,
} from './schedulerStorage';
import { computeNextRunAt, isWithinRunWindow, nextRunAtForWindow, shufflePlates, summarizeGateConfig } from './schedulerLogic';
import type { PlateListsControls, MutationResult, RunResult } from '../lists/usePlateLists';
import type { PlateQueueControls } from '../queue/usePlateQueue';
import type { ExecutionHistoryControls, ExecutionMeta } from '../history/useExecutionHistory';

interface UseLocalSchedulerArgs {
  plateLists: PlateListsControls;
  plateQueue: PlateQueueControls;
  executionHistory: ExecutionHistoryControls;
}

export interface ScheduleDraft {
  name: string;
  description?: string;
  plateListId: string;
  status: ScheduleStatus;
  runMode: ScheduleRunMode;
  plateOrder: SchedulePlateOrder;
  startAt?: string;
  dailyTime?: string;
  intervalMs?: number;
  runWindow?: RunWindow;
  maxRuns?: number;
}

export interface LocalSchedulerControls {
  schedules: ScheduledPlateListRun[];
  storageError: string | null;

  createSchedule: (draft: ScheduleDraft) => MutationResult;
  updateSchedule: (id: string, draft: ScheduleDraft) => MutationResult;
  deleteSchedule: (id: string) => void;
  duplicateSchedule: (id: string) => void;
  enableSchedule: (id: string) => void;
  disableSchedule: (id: string) => void;
  resetRunCount: (id: string) => void;
  /** Runs the schedule's list immediately. Does not touch runCount/lastRunAt/nextRunAt — an out-of-band manual trigger, separate from the automatic cadence. */
  runNow: (id: string) => RunResult;
  resetStorage: () => void;
}

const QUEUE_ACTIVE_STATUSES: PlateQueueStatus[] = ['running', 'paused', 'waiting_for_signal', 'waiting_for_next'];
const TICK_MS = 1000;

function validateDraft(draft: ScheduleDraft): string | null {
  const name = draft.name.trim();
  if (!name) return 'Name is required.';
  if (name.length > MAX_SCHEDULE_NAME_LENGTH) return `Name cannot exceed ${MAX_SCHEDULE_NAME_LENGTH} characters.`;
  if (draft.description && draft.description.length > MAX_SCHEDULE_DESCRIPTION_LENGTH) {
    return `Description cannot exceed ${MAX_SCHEDULE_DESCRIPTION_LENGTH} characters.`;
  }
  if (!draft.plateListId) return 'A plate list is required.';

  if (draft.runMode === 'repeat_interval') {
    const ms = draft.intervalMs ?? 0;
    if (ms < MIN_INTERVAL_MS || ms > MAX_INTERVAL_MS) {
      return `Interval must be between ${MIN_INTERVAL_MS / 1000}s and ${MAX_INTERVAL_MS / 3_600_000}h.`;
    }
  }
  if (draft.runMode === 'daily_at_time') {
    if (!/^\d{1,2}:\d{2}$/.test(draft.dailyTime ?? '')) return 'Daily time must be in HH:mm format.';
  }
  if (draft.runMode === 'once_at_time') {
    if (!draft.startAt || Number.isNaN(new Date(draft.startAt).getTime())) return 'A valid start date/time is required.';
  }
  return null;
}

function buildScheduleFromDraft(draft: ScheduleDraft, existing?: ScheduledPlateListRun): ScheduledPlateListRun {
  const now = new Date();
  const timestamp = now.toISOString();
  const base: ScheduledPlateListRun = {
    id: existing?.id ?? generateScheduleId(),
    name: draft.name.trim(),
    description: draft.description?.trim() || undefined,
    plateListId: draft.plateListId,
    status: draft.status,
    runMode: draft.runMode,
    plateOrder: draft.plateOrder,
    startAt: draft.startAt,
    dailyTime: draft.dailyTime,
    intervalMs: draft.intervalMs,
    runWindow: draft.runWindow,
    maxRuns: draft.maxRuns,
    runCount: existing?.runCount ?? 0,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
    lastRunAt: existing?.lastRunAt,
    nextRunAt: undefined,
    version: existing?.version ?? 1,
  };
  base.nextRunAt = base.status === 'enabled' ? computeNextRunAt(base, now) : undefined;
  return base;
}

export function useLocalScheduler({ plateLists, plateQueue, executionHistory }: UseLocalSchedulerArgs): LocalSchedulerControls {
  const [{ schedules, error: storageError }, setStore] = useState(() => getSchedules());

  const refresh = useCallback(() => {
    setStore(getSchedules());
  }, []);

  const schedulesRef = useRef(schedules);
  schedulesRef.current = schedules;
  const plateListsRef = useRef(plateLists);
  plateListsRef.current = plateLists;
  const plateQueueRef = useRef(plateQueue);
  plateQueueRef.current = plateQueue;
  const executionHistoryRef = useRef(executionHistory);
  executionHistoryRef.current = executionHistory;

  /** Tracks once_at_time schedules that already logged a queue_busy skip for their current due window, so retries don't spam history. */
  const loggedBusyOnceRef = useRef<Set<string>>(new Set());

  const buildMeta = useCallback((schedule: ScheduledPlateListRun, list: PlateList | undefined): ExecutionMeta | null => {
    if (!list) return null;
    return {
      plateListId: list.id,
      plateListName: list.name,
      totalPlates: list.plates.length,
      vehicleColor: list.simulationDefaults.vehicleColor,
      vehicleType: list.simulationDefaults.vehicleType,
      direction: list.simulationDefaults.direction,
      detectorPlacement: list.simulationDefaults.detectorPlacement,
      gateModeSummary: summarizeGateConfig(list.simulationDefaults.gateConfig),
      queueMode: list.simulationDefaults.queueConfig.mode,
      triggeredBy: 'schedule',
      scheduleId: schedule.id,
    };
  }, []);

  const tick = useCallback(() => {
    const now = new Date();
    const queueBusy = QUEUE_ACTIVE_STATUSES.includes(plateQueueRef.current.queueStatus);

    for (const schedule of schedulesRef.current) {
      if (schedule.status !== 'enabled') continue;
      if (!schedule.nextRunAt) continue;
      if (new Date(schedule.nextRunAt).getTime() > now.getTime()) continue;

      const list = plateListsRef.current.lists.find(l => l.id === schedule.plateListId);
      if (!list) continue; // missing list — leave nextRunAt untouched, retry next tick, no record (no spam).

      if (queueBusy) {
        const meta = buildMeta(schedule, list);
        if (schedule.runMode === 'once_at_time') {
          if (!loggedBusyOnceRef.current.has(schedule.id)) {
            loggedBusyOnceRef.current.add(schedule.id);
            if (meta) executionHistoryRef.current.addSkippedRecord({ ...meta, error: 'queue_busy' });
          }
          // nextRunAt untouched — retry next tick.
        } else {
          if (meta) executionHistoryRef.current.addSkippedRecord({ ...meta, error: 'queue_busy' });
          saveScheduleStorage({ ...schedule, nextRunAt: computeNextRunAt(schedule, now), updatedAt: now.toISOString() });
          refresh();
        }
        continue;
      }

      if (schedule.runMode === 'repeat_interval' && schedule.runWindow?.enabled && !isWithinRunWindow(schedule.runWindow, now)) {
        saveScheduleStorage({ ...schedule, nextRunAt: nextRunAtForWindow(schedule.runWindow, now), updatedAt: now.toISOString() });
        refresh();
        continue;
      }

      // Fire.
      loggedBusyOnceRef.current.delete(schedule.id);
      const plates = schedule.plateOrder === 'shuffle' ? shufflePlates(list.plates) : list.plates;
      const result = plateListsRef.current.runListForSchedule(schedule.plateListId, { plates, scheduleId: schedule.id });
      if (result.ok) {
        const runCount = schedule.runCount + 1;
        const willDisable = schedule.runMode === 'once_at_time' || (schedule.maxRuns != null && runCount >= schedule.maxRuns);
        const updated: ScheduledPlateListRun = {
          ...schedule,
          runCount,
          lastRunAt: now.toISOString(),
          status: willDisable ? 'disabled' : schedule.status,
          updatedAt: now.toISOString(),
        };
        updated.nextRunAt = willDisable ? undefined : computeNextRunAt(updated, now);
        saveScheduleStorage(updated);
        refresh();
      }
    }
  }, [refresh, buildMeta]);

  useEffect(() => {
    const interval = setInterval(tick, TICK_MS);
    return () => clearInterval(interval);
  }, [tick]);

  const createSchedule = useCallback((draft: ScheduleDraft): MutationResult => {
    const error = validateDraft(draft);
    if (error) return { ok: false, error };
    saveScheduleStorage(buildScheduleFromDraft(draft));
    refresh();
    return { ok: true };
  }, [refresh]);

  const updateSchedule = useCallback((id: string, draft: ScheduleDraft): MutationResult => {
    const error = validateDraft(draft);
    if (error) return { ok: false, error };
    const existing = schedulesRef.current.find(s => s.id === id);
    if (!existing) return { ok: false, error: 'Schedule not found.' };
    saveScheduleStorage(buildScheduleFromDraft(draft, existing));
    refresh();
    return { ok: true };
  }, [refresh]);

  const deleteSchedule = useCallback((id: string) => {
    deleteScheduleStorage(id);
    loggedBusyOnceRef.current.delete(id);
    refresh();
  }, [refresh]);

  const duplicateSchedule = useCallback((id: string) => {
    const copy = duplicateScheduleStorage(id);
    if (!copy) return;
    const now = new Date();
    saveScheduleStorage({ ...copy, nextRunAt: copy.status === 'enabled' ? computeNextRunAt(copy, now) : undefined });
    refresh();
  }, [refresh]);

  const enableSchedule = useCallback((id: string) => {
    const schedule = schedulesRef.current.find(s => s.id === id);
    if (!schedule) return;
    const now = new Date();
    const updated: ScheduledPlateListRun = { ...schedule, status: 'enabled', updatedAt: now.toISOString() };
    updated.nextRunAt = computeNextRunAt(updated, now);
    saveScheduleStorage(updated);
    refresh();
  }, [refresh]);

  const disableSchedule = useCallback((id: string) => {
    disableScheduleStorage(id);
    refresh();
  }, [refresh]);

  const resetRunCount = useCallback((id: string) => {
    const schedule = schedulesRef.current.find(s => s.id === id);
    if (!schedule) return;
    const now = new Date();
    const updated: ScheduledPlateListRun = {
      ...schedule, runCount: 0, lastRunAt: undefined, status: 'enabled', updatedAt: now.toISOString(),
    };
    updated.nextRunAt = computeNextRunAt(updated, now);
    loggedBusyOnceRef.current.delete(id);
    saveScheduleStorage(updated);
    refresh();
  }, [refresh]);

  const runNow = useCallback((id: string): RunResult => {
    const schedule = schedulesRef.current.find(s => s.id === id);
    if (!schedule) return { ok: false, reason: 'missing_list' };
    const list = plateListsRef.current.lists.find(l => l.id === schedule.plateListId);
    if (!list) return { ok: false, reason: 'missing_list' };
    const plates = schedule.plateOrder === 'shuffle' ? shufflePlates(list.plates) : list.plates;
    return plateListsRef.current.runListForSchedule(schedule.plateListId, { plates, scheduleId: schedule.id });
  }, []);

  const resetStorage = useCallback(() => {
    clearSchedules();
    loggedBusyOnceRef.current.clear();
    refresh();
  }, [refresh]);

  return {
    schedules,
    storageError,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    duplicateSchedule,
    enableSchedule,
    disableSchedule,
    resetRunCount,
    runNow,
    resetStorage,
  };
}
