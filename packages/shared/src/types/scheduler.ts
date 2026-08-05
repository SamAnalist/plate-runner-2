import type { PlateListId } from './plateList';

export type ScheduleId = string;

export type ScheduleStatus = 'enabled' | 'disabled';
export const SCHEDULE_STATUSES: ScheduleStatus[] = ['enabled', 'disabled'];

/**
 * once_at_time    — runs once at a specific date/time, then disables itself.
 * repeat_interval — runs every intervalMs, optionally only within a run window.
 * daily_at_time   — runs once a day at a local HH:mm time.
 */
export type ScheduleRunMode = 'once_at_time' | 'repeat_interval' | 'daily_at_time';
export const SCHEDULE_RUN_MODES: ScheduleRunMode[] = ['once_at_time', 'repeat_interval', 'daily_at_time'];

/**
 * sequential — plates run in the order stored on the PlateList.
 * shuffle    — plates are shuffled at execution time; the stored list is never modified.
 */
export type SchedulePlateOrder = 'sequential' | 'shuffle';
export const SCHEDULE_PLATE_ORDERS: SchedulePlateOrder[] = ['sequential', 'shuffle'];

/**
 * Optional local-time window restricting when a repeat_interval schedule may
 * fire. Same-day HH:mm comparison only — does not support a window spanning
 * midnight. See docs/SCHEDULER_SPEC.md.
 */
export interface RunWindow {
  enabled: boolean;
  startTime?: string; // "HH:mm"
  endTime?: string;   // "HH:mm"
}

export interface ScheduledPlateListRun {
  id: ScheduleId;
  name: string;
  description?: string;
  plateListId: PlateListId;
  status: ScheduleStatus;
  runMode: ScheduleRunMode;
  plateOrder: SchedulePlateOrder;
  /** ISO timestamp. Used by once_at_time (the fire time) and as the origin for repeat_interval, if provided. */
  startAt?: string;
  /** "HH:mm", local time. Used by daily_at_time. */
  dailyTime?: string;
  intervalMs?: number;
  runWindow?: RunWindow;
  maxRuns?: number;
  runCount: number;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  nextRunAt?: string;
  version: number;
}

export const MAX_SCHEDULE_NAME_LENGTH = 80;
export const MAX_SCHEDULE_DESCRIPTION_LENGTH = 500;
/** Floor chosen to stay safe for local testing per spec — below this a schedule could busy-loop the tick. */
export const MIN_INTERVAL_MS = 10_000;
export const MAX_INTERVAL_MS = 24 * 60 * 60 * 1000;
