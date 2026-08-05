import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_QUEUE_CONFIG,
  MAX_QUEUE_SIZE,
  type PlateQueueConfig,
  type PlateQueueItem,
  type PlateQueueItemStatus,
  type PlateQueueStatus,
  type SimulationConfig,
} from '@plate-runner/shared';
import type { SimulationControls } from '../../hooks/useSimulation';
import { parsePlateQueueInput } from './plateQueueParser';

interface UsePlateQueueArgs {
  config: SimulationConfig;
  onConfigChange: (c: SimulationConfig) => void;
  simulation: SimulationControls;
}

export interface PlateQueueProgress {
  total: number;
  completed: number;
  remaining: number;
  currentIndex: number;
}

export interface PlateQueueControls {
  items: PlateQueueItem[];
  currentIndex: number;
  currentItem: PlateQueueItem | null;
  queueStatus: PlateQueueStatus;
  queueConfig: PlateQueueConfig;
  progress: PlateQueueProgress;
  loadError: string | null;

  loadQueue: (rawInput: string) => void;
  setQueueConfig: (c: PlateQueueConfig) => void;

  runQueue: () => void;
  pauseQueue: () => void;
  resumeQueue: () => void;
  stopQueue: () => void;
  skipCurrent: () => void;
  nextVehicle: () => void;
  clearQueue: () => void;
  resetQueue: () => void;

  markCurrentWaitingForSignal: () => void;
  markCurrentCompleted: () => void;
  markCurrentFailed: (error?: string) => void;
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `q-${idCounter}`;
}

const ACTIVE_STATUSES: PlateQueueStatus[] = ['running', 'waiting_for_signal'];
const SKIPPABLE_STATUSES: PlateQueueStatus[] = ['running', 'waiting_for_signal', 'waiting_for_next'];

export function usePlateQueue({ config, onConfigChange, simulation }: UsePlateQueueArgs): PlateQueueControls {
  const [items, setItems] = useState<PlateQueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [queueStatus, setQueueStatus] = useState<PlateQueueStatus>('idle');
  const [queueConfig, setQueueConfig] = useState<PlateQueueConfig>(DEFAULT_QUEUE_CONFIG);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Refs mirror latest state for use inside callbacks/effects without stale closures.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const queueStatusRef = useRef(queueStatus);
  queueStatusRef.current = queueStatus;
  const queueConfigRef = useRef(queueConfig);
  queueConfigRef.current = queueConfig;
  const configRef = useRef(config);
  configRef.current = config;
  const prevPhaseRef = useRef(simulation.state.phase);

  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** True while the queue would like to advance but is paused; consumed on resume. */
  const pendingAdvanceRef = useRef(false);

  const clearGapTimer = useCallback(() => {
    if (gapTimerRef.current !== null) {
      clearTimeout(gapTimerRef.current);
      gapTimerRef.current = null;
    }
  }, []);

  const applyItemStatus = useCallback((id: string, status: PlateQueueItemStatus, error?: string) => {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, status, error } : it)));
  }, []);

  const markCurrentWaitingForSignal = useCallback(() => {
    const item = itemsRef.current[currentIndexRef.current];
    if (item) applyItemStatus(item.id, 'waiting_for_signal');
  }, [applyItemStatus]);

  const markCurrentCompleted = useCallback(() => {
    const item = itemsRef.current[currentIndexRef.current];
    if (item) applyItemStatus(item.id, 'completed');
  }, [applyItemStatus]);

  const markCurrentFailed = useCallback((error?: string) => {
    const item = itemsRef.current[currentIndexRef.current];
    if (item) applyItemStatus(item.id, 'failed', error);
  }, [applyItemStatus]);

  const cancelCurrentVehicle = useCallback(() => {
    simulation.reset();
  }, [simulation]);

  const startItemAt = useCallback((index: number) => {
    const item = itemsRef.current[index];
    if (!item) return;
    setCurrentIndex(index);
    applyItemStatus(item.id, 'running');
    onConfigChange({ ...configRef.current, plate: item.plate });
    simulation.start();
  }, [applyItemStatus, onConfigChange, simulation]);

  /** Decides what happens after the current item finishes (completed/skipped). */
  const advance = useCallback(() => {
    if (queueStatusRef.current === 'paused') {
      pendingAdvanceRef.current = true;
      return;
    }
    pendingAdvanceRef.current = false;

    const list = itemsRef.current;
    const next = currentIndexRef.current + 1;

    if (next < list.length) {
      if (queueConfigRef.current.mode === 'manual_next') {
        setQueueStatus('waiting_for_next');
      } else {
        setQueueStatus('running');
        startItemAt(next);
      }
      return;
    }

    // End of queue reached.
    if (queueConfigRef.current.loop && list.length > 0) {
      setItems(prev => prev.map(it => ({ ...it, status: 'pending' })));
      if (queueConfigRef.current.mode === 'manual_next') {
        setCurrentIndex(0);
        setQueueStatus('waiting_for_next');
      } else {
        setQueueStatus('running');
        startItemAt(0);
      }
    } else {
      setQueueStatus('completed');
    }
  }, [startItemAt]);

  // ── Phase watcher: the queue observes the simulator, it never drives its internals directly ──
  useEffect(() => {
    const phase = simulation.state.phase;
    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    const status = queueStatusRef.current;

    if (!ACTIVE_STATUSES.includes(status)) return;

    if (phase === 'waiting_for_signal' && status !== 'waiting_for_signal') {
      markCurrentWaitingForSignal();
      setQueueStatus('waiting_for_signal');
      return;
    }

    if (status === 'waiting_for_signal' && phase !== 'waiting_for_signal') {
      // Signal was sent (openGate) — vehicle resumed.
      const item = itemsRef.current[currentIndexRef.current];
      if (item) applyItemStatus(item.id, 'running');
      setQueueStatus('running');
      return;
    }

    if (phase === 'done' && prevPhase !== 'done' && status === 'running') {
      markCurrentCompleted();
      if (queueConfigRef.current.mode === 'run_all') {
        clearGapTimer();
        gapTimerRef.current = setTimeout(advance, queueConfigRef.current.gapBetweenVehiclesMs);
      } else {
        setQueueStatus('waiting_for_next');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulation.state.phase]);

  useEffect(() => () => clearGapTimer(), [clearGapTimer]);

  // ── Public controls ────────────────────────────────────────────────────────

  const loadQueue = useCallback((rawInput: string) => {
    const parsed = parsePlateQueueInput(rawInput);
    if (parsed.total > MAX_QUEUE_SIZE) {
      setLoadError(`Too many plates: ${parsed.total} detected, max is ${MAX_QUEUE_SIZE}.`);
      return;
    }
    setLoadError(null);
    setItems(parsed.valid.map(plate => ({ id: nextId(), plate, status: 'pending' as const })));
    setCurrentIndex(0);
    setQueueStatus('idle');
    clearGapTimer();
  }, [clearGapTimer]);

  const runQueue = useCallback(() => {
    if (itemsRef.current.length === 0) return;
    if (!['idle', 'stopped', 'completed'].includes(queueStatusRef.current)) return;
    setQueueStatus('running');
    startItemAt(0);
  }, [startItemAt]);

  const pauseQueue = useCallback(() => {
    if (!ACTIVE_STATUSES.includes(queueStatusRef.current)) return;
    clearGapTimer();
    setQueueStatus('paused');
  }, [clearGapTimer]);

  const resumeQueue = useCallback(() => {
    if (queueStatusRef.current !== 'paused') return;
    if (pendingAdvanceRef.current) {
      setQueueStatus('running');
      advance();
      return;
    }
    // A vehicle is still mid-run (or waiting for the gate signal) — resume observing it.
    setQueueStatus(simulation.state.phase === 'waiting_for_signal' ? 'waiting_for_signal' : 'running');
  }, [advance, simulation.state.phase]);

  const stopQueue = useCallback(() => {
    clearGapTimer();
    pendingAdvanceRef.current = false;
    cancelCurrentVehicle();
    setQueueStatus('stopped');
  }, [clearGapTimer, cancelCurrentVehicle]);

  const skipCurrent = useCallback(() => {
    if (!SKIPPABLE_STATUSES.includes(queueStatusRef.current)) return;
    const item = itemsRef.current[currentIndexRef.current];
    if (!item) return;
    clearGapTimer();
    applyItemStatus(item.id, 'skipped');
    cancelCurrentVehicle();
    setQueueStatus('running');
    advance();
  }, [applyItemStatus, cancelCurrentVehicle, clearGapTimer, advance]);

  const nextVehicle = useCallback(() => {
    if (queueStatusRef.current !== 'waiting_for_next') return;
    setQueueStatus('running');
    advance();
  }, [advance]);

  const clearQueue = useCallback(() => {
    clearGapTimer();
    pendingAdvanceRef.current = false;
    cancelCurrentVehicle();
    setItems([]);
    setCurrentIndex(0);
    setQueueStatus('idle');
    setLoadError(null);
  }, [cancelCurrentVehicle, clearGapTimer]);

  const resetQueue = useCallback(() => {
    clearGapTimer();
    pendingAdvanceRef.current = false;
    setItems(prev => prev.map(it => ({ ...it, status: 'pending', error: undefined })));
    setCurrentIndex(0);
    setQueueStatus('idle');
  }, [clearGapTimer]);

  const completed = items.filter(it => it.status === 'completed' || it.status === 'skipped' || it.status === 'failed').length;

  return {
    items,
    currentIndex,
    currentItem: items[currentIndex] ?? null,
    queueStatus,
    queueConfig,
    progress: {
      total: items.length,
      completed,
      remaining: Math.max(items.length - completed, 0),
      currentIndex,
    },
    loadError,

    loadQueue,
    setQueueConfig,

    runQueue,
    pauseQueue,
    resumeQueue,
    stopQueue,
    skipCurrent,
    nextVehicle,
    clearQueue,
    resetQueue,

    markCurrentWaitingForSignal,
    markCurrentCompleted,
    markCurrentFailed,
  };
}
