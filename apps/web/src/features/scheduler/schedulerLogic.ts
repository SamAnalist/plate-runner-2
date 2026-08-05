import type { GateConfig, RunWindow, ScheduledPlateListRun } from '@plate-runner/shared';

/**
 * Computes the next fire time for a schedule, given the current time.
 *   once_at_time    → startAt, if it hasn't run yet; undefined once it has (auto-disabled by the caller).
 *   repeat_interval → now + intervalMs.
 *   daily_at_time   → today at dailyTime if that's still ahead of now, else tomorrow at dailyTime.
 */
export function computeNextRunAt(schedule: ScheduledPlateListRun, now: Date): string | undefined {
  if (schedule.runMode === 'once_at_time') {
    if (schedule.runCount > 0) return undefined;
    return schedule.startAt;
  }

  if (schedule.runMode === 'repeat_interval') {
    const intervalMs = schedule.intervalMs ?? 0;
    return new Date(now.getTime() + intervalMs).toISOString();
  }

  // daily_at_time
  const [hours, minutes] = parseHHmm(schedule.dailyTime);
  const next = new Date(now);
  next.setHours(hours, minutes, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.toISOString();
}

function parseHHmm(value: string | undefined): [number, number] {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value ?? '');
  if (!match) return [0, 0];
  return [Number(match[1]), Number(match[2])];
}

/**
 * Same-day HH:mm comparison only — does not support a window spanning
 * midnight (e.g. startTime "22:00", endTime "02:00"). See docs/SCHEDULER_SPEC.md.
 */
export function isWithinRunWindow(window: RunWindow, now: Date): boolean {
  if (!window.enabled) return true;
  if (!window.startTime || !window.endTime) return true;

  const [startH, startM] = parseHHmm(window.startTime);
  const [endH, endM] = parseHHmm(window.endTime);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
}

/**
 * Recomputes nextRunAt for a repeat_interval schedule that's currently
 * outside its run window — advances to the next in-window moment (today's
 * window start if still ahead, else tomorrow's).
 */
export function nextRunAtForWindow(window: RunWindow, now: Date): string | undefined {
  if (!window.startTime) return undefined;
  const [startH, startM] = parseHHmm(window.startTime);
  const next = new Date(now);
  next.setHours(startH, startM, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.toISOString();
}

/** Fisher–Yates shuffle on a copy — never mutates the input array. */
export function shufflePlates(plates: string[]): string[] {
  const copy = plates.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function summarizeGateConfig(gateConfig: GateConfig): string {
  if (gateConfig.gateMode === 'hidden') return 'hidden';
  return `${gateConfig.gateMode} (${gateConfig.gateInitialState})`;
}
