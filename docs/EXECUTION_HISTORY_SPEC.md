# Execution History (Phase 0.7)

A local log of every plate-list run (manual or scheduled), stored in `localStorage`.

**Update (Macro Phase 4 — Local Backend):** `TriggeredBy` gained an
`'api_command'` value for runs started by `useApiCommandListener`. This
frontend history remains **unsynced** with the backend's own command
history (`GET /api/commands`, see [API_COMMANDS_SPEC.md](API_COMMANDS_SPEC.md))
— they are two independent logs of the same underlying runs, not a single
source of truth.

## Record schema — `packages/shared/src/types/executionHistory.ts`

```ts
type ExecutionStatus = 'started' | 'completed' | 'stopped' | 'failed' | 'skipped';
type TriggeredBy = 'manual_list_run' | 'schedule' | 'import_test' | 'api_command' | 'unknown';

interface ScheduledExecutionRecord {
  id: string;
  scheduleId?: ScheduleId;
  plateListId: PlateListId;
  plateListName: string;
  startedAt: string;      // ISO
  completedAt?: string;   // ISO
  status: ExecutionStatus;
  totalPlates: number;
  completedPlates: number;
  skippedPlates: number;
  failedPlates: number;
  vehicleColor: VehicleColor;
  direction: Direction;
  detectorPlacement: DetectorPlacement;
  gateModeSummary: string;   // e.g. "auto_open (closed)" or "hidden"
  queueMode: PlateQueueMode;
  triggeredBy: TriggeredBy;
  error?: string;
}
```

`MAX_EXECUTION_HISTORY_RECORDS = 500`.

## Statuses

- **`started`** — written the moment a run begins (`usePlateLists.runList`/`runListForSchedule`), before the queue has actually processed anything.
- **`completed`** / **`stopped`** — the two terminal statuses `useExecutionHistory` finalizes automatically, mirroring `plateQueue.queueStatus` reaching `'completed'` or `'stopped'`. `completedPlates`/`skippedPlates`/`failedPlates` are computed from `plateQueue.items`' per-item statuses at that moment (not from `plateQueue.progress`, which reports a single combined count).
- **`skipped`** — written directly (not via the started→finalized flow) when the scheduler finds the queue busy at a due schedule's fire time — see `docs/SCHEDULER_SPEC.md`. Nothing was actually started, so there's no "active" record to track; `addSkippedRecord` writes a standalone, already-terminal record.
- **`failed`** — has **no automatic trigger yet**. The local simulator/queue has no failure path (no network calls, nothing that can error mid-run), so this status is reserved for future use — same category of known limitation already documented for item-level `failed` in `docs/QUEUE_SPEC.md` since Phase 0.4.

## `triggeredBy`

- **`manual_list_run`** — the Plate Lists panel's own "Run List" button.
- **`schedule`** — the scheduler's automatic tick firing a due schedule, *or* a schedule's "Run Now" button (both go through the schedule pathway; `scheduleId` is set either way).
- **`import_test`** / **`unknown`** — reserved for future use (e.g. a future "test this imported list" action); nothing in this phase sets them.

## How tracking works — `apps/web/src/features/history/useExecutionHistory.ts`

One hook, two roles:
- **Tracking** (used internally by `usePlateLists`/`useLocalScheduler`): `startExecution(meta)` writes a `started` record and remembers it as "active" (a ref, not state — doesn't need to survive unmount); `addSkippedRecord(meta)` writes a standalone terminal record. A `useEffect` watches `plateQueue.queueStatus` and finalizes the active record the moment it sees `'completed'` or `'stopped'`.
- **Display**: `records`, `storageError`, `clearHistory()`, `exportHistoryToJSON()` — consumed directly by `ExecutionHistoryPanel`.

Only one execution can be "active" for tracking purposes at a time — a direct consequence of the scheduler's own "only one execution at a time" rule (see `docs/SCHEDULER_SPEC.md`), so there's never a tracking conflict between two simultaneously-active records.

## Retention

`addExecutionRecord` appends then trims to the newest `MAX_EXECUTION_HISTORY_RECORDS` (500) — oldest records are silently dropped once the cap is exceeded. No warning is shown when trimming occurs (kept simple, matches the cap already used for the Plate Queue itself).

## Export

`exportExecutionHistory()` (storage layer) returns `{ exportedAt: <ISO>, records: ScheduledExecutionRecord[] }` — no `schemaVersion` envelope (unlike Plate List export/import, which does have one) since this is a one-way export for inspection/archival, not something re-imported back into the app. The UI's **Export History** button downloads this as `plate-runner-execution-history.json` via the same `Blob`+`<a download>` pattern used everywhere else in the app.

## UI — `apps/web/src/components/controls/ExecutionHistoryPanel.tsx`

Newest-first list of records (status badge, list name, plate counts, direction/placement/color, `triggeredBy` badge, timestamp, and any `error`), **Clear History** (confirmed via `window.confirm()`) and **Export History**.

## Known limitations

- `failed` status is defined but never automatically set (see above).
- No per-record "view details" drill-down beyond what's already shown inline (kept the UI light per scope).
- No import of a previously-exported history file — export is one-way (archival/inspection only).
- Retention trimming is silent — a user generating >500 records in a session won't be notified that older ones were dropped.
