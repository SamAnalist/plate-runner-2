# Vehicle Color & Type Variants

Originally "Phase 0.6" (color variants only); extended in a later phase to
add a second vehicle **type** (`suv`, alongside the original `sedan`). Both
dimensions — color and type — are independent and fully crossed: every
`(type, color, placement)` triple has its own asset and plate anchor.

## Supported colors

```ts
type VehicleColor = 'blue' | 'red' | 'gray';
```

Only these three. (A previous, unused `'white' | 'black' | 'silver' | 'green'`
set existed on the type but was never asset-backed or otherwise functional —
it was narrowed away in an earlier phase.)

## Supported vehicle types

```ts
type VehicleType = 'sedan' | 'suv';
```

`'sedan'` is the original/only vehicle before this feature — its asset
folder is named `main-car` for historical reasons (that folder name
predates the `VehicleType` concept and was kept as-is rather than renamed,
since it's an internal path detail never exposed via the API or UI).
`'suv'` was added later with a full asset set (all 3 colors × 6 placements)
but its plate anchors are still an **initial estimate** copied from
`sedan`'s — see "Calibration status" below.

## Defaults

```ts
vehicleColor: 'blue'
vehicleType: 'sedan'
```

Both live on `DEFAULT_CONFIG` in `packages/shared/src/types/simulation.ts`.

## Asset strategy

Assets live at:

```txt
apps/web/public/assets/vehicles/main-car/<color>/<placement>.png   (vehicleType: 'sedan')
apps/web/public/assets/vehicles/suv/<color>/<placement>.png        (vehicleType: 'suv')
```

One PNG per `(type, color, placement)` triple — 6 placements × 3 colors × 2
types = 36 files total, all 1536×1024.

The registry (`apps/web/src/components/simulation/renderers/asset-realistic/assetRegistry.tsx`)
is keyed by all three dimensions (type first, then color, then placement):

```ts
const VEHICLE_ASSET_REGISTRY: Record<VehicleType, Record<VehicleColor, Partial<Record<AssetViewKey, AssetEntry>>>> = {
  sedan: { blue: {...}, red: {...}, gray: {...} },
  suv:   { blue: {...}, red: {...}, gray: {...} },
};
```

A resolver function is the only way rendering code reads from this registry:

```ts
function getVehicleAsset({ type, color, placement }): { src, width, height, fallbackUsed }
```

## Fallback behavior

`getVehicleAsset` falls back to the `sedan`/`blue` entry for the same
placement when the requested `(type, color)` has no asset for that
placement:

```ts
const entry = VEHICLE_ASSET_REGISTRY[type]?.[color]?.[placement];
const resolved = entry ?? SEDAN_BLUE_ASSETS[placement];
fallbackUsed = !entry;
```

This resolver-with-fallback stays in place as infrastructure for any future
type/color added without a full asset set yet (see "How to add a new
color's real assets" / "How to add a new vehicle type" below) — but with
`sedan` and `suv` both fully populated for all three colors,
`fallbackUsed` is `false` for all in-use `(type, color, placement)` triples
today. The `VehicleAsset.fallbackUsed` flag remains available to any future
consumer that wants to react to a genuine fallback programmatically (e.g. a
debug overlay).

## Per-type, per-color plate anchors

`plateAnchors.ts` keys plate anchors by **all three** of type, color, and
placement — every `(type, color, placement)` triple is a full, independent
`PlateAnchor` value:

```ts
const PLATE_ANCHORS_BY_TYPE_AND_COLOR: Record<VehicleType, Record<VehicleColor, Record<DetectorPlacement, PlateAnchor>>>

function getPlateAnchor(type: VehicleType, color: VehicleColor, placement: DetectorPlacement): PlateAnchor
```

`getPlateAnchor` is a plain lookup — no merging with a "base" anchor happens
at read time, so what's written in a `(type, color)` block is exactly what
renders for that combination. This exists because the `red`/`gray` sedan
images are **not** simple recolors of the blue render — each is a
separately generated image with its own crop, car scale, and plate position
within the 1536×1024 canvas, sometimes noticeably different from blue's
framing (e.g. `center_front`'s plate sits ~5.5px right / ~13px up from
blue's on the full canvas). Using blue's anchor unmodified for those colors
visibly misplaces/mis-sizes the plate — the same risk applies (likely more
severely, given the different body shape) to the `suv` images vs. `sedan`.
`VehicleAssetLayer` (both the real plate render and the Anchor bounds debug
overlay) calls `getPlateAnchor(config.vehicleType, config.vehicleColor, placement)`.

`PLATE_ANCHORS` (sedan/blue's anchor set alone, keyed only by placement) is
kept as a backwards-compatible alias to `PLATE_ANCHORS_BY_TYPE_AND_COLOR.sedan.blue`.

**Calibration status (as of this phase):**
- `sedan/blue` is fully calibrated (the original baseline).
- `sedan/red` and `sedan/gray`: `center_front` is calibrated (measured
  directly against the blue asset). The other 5 placements currently hold
  either blue's values copied over (a reasonable starting point, not yet
  verified) or values already adjusted in-app — check each entry's numbers
  against what you see with Visual QA → Anchor bounds: ON before assuming
  it's final.
- `suv` (all three colors, all six placements): **direct copy of the
  matching `sedan/<color>` values, not yet calibrated at all.** The SUV
  body proportions and plate position are almost certainly different
  enough from the sedan's that these anchors are visibly wrong out of the
  box — treat every `suv` entry as PENDING VISUAL CALIBRATION, higher
  priority than the remaining uncalibrated sedan placements.

To calibrate any of the above: run the app, enable Visual QA → Anchor
bounds: ON, switch to the vehicle type and color being tuned, and adjust
`xPct`/`yPct`/`wPct`/`hPct` (and `rotateDeg`/`skewXDeg`/`skewYDeg` if the
angle looks wrong) directly in that `(type, color)` block in
`PLATE_ANCHORS_BY_TYPE_AND_COLOR` until the green dashed rect lands on the
plate.

## Per-type car size (`vehicleTypeScale.ts`)

The SUV is a physically larger body than the sedan, so it renders slightly
bigger at every phase — via a single **uniform multiplier**, not per-scene
duplication:

```ts
// apps/web/src/components/simulation/renderers/asset-realistic/vehicleTypeScale.ts
export const VEHICLE_TYPE_SCALE_MULTIPLIER: Record<VehicleType, number> = {
  sedan: 1,
  suv: 1.08,
};
```

`VehicleAssetLayer.tsx` multiplies this into the per-placement `carScale`
curve from `scene-configs/*.config.ts` (`carScale = getCarScale(...) *
VEHICLE_TYPE_SCALE_MULTIPLIER[vehicleType]`) — the six hand-calibrated
per-placement scale curves stay the single source of truth for how the car
grows/shrinks through a run; this just scales the whole curve up or down
uniformly for a vehicle type. The `1.08` value is an **approximation, not
measured** against the real SUV asset geometry — if the SUV still looks
visibly too small/large once seen on screen, adjust this one number rather
than touching any scene config. Unlike plate anchors, this does not need
per-placement tuning.

## Per-(type, placement) car position offset (`vehicleTypePosition.ts`)

Unlike car size, car *position* sometimes needs a fix scoped to one
specific `(vehicleType, placement)` pair rather than a uniform rule — e.g.
the SUV was reported sitting visibly too low ("sunken into the ground")
specifically in the `center_front` scene, not in every scene:

```ts
// apps/web/src/components/simulation/renderers/asset-realistic/vehicleTypePosition.ts
export const VEHICLE_TYPE_POSITION_OFFSET: Partial<Record<VehicleType, Partial<Record<DetectorPlacement, { xPct: number; yPct: number }>>>> = {
  suv: {
    center_front: { xPct: 0, yPct: -0.06 },
  },
};
```

`xPct`/`yPct` are fractions of the car's **own current width/height**
(`carW`/`carH`), not fixed scene pixels — so the nudge scales naturally
with the car's size through the whole depth range instead of only looking
right at one distance. Positive `yPct` moves the car down, negative moves
it up; positive `xPct` moves right, negative moves left.
`VehicleAssetLayer.tsx` adds `typeOffset.xPct * carW` /
`typeOffset.yPct * carH` on top of the normal depth-model `carX`/`carY`.

This table is empty for `sedan` (every scene was calibrated against it —
it should never need an entry) and only has entries for the specific
`(type, placement)` pairs that are visibly wrong — most pairs need none at
all. The `-0.06` for `suv`/`center_front` is a **starting value**, not
precisely measured; nudge it further (and add more entries here, the same
way, for any other scene that turns out to need it) rather than
special-casing anything in `VehicleAssetLayer.tsx` itself.

## How to add a new color's real assets (existing type)

1. Render/obtain 6 PNGs (one per placement) with **identical geometry** to
   the existing blue set for that vehicle type (same 1536×1024 canvas, same
   camera framing).
2. Drop them at `apps/web/public/assets/vehicles/<main-car|suv>/<color>/<placement>.png`.
3. Populate that color's object in `VEHICLE_ASSET_REGISTRY[type]` in
   `assetRegistry.tsx` with the 6 `AssetEntry` objects (same shape as the
   existing `blue` ones for that type).
4. That's it — `VehicleAssetLayer`, `getVehicleAsset`, and the UI swatch
   selector need no changes. The color stops falling back automatically the
   moment its registry entries exist.
5. If the new asset's geometry differs from the existing set's, also see
   the anchor caveat above — do not skip visual QA (Anchor bounds overlay)
   for the new color.

To add a color beyond `blue`/`red`/`gray` entirely, also add it to the
`VehicleColor` union and the `VEHICLE_COLORS` array in
`packages/shared/src/types/simulation.ts`, and to the `COLOR_MAP`/
`VEHICLE_COLOR_HEX` swatch-hex maps in `LocalModeScreen.tsx`,
`SimulatorDefaultsPanel.tsx`, `PlateListsPanel.tsx`, and
`ExecutionHistoryPanel.tsx`.

## How to add a new vehicle type

1. Render/obtain 18 PNGs (6 placements × 3 colors) at 1536×1024, same
   camera framing convention as the existing types.
2. Drop them at `apps/web/public/assets/vehicles/<new-type>/<color>/<placement>.png`.
3. Add the new value to the `VehicleType` union and `VEHICLE_TYPES` array in
   `packages/shared/src/types/simulation.ts`.
4. Add a new entry to `VEHICLE_ASSET_REGISTRY` in `assetRegistry.tsx` (all 3
   colors) and to `PLATE_ANCHORS_BY_TYPE_AND_COLOR` in `plateAnchors.ts`
   (copying an existing type's values per color is a reasonable starting
   point — see the SUV precedent above — but flag it PENDING CALIBRATION
   and don't skip the Anchor bounds overlay pass).
4b. Add the new type to `VEHICLE_TYPE_SCALE_MULTIPLIER` in
   `vehicleTypeScale.ts` (default `1` if the body is roughly sedan-sized;
   adjust up/down after seeing it on screen if it looks visibly mis-sized).
5. Add the new value to `VEHICLE_TYPE_OPTIONS` in `LocalModeScreen.tsx`,
   `SimulatorDefaultsPanel.tsx`, and `PlateListsPanel.tsx`, and to the
   `VEHICLE_TYPES`-driven `<Select>` in `ControllerModePanel.tsx` (that one
   needs no explicit options list — it already reads from `VEHICLE_TYPES`).
6. Server-side validation (`validateVehicleType` in
   `apps/server/src/services/validation.ts`) reads from the same shared
   `VEHICLE_TYPES` array — no server changes needed as long as step 3 is
   done first (shared package rebuild/relink).
7. No CLI script changes needed either — `send-random-plate.*` picks a
   random type from the same shared `VEHICLE_TYPES` list, or accepts one
   explicitly via `-y`/`-VehicleType`.

## Status update — red/gray sedan assets added

`red` and `gray` PNG sets (all 6 placements each, 1536×1024) were added at
`apps/web/public/assets/vehicles/main-car/{red,gray}/` and wired into
`VEHICLE_ASSET_REGISTRY` in `assetRegistry.tsx`. Unlike the initial
assumption when they were added, these turned out to **not** share blue's
exact crop/framing/plate position — see "Per-type, per-color plate
anchors" above for what was measured and what still needs in-app
calibration.

## Status update — SUV vehicle type added

A second vehicle type, `suv`, was added with a full 18-file asset set (all
3 colors × 6 placements) at `apps/web/public/assets/vehicles/suv/`. Wired
into `VEHICLE_ASSET_REGISTRY`/`PLATE_ANCHORS_BY_TYPE_AND_COLOR` and exposed
throughout the app (Local Mode's Visual Settings, Settings → Simulator
Defaults, Controller Mode, Plate Lists) and the API
(`vehicleType` on `RunPlatePayload`/`RunQueuePayload`/`SetConfigPayload`/
`PlateListSimulationDefaults`, defaulting server-side to `'sedan'` when
omitted — see [BACKEND_API_SPEC.md](BACKEND_API_SPEC.md) and
[REMOTE_COMMANDS_SPEC.md](REMOTE_COMMANDS_SPEC.md)). **SUV plate anchors
are not yet calibrated** — see "Calibration status" above.

## How `vehicleColor`/`vehicleType` are saved in a `PlateList`

`PlateList.simulationDefaults.vehicleColor: VehicleColor` — a saved list
carries its own vehicle color as part of its defaults, applied when the list
is run or loaded into the queue (see `docs/PLATE_LISTS_SPEC.md`). Import
validates this field against `VEHICLE_COLORS` and rejects the list if it's
missing or not one of `'blue' | 'red' | 'gray'`.

`PlateList.simulationDefaults.vehicleType?: VehicleType` — **optional**,
unlike `vehicleColor`. Lists saved before the vehicle-types feature don't
have this field; applying such a list leaves the current `vehicleType`
untouched rather than forcing it back to `'sedan'` (same "absent means
don't touch" behavior as the existing optional `speedPreset` field).
Import validates it against `VEHICLE_TYPES` when present, but does not
require it.
