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
import { createPausableTimers } from '../../utils/pausableTimers';

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
  /** Parses input and immediately starts the first item — safe to call in the same tick as a config change (see usePlateLists). */
  loadAndRunQueue: (rawInput: string) => void;
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
const SKIPPABLE_STATUSES: PlateQueueStatus[] = ['running', 'waiting_for_signal', 'waiting_for_next', 'paused'];

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

  /** Manages the single 'gap' timer (inter-vehicle wait in run_all mode) so pause() can freeze it with remaining time preserved. */
  const queueTimers = useRef(createPausableTimers());

  const clearGapTimer = useCallback(() => {
    queueTimers.current.clear('gap');
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

  const startItemAt = useCallback((index: number, itemsOverride?: PlateQueueItem[]) => {
    const item = (itemsOverride ?? itemsRef.current)[index];
    if (!item) return;
    setCurrentIndex(index);
    applyItemStatus(item.id, 'running');
    onConfigChange({ ...configRef.current, plate: item.plate });
    simulation.start();
  }, [applyItemStatus, onConfigChange, simulation]);

  /** Decides what happens after the current item finishes (completed/skipped). */
  const advance = useCallback(() => {
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
        queueTimers.current.schedule('gap', queueConfigRef.current.gapBetweenVehiclesMs, advance);
      } else {
        setQueueStatus('waiting_for_next');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulation.state.phase]);

  useEffect(() => {
    const timerManager = queueTimers.current;
    return () => timerManager.clearAll();
  }, []);

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

  /**
   * Parses input and starts the first item immediately, using the freshly
   * computed items array rather than itemsRef.current (which only updates on
   * next render). This makes it safe to call right after changing config
   * (direction/placement/gate/etc.) in the same tick — see usePlateLists's
   * runList(), which relies on this to apply a saved list's defaults and
   * start playback without racing React's render cycle.
   */
  const loadAndRunQueue = useCallback((rawInput: string) => {
    const parsed = parsePlateQueueInput(rawInput);
    if (parsed.total > MAX_QUEUE_SIZE) {
      setLoadError(`Too many plates: ${parsed.total} detected, max is ${MAX_QUEUE_SIZE}.`);
      return;
    }
    setLoadError(null);
    const newItems = parsed.valid.map(plate => ({ id: nextId(), plate, status: 'pending' as const }));
    setItems(newItems);
    setCurrentIndex(0);
    clearGapTimer();
    if (newItems.length === 0) {
      setQueueStatus('idle');
      return;
    }
    setQueueStatus('running');
    startItemAt(0, newItems);
  }, [clearGapTimer, startItemAt]);

  const runQueue = useCallback(() => {
    if (itemsRef.current.length === 0) return;
    if (!['idle', 'stopped', 'completed'].includes(queueStatusRef.current)) return;
    setQueueStatus('running');
    startItemAt(0);
  }, [startItemAt]);

  /**
   * Pauses the queue AND the current vehicle: freezes the gap timer (if waiting
   * between vehicles) with its remaining time preserved, and calls simulation.pause()
   * to freeze motion / gate timers in place.
   */
  const pauseQueue = useCallback(() => {
    if (!ACTIVE_STATUSES.includes(queueStatusRef.current)) return;
    queueTimers.current.pauseAll();
    simulation.pause();
    setQueueStatus('paused');
  }, [simulation]);

  /**
   * Resumes the gap timer (continuing from its remaining time) and the simulation.
   * If the gap timer was active, it fires `advance()` itself once its remaining
   * time elapses — no separate "replay the advance" step needed.
   */
  const resumeQueue = useCallback(() => {
    if (queueStatusRef.current !== 'paused') return;
    queueTimers.current.resumeAll();
    simulation.resume();
    setQueueStatus(simulation.state.phase === 'waiting_for_signal' ? 'waiting_for_signal' : 'running');
  }, [simulation]);

  const stopQueue = useCallback(() => {
    clearGapTimer();
    cancelCurrentVehicle();
    setQueueStatus('stopped');
  }, [clearGapTimer, cancelCurrentVehicle]);

  /** Skip is an explicit override of pause — it always resumes+advances, even if the queue was paused. */
  const skipCurrent = useCallback(() => {
    if (!SKIPPABLE_STATUSES.includes(queueStatusRef.current)) return;
    const item = itemsRef.current[currentIndexRef.current];
    if (!item) return;
    clearGapTimer();
    applyItemStatus(item.id, 'skipped');
    cancelCurrentVehicle(); // simulation.reset() also clears isPaused
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
    cancelCurrentVehicle();
    setItems([]);
    setCurrentIndex(0);
    setQueueStatus('idle');
    setLoadError(null);
  }, [cancelCurrentVehicle, clearGapTimer]);

  const resetQueue = useCallback(() => {
    clearGapTimer();
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
    loadAndRunQueue,
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
