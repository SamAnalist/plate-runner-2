# Persistent Plate Lists (Phase 0.6)

Local, browser-persisted (localStorage) named sets of plates plus the
simulation defaults to run them with. No backend — everything lives in the
browser and is portable only via JSON export/import (see
`docs/IMPORT_EXPORT_SPEC.md`).

## Type — `packages/shared/src/types/plateList.ts`

```ts
type PlateListId = string;

interface PlateListSimulationDefaults {
  direction: Direction;
  detectorPlacement: DetectorPlacement;
  vehicleColor: VehicleColor;
  gateConfig: GateConfig;          // { gateMode, gateInitialState, stopBeforeOpenMs, delayAfterOpenMs }
  queueConfig: PlateQueueConfig;   // { mode, gapBetweenVehiclesMs, loop }
}

interface PlateList {
  id: PlateListId;
  name: string;
  description?: string;
  plates: string[];                // already-validated, normalized
  simulationDefaults: PlateListSimulationDefaults;
  createdAt: string;                // ISO
  updatedAt: string;                // ISO
  version: number;                  // starts at 1
}
```

Constants: `MAX_PLATE_LIST_NAME_LENGTH = 80`, `MAX_PLATE_LIST_DESCRIPTION_LENGTH = 500`,
`MAX_PLATE_LIST_PLATES = 500` (same ceiling as the Plate Queue's `MAX_QUEUE_SIZE`).

## Rules

- `name` is required, ≤80 chars.
- `description` optional, ≤500 chars.
- `plates` ≤500 entries; each validated with the shared `validatePlate` (same
  A–Z/0–9/≤12-char rules used everywhere else in the app). Duplicates
  allowed, matching the Plate Queue's own policy.
- `id` is generated locally (`crypto.randomUUID()`, with a fallback for
  environments without it) — never user-supplied.
- `version` starts at 1 (unused beyond being present — reserved for future
  schema migrations of the list shape itself, distinct from the JSON export
  `schemaVersion`, see `docs/IMPORT_EXPORT_SPEC.md`).
- `createdAt`/`updatedAt` are ISO timestamps, stamped by the storage layer,
  never trusted from user input.
- Never rendered as HTML — `name`/`description`/`plates` are always plain
  React text content, never `dangerouslySetInnerHTML`.

## Storage — `apps/web/src/features/lists/plateListStorage.ts`

Plain functions (no React), localStorage key `plate-runner:plate-lists:v1`,
storing the full `PlateList[]` as one JSON blob. Every read is wrapped in
try/catch: a corrupted or non-array value never throws — it's treated as an
empty list plus a reported `error` string, so the UI can show a recoverable
banner with a **Reset Storage** action (`resetPlateListStorage()` clears the
key) instead of crashing the app.

Functions: `getPlateLists()`, `getPlateList(id)`, `savePlateList(list)`
(upsert by id), `deletePlateList(id)`, `duplicatePlateList(id)` (new id,
`"Copy of " + name`, fresh timestamps), `resetPlateListStorage()`, plus the
import/export functions documented in `docs/IMPORT_EXPORT_SPEC.md`.

## Hook — `apps/web/src/features/lists/usePlateLists.ts`

`usePlateLists({ config, onConfigChange, plateQueue })` — mirrors
`usePlateQueue`'s own dependency-injection pattern (it orchestrates
`usePlateQueue`, the way `usePlateQueue` orchestrates `useSimulation`).

CRUD: `createList(draft)`, `updateList(id, draft)`, `deleteList(id)`,
`duplicateList(id)`, `resetStorage()` — `createList`/`updateList` validate
the draft (name/description length, plate count) and return
`{ ok: boolean; error?: string }` rather than throwing, so the form UI can
show an inline error.

### Playback — `runList(id)` / `loadListIntoQueue(id)`

```
runList(id):
  1. onConfigChange(applyListDefaults(list))   — direction, placement, vehicleColor, gate fields
  2. plateQueue.setQueueConfig(list.simulationDefaults.queueConfig)
  3. stash { plates: list.plates, autoRun: true } in a ref
  4. a useEffect keyed on `config` fires once the real re-render happens,
     then calls plateQueue.loadAndRunQueue(plates.join('\n'))

loadListIntoQueue(id): same, but autoRun: false → plateQueue.loadQueue(...) instead
```

**Why the two-step indirection matters:** applying a list changes fields
`useSimulation` reads via its own `configRef` (direction/placement/gate),
which — like React state generally — is only current as of the *next*
render, not synchronously after `onConfigChange()` returns. Calling
`onConfigChange()` and starting the queue in the same tick would start the
simulator against stale direction/gate settings. The `useEffect` keyed on
`config` is what makes this safe: it only fires after the config prop has
actually changed to the new value, guaranteeing `useSimulation`'s internal
state is current by the time playback starts. See
`docs/QUEUE_SPEC.md`'s `loadAndRunQueue` section for the queue-side half of
this fix.

`applyListDefaults` merges `direction`, `detectorPlacement`, `vehicleColor`,
and the 4 `gateConfig` fields onto the *current* config (everything else —
speed sliders, debug flags — is left as-is; a list does not override those).

## UI — `apps/web/src/components/controls/PlateListsPanel.tsx`

Rendered inside `ControlPanel`'s "Plate Lists" collapsible section (same
`CollapsibleSection` primitive used for "Plate Queue"/"Visual QA"). Sections:

- **Saved Lists** — a card per list: name, description, plate count,
  direction, placement, a color swatch, gate mode, queue mode, `updatedAt`.
  Actions: **Run List**, **Load Into Queue**, Edit, Duplicate, Export,
  Delete (confirmed via `window.confirm()`).
- **Create/Edit form** — inline, toggled by `editingId` state (`null` = list
  view, `'new'` = creating, an id = editing that list). Reuses
  `parsePlateQueueInput` for the plates textarea's live valid/invalid
  preview, exactly like the Plate Queue's own input. Direction/placement use
  the same `getPlacementsForDirection`-filtered grid pattern as `ControlPanel`.
  Gate/queue settings are a compact subset of `ControlPanel`'s own controls
  (no live Open/Close/Send-Signal buttons here — this form edits *stored*
  defaults, not a live simulation).
- **Import / Export** — see `docs/IMPORT_EXPORT_SPEC.md`.
- **Storage error banner** — shown when `storageError` is set (corrupted
  localStorage), with a confirmed **Reset Storage** action.

## Interaction with existing features

- A list's plates flow through the exact same `usePlateQueue` that manual
  queue loading and the Plate Queue UI use — pause/resume, skip, stop,
  `manual_next`, loop, and all 4 gate modes behave identically regardless of
  whether the queue was populated from the textarea or from a list.
- Running a list while the queue is already active is not specially guarded
  — the same rules that already govern `runQueue`/`loadQueue` re-entrancy
  apply (a list "run" resets `currentIndex` and item statuses just like
  `loadAndRunQueue`/`loadQueue` always have).
