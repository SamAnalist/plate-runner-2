# Vehicle Color Variants (Phase 0.6, completed in a later phase — see bottom)

## Supported colors

```ts
type VehicleColor = 'blue' | 'red' | 'gray';
```

Only these three. (A previous, unused `'white' | 'black' | 'silver' | 'green'`
set existed on the type but was never asset-backed or otherwise functional —
it was narrowed away in this phase.)

## Default

```ts
vehicleColor: 'blue'
```

`DEFAULT_CONFIG.vehicleColor` in `packages/shared/src/types/simulation.ts`
was already `'blue'` and required no change.

## Asset strategy

Assets live at `apps/web/public/assets/vehicles/main-car/<color>/<placement>.png`,
one PNG per `(color, placement)` pair (6 placements × 3 colors, 18 files
total). All three colors now have a full set — `blue/`, `red/`, and `gray/`,
each with the same 6 filenames at 1536×1024.

The registry (`apps/web/src/components/simulation/renderers/asset-realistic/assetRegistry.tsx`)
is keyed by both dimensions:

```ts
const VEHICLE_ASSET_REGISTRY: Record<VehicleColor, Partial<Record<AssetViewKey, AssetEntry>>> = {
  blue: { center_front: {...}, driver_front: {...}, /* all 6 */ },
  red:  { center_front: {...}, driver_front: {...}, /* all 6 */ },
  gray: { center_front: {...}, driver_front: {...}, /* all 6 */ },
};
```

A resolver function is the only way rendering code reads from this registry:

```ts
function getVehicleAsset({ color, placement }): { src, width, height, fallbackUsed }
```

## Fallback behavior

`getVehicleAsset` falls back to the `blue` entry for the same placement when
the requested color has no asset for that placement:

```ts
const entry = VEHICLE_ASSET_REGISTRY[color][placement];
const resolved = entry ?? BLUE_ASSETS[placement];
fallbackUsed = !entry;
```

This resolver-with-fallback stays in place as infrastructure for any future
color added without a full asset set yet (see "How to add a new color's real
assets" below) — but with `red`/`gray` now fully populated, `fallbackUsed`
is `false` for all in-use `(color, placement)` pairs today. The
`VehicleAsset.fallbackUsed` flag remains available to any future consumer
that wants to react to a genuine fallback programmatically (e.g. a debug
overlay). The "No dedicated asset yet" note that used to appear under the
`Vehicle Color` swatch selector in `LocalModeScreen.tsx` was removed since it
no longer applies to any of the three supported colors.

## Per-color plate anchors

`plateAnchors.ts` keys plate anchors by **both** color and placement — every
`(color, placement)` pair is a full, independent `PlateAnchor` value, edited
in one place:

```ts
const PLATE_ANCHORS_BY_COLOR: Record<VehicleColor, Record<DetectorPlacement, PlateAnchor>>

function getPlateAnchor(color: VehicleColor, placement: DetectorPlacement): PlateAnchor
```

`getPlateAnchor` is a plain lookup — no merging with a "base" anchor happens
at read time, so what's written in a color's block is exactly what renders
for that color. This exists because the `red`/`gray` images are **not**
simple recolors of the blue render — each is a separately generated image
with its own crop, car scale, and plate position within the 1536×1024
canvas, sometimes noticeably different from blue's framing (e.g.
`center_front`'s plate sits ~5.5px right / ~13px up from blue's on the full
canvas). Using blue's anchor unmodified for those colors visibly
misplaces/mis-sizes the plate. `VehicleAssetLayer` (both the real plate
render and the Anchor bounds debug overlay) calls
`getPlateAnchor(config.vehicleColor, placement)`.

`PLATE_ANCHORS` (blue's anchor set alone, keyed only by placement) is kept
as a backwards-compatible alias to `PLATE_ANCHORS_BY_COLOR.blue`.

**Calibration status (as of this phase):** `blue` is fully calibrated
(the original baseline). `center_front` is calibrated for both `red` and
`gray` (measured directly against the blue asset). The other 5 placements
for `red`/`gray` currently hold either blue's values copied over (a
reasonable starting point, not yet verified) or values already adjusted
in-app — check each entry's numbers against what you see with Visual QA →
Anchor bounds: ON before assuming it's final. To calibrate: run the app,
enable that overlay, switch to the color being tuned, and adjust
`xPct`/`yPct`/`wPct`/`hPct` (and `rotateDeg`/`skewXDeg`/`skewYDeg` if the
angle looks wrong) directly in that color's block in
`PLATE_ANCHORS_BY_COLOR` until the green dashed rect lands on the plate.

## How to add a new color's real assets

1. Render/obtain 6 PNGs (one per placement) with **identical geometry** to
   the existing blue set (same 1536×1024 canvas, same camera framing).
2. Drop them at `apps/web/public/assets/vehicles/main-car/<color>/<placement>.png`.
3. Populate that color's object in `VEHICLE_ASSET_REGISTRY` in `assetRegistry.tsx`
   with the 6 `AssetEntry` objects (same shape as the `blue` ones).
4. That's it — `VehicleAssetLayer`, `getVehicleAsset`, and the UI swatch
   selector need no changes. The color stops falling back automatically the
   moment its registry entries exist.
5. If the new asset's geometry differs from blue's, also see the anchor
   caveat above — do not skip visual QA (Anchor bounds overlay) for the new
   color.

To add a color beyond `blue`/`red`/`gray` entirely, also add it to the
`VehicleColor` union and the `VEHICLE_COLORS` array in
`packages/shared/src/types/simulation.ts`, and to `COLOR_MAP`/`VEHICLE_COLOR_HEX`
in `ControlPanel.tsx`/`PlateListsPanel.tsx` (swatch hex colors).

## Status update — red/gray assets added

`red` and `gray` PNG sets (all 6 placements each, 1536×1024) were added at
`apps/web/public/assets/vehicles/main-car/{red,gray}/` and wired into
`VEHICLE_ASSET_REGISTRY` in `assetRegistry.tsx`. Unlike the initial
assumption above, these turned out to **not** share blue's exact crop/
framing/plate position — see "Per-color plate-anchor overrides" above for
what was measured and what still needs in-app calibration.

## How `vehicleColor` is saved in a `PlateList`

`PlateList.simulationDefaults.vehicleColor: VehicleColor` — a saved list
carries its own vehicle color as part of its defaults, applied when the list
is run or loaded into the queue (see `docs/PLATE_LISTS_SPEC.md`). Import
validates this field against `VEHICLE_COLORS` and rejects the list if it's
missing or not one of `'blue' | 'red' | 'gray'`.
