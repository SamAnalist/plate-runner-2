# Plate List Import / Export (Phase 0.6)

Fully client-side — export triggers a `Blob` + temporary `<a download>`
click (no server round-trip); import reads a local file via `FileReader`.
No backend involved.

## JSON envelope

Every export is wrapped in a versioned envelope so future schema changes can
be detected without guessing:

```jsonc
// single list
{
  "schemaVersion": 1,
  "type": "plate_runner_plate_list",
  "data": { /* PlateList */ }
}

// multiple lists
{
  "schemaVersion": 1,
  "type": "plate_runner_plate_list_collection",
  "data": [ /* PlateList[] */ ]
}
```

`schemaVersion` is currently always `1` (`PLATE_LIST_SCHEMA_VERSION` in
`packages/shared/src/types/plateList.ts`). Import rejects any other value
outright (with an error, no partial import) rather than guessing at
compatibility — this is a Phase 0.6 constant, not yet a real migration path.

## Export

`apps/web/src/features/lists/plateListStorage.ts`:
- `exportPlateList(id)` → single-list envelope, or `null` if the id doesn't exist.
- `exportAllPlateLists()` → collection envelope of every stored list.

The hook (`usePlateLists`) exposes `exportListToJSON(id)` / `exportAllToJSON()`
which `JSON.stringify` the envelope (pretty-printed, 2-space indent) for
direct download. The UI's **Export** (per list) and **Export All** buttons
trigger a `Blob` download named `<slugified-list-name>.json` or
`plate-runner-lists.json` respectively.

## Import

`importPlateLists(raw: string)` (storage layer) → `{ imported: PlateList[]; errors: string[] }`.
Never throws:

1. `JSON.parse` in try/catch — invalid JSON becomes a single error, zero imports.
2. Envelope shape checked: `schemaVersion === 1` and `type` is one of the two
   known values; anything else is a single top-level error, zero imports.
3. Each candidate list (the single `data`, or each entry of the collection
   `data` array) is validated independently via `sanitizeImportedList`:
   - `name`: required, non-empty after trim, ≤80 chars.
   - `description`: optional, ≤500 chars.
   - `plates`: must be an array; each entry is run through `validatePlate` —
     **invalid individual plates are silently dropped, not rejected** (the
     list itself isn't rejected just because one plate in it is malformed);
     the resulting valid-plate count must still be ≤500.
   - `simulationDefaults.direction` — must be in the shared `DIRECTIONS` array.
   - `simulationDefaults.detectorPlacement` — must be in `DETECTOR_PLACEMENTS`.
   - `simulationDefaults.vehicleColor` — must be in `VEHICLE_COLORS` (`'blue'|'red'|'gray'`).
   - `simulationDefaults.vehicleType` — **optional**; when present, must be in
     `VEHICLE_TYPES` (`'sedan'|'suv'`). Absent is valid (lists exported before
     this field existed) and leaves the current vehicle type untouched on import.
   - `simulationDefaults.gateConfig` — `gateMode` in `GATE_MODES`, `gateInitialState`
     in `GATE_INITIAL_STATES`, `stopBeforeOpenMs`/`delayAfterOpenMs` numbers.
   - `simulationDefaults.queueConfig` — `mode` in `PLATE_QUEUE_MODES`,
     `gapBetweenVehiclesMs` a number, `loop` a boolean.
   - Any structural failure (wrong type, value outside the enum) rejects
     **that list only** — the error is added to `errors` (prefixed with the
     list's name when available) and the rest of the batch continues.
4. Every list that passes validation is persisted immediately
   (`savePlateList`) and included in `imported`.

The hook's `importFromJSON(raw)` wraps this, stores the `{ importedCount, errors }`
summary in `lastImportResult` for the UI to render, and only triggers a
`lists` refresh if at least one list actually imported.

### Duplicate-id decision

**Every imported list is always assigned a brand-new local id** — even if the
source JSON had an `id` field (it's simply ignored on import), and
`createdAt`/`updatedAt` are always stamped fresh at import time. `name` is
the only identity-like field carried over as-is.

This was a deliberate choice over "overwrite if id matches": a JSON file
could come from another browser, another machine, or a colleague — treating
its `id` as authoritative risks silently clobbering an unrelated local list
that happens to share an id (extremely unlikely with `crypto.randomUUID()`,
but not impossible with hand-edited JSON, and not worth the risk for a
recovery/portability feature). If the user wants to genuinely replace a
list, they still can: import creates a new entry, and the old one can be
deleted manually.

## UI

`PlateListsPanel`'s "Import / Export" section: **Export All** (disabled when
there are no lists), **Import JSON** (opens a hidden `<input type="file"
accept="application/json">`), and an import result summary — imported count
in green, any per-list errors listed (scrollable, capped visually) in red.
The file input resets its value after each selection so the same file can be
re-imported without re-selecting a different file first.

## Security

- `JSON.parse` is always try/caught — a malformed or hostile file never
  crashes the app, it just produces an error message.
- All imported text (`name`, `description`, plate strings) is rendered as
  plain React text, never HTML — no injection surface even from a
  maliciously crafted JSON file.
- Every enum-like field is checked against a fixed allow-list (the shared
  `VEHICLE_COLORS`/`DIRECTIONS`/`DETECTOR_PLACEMENTS`/`GATE_MODES`/
  `GATE_INITIAL_STATES`/`PLATE_QUEUE_MODES` arrays) — an imported file cannot
  smuggle in an unsupported `gateMode` or similar and have it silently
  accepted.
- The existing per-list `MAX_PLATE_LIST_PLATES` (500) and length caps on
  `name`/`description` apply identically to imported lists — a huge or
  hostile file can't create an oversized list, individual offending lists
  are just rejected with an error.
