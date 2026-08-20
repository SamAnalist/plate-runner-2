import type { Direction, DetectorPlacement, VehicleColor, VehicleType } from './simulation';
import type { PlateQueueMode } from './queue';
import type { PlateListId } from './plateList';
import type { ScheduleId } from './scheduler';

export type ExecutionStatus = 'started' | 'completed' | 'stopped' | 'failed' | 'skipped';
export const EXECUTION_STATUSES: ExecutionStatus[] = ['started', 'completed', 'stopped', 'failed', 'skipped'];

export type TriggeredBy = 'manual_list_run' | 'schedule' | 'api_command' | 'import_test' | 'unknown';
export const TRIGGERED_BY_VALUES: TriggeredBy[] = ['manual_list_run', 'schedule', 'api_command', 'import_test', 'unknown'];

export interface ScheduledExecutionRecord {
  id: string;
  scheduleId?: ScheduleId;
  plateListId: PlateListId;
  plateListName: string;
  /** ISO timestamp. */
  startedAt: string;
  /** ISO timestamp. */
  completedAt?: string;
  status: ExecutionStatus;
  totalPlates: number;
  completedPlates: number;
  skippedPlates: number;
  failedPlates: number;
  vehicleColor: VehicleColor;
  /** Optional — absent on records created before the vehicle types feature. */
  vehicleType?: VehicleType;
  direction: Direction;
  detectorPlacement: DetectorPlacement;
  gateModeSummary: string;
  queueMode: PlateQueueMode;
  triggeredBy: TriggeredBy;
  error?: string;
}

/** Retention limit — oldest records are dropped once this is exceeded. */
export const MAX_EXECUTION_HISTORY_RECORDS = 500;
