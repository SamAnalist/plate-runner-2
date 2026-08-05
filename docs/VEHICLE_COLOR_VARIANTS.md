# Vehicle Color Variants (Phase 0.6)

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
one PNG per `(color, placement)` pair (6 placements × N colors). Today only
`blue/` exists — the original 6 PNGs were moved there from the old flat
`main-car/<placement>.png` layout.

The registry (`apps/web/src/components/simulation/renderers/asset-realistic/assetRegistry.tsx`)
is keyed by both dimensions:

```ts
const VEHICLE_ASSET_REGISTRY: Record<VehicleColor, Partial<Record<AssetViewKey, AssetEntry>>> = {
  blue: { center_front: {...}, driver_front: {...}, /* all 6 */ },
  red:  {},
  gray: {},
};
```

`red` and `gray` are intentionally empty objects — **no placeholder or fake
images were created**, per explicit instruction. A resolver function is the
only way rendering code reads from this registry:

```ts
function getVehicleAsset({ color, placement }): { src, width, height, fallbackUsed }
```

## Fallback behavior

`getVehicleAsset` falls back to the `blue` entry for the same placement when
the requested color has no asset:

```ts
const entry = VEHICLE_ASSET_REGISTRY[color][placement];
const resolved = entry ?? BLUE_ASSETS[placement];
fallbackUsed = !entry;
```

So today, selecting `red` or `gray` renders the car as **blue** — visually
identical to selecting blue — until real red/gray PNGs are added. This is
surfaced in two places:
- The `Vehicle Color` swatch selector shows a note — *"No dedicated asset yet
  — rendering as blue until one is added."* — whenever a non-blue color is
  selected.
- `VehicleAsset.fallbackUsed` is available to any future consumer that wants
  to react to this programmatically (e.g. a debug overlay), though nothing
  currently renders it.

This was the explicitly preferred option (Option A) over leaving red/gray
unselectable or un-rendered (Option B) — it never breaks the app, and the
fallback is clearly documented rather than silently indistinguishable from
"red actually looks like this."

## Shared plate-anchor geometry requirement

`PLATE_ANCHORS` (`plateAnchors.ts`) is keyed **only by placement**, not by
color — the same anchor (plate position, size, skew) is used for every
color's asset at a given placement. This only stays correct as long as every
color's image for a given placement has **the same crop, framing, and
perspective** as the blue reference (same 1536×1024 canvas, same camera
angle, same car position within the frame).

**If a future color's asset has different geometry** (different crop,
different camera angle, different plate position within the frame), the
anchors will be wrong for that color and `plateAnchors.ts` will need to
become color-aware (e.g. `Record<VehicleColor, Record<AssetViewKey, PlateAnchor>>`,
mirroring how the asset registry itself is now color-keyed). This is *not*
implemented yet — flagged here so it isn't missed when a genuinely different
asset (not just a recolor) is introduced.

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

## How `vehicleColor` is saved in a `PlateList`

`PlateList.simulationDefaults.vehicleColor: VehicleColor` — a saved list
carries its own vehicle color as part of its defaults, applied when the list
is run or loaded into the queue (see `docs/PLATE_LISTS_SPEC.md`). Import
validates this field against `VEHICLE_COLORS` and rejects the list if it's
missing or not one of `'blue' | 'red' | 'gray'`.
