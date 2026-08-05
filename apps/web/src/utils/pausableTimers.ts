interface PausableEntry {
  callback: () => void;
  remainingMs: number;
  startedAt: number;
  timeoutId: ReturnType<typeof setTimeout> | null;
}

export interface PausableTimers {
  /** Schedules callback after ms, replacing any existing timer under this id. */
  schedule: (id: string, ms: number, callback: () => void) => void;
  clear: (id: string) => void;
  clearAll: () => void;
  /** Freezes every currently-running timer, recording its remaining time. */
  pauseAll: () => void;
  /** Reschedules every paused timer with its previously-recorded remaining time. */
  resumeAll: () => void;
}

/**
 * A small id-keyed timer manager that supports pausing and resuming with the
 * exact remaining time preserved (instead of losing progress or restarting).
 * Shared by useSimulation (gate timers) and usePlateQueue (inter-vehicle gap).
 */
export function createPausableTimers(): PausableTimers {
  const entries = new Map<string, PausableEntry>();

  function clear(id: string) {
    const entry = entries.get(id);
    if (entry?.timeoutId !== null && entry?.timeoutId !== undefined) {
      clearTimeout(entry.timeoutId);
    }
    entries.delete(id);
  }

  function schedule(id: string, ms: number, callback: () => void) {
    clear(id);
    const entry: PausableEntry = { callback, remainingMs: ms, startedAt: Date.now(), timeoutId: null };
    entry.timeoutId = setTimeout(() => {
      entries.delete(id);
      callback();
    }, ms);
    entries.set(id, entry);
  }

  function clearAll() {
    entries.forEach(entry => {
      if (entry.timeoutId !== null) clearTimeout(entry.timeoutId);
    });
    entries.clear();
  }

  function pauseAll() {
    entries.forEach(entry => {
      if (entry.timeoutId !== null) {
        clearTimeout(entry.timeoutId);
        entry.remainingMs = Math.max(0, entry.remainingMs - (Date.now() - entry.startedAt));
        entry.timeoutId = null;
      }
    });
  }

  function resumeAll() {
    entries.forEach((entry, id) => {
      if (entry.timeoutId === null) {
        entry.startedAt = Date.now();
        entry.timeoutId = setTimeout(() => {
          entries.delete(id);
          entry.callback();
        }, entry.remainingMs);
      }
    });
  }

  return { schedule, clear, clearAll, pauseAll, resumeAll };
}
