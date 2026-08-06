# Local Scheduler (Phase 0.7)

Local, in-browser automation layer on top of Persistent Plate Lists — schedules that trigger a saved list's playback on a timer, without any backend or remote trigger.

## Type — `packages/shared/src/types/scheduler.ts`

```ts
type ScheduleId = string;
type ScheduleStatus = 'enabled' | 'disabled';
type ScheduleRunMode = 'once_at_time' | 'repeat_interval' | 'daily_at_time';
type SchedulePlateOrder = 'sequential' | 'shuffle';

interface RunWindow { enabled: boolean; startTime?: string; endTime?: string; } // "HH:mm"

interface ScheduledPlateListRun {
  id: ScheduleId; name: string; description?: string;
  plateListId: PlateListId;
  status: ScheduleStatus; runMode: ScheduleRunMode; plateOrder: SchedulePlateOrder;
  startAt?: string; dailyTime?: string; intervalMs?: number; runWindow?: RunWindow; maxRuns?: number;
  runCount: number; createdAt: string; updatedAt: string; lastRunAt?: string; nextRunAt?: string; version: number;
}
```

Constants: `MAX_SCHEDULE_NAME_LENGTH = 80`, `MAX_SCHEDULE_DESCRIPTION_LENGTH = 500`, `MIN_INTERVAL_MS = 10_000` (10s), `MAX_INTERVAL_MS = 86_400_000` (24h).

## Storage — `apps/web/src/features/scheduler/schedulerStorage.ts`

Mirrors `plateListStorage.ts` exactly: `localStorage` key `plate-runner:schedules:v1`, array of `ScheduledPlateListRun`, corrupted JSON/non-array never throws (reported as an error string + recoverable via Reset Storage). `getSchedules/getSchedule/saveSchedule(upsert)/deleteSchedule/enableSchedule/disableSchedule/duplicateSchedule/resetScheduleRunCount/clearSchedules`.

## The tick engine — `apps/web/src/features/scheduler/useLocalScheduler.ts`

A `setInterval(tick, 1000)` (cleared on unmount) checks every `enabled` schedule whose `nextRunAt` has passed. For each due schedule, in order:

1. **List missing** — the schedule's `plateListId` has no matching `PlateList`. Skipped silently: `nextRunAt` is left untouched (re-checked every tick), **no execution record is created**, no spam. The UI surfaces this as a "⚠ Missing list" badge on the schedule card so the user notices and fixes/deletes it.
2. **Queue busy** — `plateQueue.queueStatus` is `running`/`paused`/`waiting_for_signal`/`waiting_for_next` (i.e. another run, manual or scheduled, is already in progress). **Only one execution runs at a time** — this check is what enforces that, for free, on every tick.
   - `repeat_interval` / `daily_at_time`: logs one `status: 'skipped'` execution record (`error: 'queue_busy'`) and advances `nextRunAt` as if it had run — this is what naturally caps it to at most one skip record per interval, not one per tick.
   - `once_at_time`: logs the skip **once** (tracked in-memory per schedule so repeated busy ticks don't spam history) and keeps retrying silently every tick until the queue frees up, since a "once" schedule has no natural next slot to fall back to.
3. **Out of run window** (`repeat_interval` with `runWindow.enabled` and the current local time outside `[startTime, endTime]`) — `nextRunAt` is recomputed to the next in-window moment. No execution record (kept quiet, per design — a window miss isn't noteworthy).
4. **Fire** — applies the list's `simulationDefaults`, orders the plates (see below), calls `usePlateLists`' `runListForSchedule` (which creates a `status: 'started'` execution record, `triggeredBy: 'schedule'`), then updates the schedule: `runCount += 1`, `lastRunAt = now`, `nextRunAt` recomputed, and auto-**disables** if `runMode === 'once_at_time'` or `maxRuns` has been reached.

## Run modes

- **`once_at_time`** — fires once at `startAt` (a specific date/time), then disables itself. `nextRunAt` is `startAt` while `runCount === 0`, and `undefined` once it's run (re-enabling without resetting `runCount` won't make it fire again — use **Reset Run Count**, which explicitly resets `runCount` to 0 and re-enables, to make it eligible again).
- **`repeat_interval`** — fires every `intervalMs` (10s–24h). `nextRunAt = now + intervalMs`, recomputed fresh after each fire (not accumulated from the original schedule time, so a missed tick doesn't cause drift/catch-up bursts). Optional `runWindow` restricts firing to a local time-of-day range.
- **`daily_at_time`** — fires once a day at `dailyTime` (local `HH:mm`). `nextRunAt` is today at that time if still ahead of now, else tomorrow. **Local browser time only** — no timezone handling.

## Plate order

- **`sequential`** — the list's plates run in their stored order, unchanged.
- **`shuffle`** — a Fisher–Yates shuffle is applied to a *copy* of the list's plates at the moment the schedule fires; the stored `PlateList.plates` is never mutated. Each firing gets an independently-shuffled order.

## Run window

`repeat_interval` only. Same-day `HH:mm` comparison — **does not support a window spanning midnight** (e.g. `startTime: "22:00"`, `endTime: "02:00"` will not behave as expected). Kept intentionally simple per scope.

## Queue busy behavior

See step 2 of the tick engine above. Verified in manual QA: a schedule firing while a manual "Run List" is in progress correctly logs a `skipped`/`queue_busy` record without disturbing the in-progress run, and correctly retries at its next natural interval rather than spamming a record every tick.

## Schedule controls

`createSchedule`/`updateSchedule` (validated: name required/≤80 chars, description ≤500, interval within bounds, `dailyTime` matches `HH:mm`, `startAt` a valid date, `plateListId` references an existing list at save time), `deleteSchedule`, `duplicateSchedule` (new id, `"Copy of "` name, `runCount: 0`, fresh `nextRunAt`), `enableSchedule`/`disableSchedule` (enabling recomputes `nextRunAt`), `resetRunCount` (resets `runCount` to 0, re-enables, recomputes `nextRunAt` — "reset implies let it run again"), `resetStorage`.

**`runNow(id)`** — runs the schedule's list immediately (`triggeredBy: 'schedule'`, `scheduleId` set, plate order per the schedule's `plateOrder`). Deliberately does **not** touch `runCount`/`lastRunAt`/`nextRunAt` — it's an out-of-band manual trigger and shouldn't perturb the automatic cadence math. Disabled in the UI (with a "Queue is currently running" note) while the queue is busy.

## Limitations

- Local browser time only, no timezone awareness.
- Run window doesn't support spanning midnight.
- A schedule pointing at a deleted list silently no-ops on every tick (no record, no error) until the user notices the "Missing list" badge and fixes/deletes it — there's no automatic disabling of a schedule whose list disappeared.
- No queue of pending schedules — only one execution at a time; a second due schedule is skipped, never queued to run right after the first finishes.
- `repeat_interval`'s `nextRunAt` is computed from the fire time, not accumulated from the original schedule — long periods where the tab is backgrounded/throttled by the browser could cause a schedule to fire later than intended, but never causes a burst of catch-up runs.
