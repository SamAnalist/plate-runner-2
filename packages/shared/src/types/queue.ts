export type PlateQueueItemStatus =
  | 'pending'
  | 'running'
  | 'waiting_for_signal'
  | 'completed'
  | 'skipped'
  | 'failed';

export interface PlateQueueItem {
  id: string;
  plate: string;
  status: PlateQueueItemStatus;
  error?: string;
}

export type PlateQueueStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'waiting_for_signal'
  | 'waiting_for_next'
  | 'completed'
  | 'stopped';

export type PlateQueueMode = 'run_all' | 'manual_next';
export const PLATE_QUEUE_MODES: PlateQueueMode[] = ['run_all', 'manual_next'];

export interface PlateQueueConfig {
  /** Delay (ms) between one vehicle completing and the next starting. Only used in run_all mode. */
  gapBetweenVehiclesMs: number;
  mode: PlateQueueMode;
  /** When true, the queue restarts at item 0 after the last item completes. */
  loop: boolean;
}

export const DEFAULT_QUEUE_CONFIG: PlateQueueConfig = {
  gapBetweenVehiclesMs: 1500,
  mode: 'run_all',
  loop: false,
};

/** Maximum number of plates allowed in a single local queue. */
export const MAX_QUEUE_SIZE = 500;
