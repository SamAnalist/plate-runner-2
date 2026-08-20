import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  DetectorPlacement,
  Direction,
  PlateQueueMode,
  ScheduledExecutionRecord,
  TriggeredBy,
  VehicleColor,
  VehicleType,
} from '@plate-runner/shared';
import type { PlateQueueControls } from '../queue/usePlateQueue';
import {
  getExecutionHistory,
  addExecutionRecord,
  updateExecutionRecord,
  clearExecutionHistory,
  exportExecutionHistory,
  generateExecutionId,
} from './executionHistoryStorage';

interface UseExecutionHistoryArgs {
  plateQueue: PlateQueueControls;
}

export interface ExecutionMeta {
  plateListId: string;
  plateListName: string;
  totalPlates: number;
  vehicleColor: VehicleColor;
  vehicleType?: VehicleType;
  direction: Direction;
  detectorPlacement: DetectorPlacement;
  gateModeSummary: string;
  queueMode: PlateQueueMode;
  triggeredBy: TriggeredBy;
  scheduleId?: string;
}

export interface ExecutionHistoryControls {
  records: ScheduledExecutionRecord[];
  storageError: string | null;

  clearHistory: () => void;
  exportHistoryToJSON: () => string;

  /** Starts tracking a new execution; the active record is finalized automatically when the queue reaches completed/stopped. */
  startExecution: (meta: ExecutionMeta) => string;
  /** Logs a standalone skipped record (e.g. queue busy) — nothing was started, so there's no active record to track. */
  addSkippedRecord: (meta: ExecutionMeta & { error: string }) => void;
}

function baseRecord(meta: ExecutionMeta): Omit<ScheduledExecutionRecord, 'id' | 'status' | 'startedAt'> {
  return {
    scheduleId: meta.scheduleId,
    plateListId: meta.plateListId,
    plateListName: meta.plateListName,
    totalPlates: meta.totalPlates,
    completedPlates: 0,
    skippedPlates: 0,
    failedPlates: 0,
    vehicleColor: meta.vehicleColor,
    vehicleType: meta.vehicleType,
    direction: meta.direction,
    detectorPlacement: meta.detectorPlacement,
    gateModeSummary: meta.gateModeSummary,
    queueMode: meta.queueMode,
    triggeredBy: meta.triggeredBy,
  };
}

export function useExecutionHistory({ plateQueue }: UseExecutionHistoryArgs): ExecutionHistoryControls {
  const [{ records, error: storageError }, setStore] = useState(() => getExecutionHistory());

  const refresh = useCallback(() => {
    setStore(getExecutionHistory());
  }, []);

  const activeRecordIdRef = useRef<string | null>(null);
  const itemsRef = useRef(plateQueue.items);
  itemsRef.current = plateQueue.items;
  const prevQueueStatusRef = useRef(plateQueue.queueStatus);

  // Finalizes the active record when the queue the tracked run belongs to reaches a terminal status.
  useEffect(() => {
    const status = plateQueue.queueStatus;
    const prevStatus = prevQueueStatusRef.current;
    prevQueueStatusRef.current = status;

    const recordId = activeRecordIdRef.current;
    if (!recordId) return;
    if (status === prevStatus) return;

    if (status === 'completed' || status === 'stopped') {
      const items = itemsRef.current;
      updateExecutionRecord(recordId, {
        completedAt: new Date().toISOString(),
        status,
        completedPlates: items.filter(i => i.status === 'completed').length,
        skippedPlates: items.filter(i => i.status === 'skipped').length,
        failedPlates: items.filter(i => i.status === 'failed').length,
      });
      activeRecordIdRef.current = null;
      refresh();
    }
  }, [plateQueue.queueStatus, refresh]);

  const startExecution = useCallback((meta: ExecutionMeta): string => {
    const record: ScheduledExecutionRecord = {
      id: generateExecutionId(),
      startedAt: new Date().toISOString(),
      status: 'started',
      ...baseRecord(meta),
    };
    addExecutionRecord(record);
    activeRecordIdRef.current = record.id;
    refresh();
    return record.id;
  }, [refresh]);

  const addSkippedRecord = useCallback((meta: ExecutionMeta & { error: string }) => {
    const record: ScheduledExecutionRecord = {
      id: generateExecutionId(),
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      status: 'skipped',
      error: meta.error,
      ...baseRecord(meta),
    };
    addExecutionRecord(record);
    refresh();
  }, [refresh]);

  const clearHistory = useCallback(() => {
    clearExecutionHistory();
    refresh();
  }, [refresh]);

  const exportHistoryToJSON = useCallback((): string => {
    return JSON.stringify(exportExecutionHistory(), null, 2);
  }, []);

  return {
    records,
    storageError,
    clearHistory,
    exportHistoryToJSON,
    startExecution,
    addSkippedRecord,
  };
}
