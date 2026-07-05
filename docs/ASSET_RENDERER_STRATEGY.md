# Asset Renderer Strategy — Plate Runner

**Phase:** 0.4 → 0.4c (corrected)
**Date:** 2026-07-04
**Status:** Architecture complete — 6 per-view raster slots, placeholder SVGs installed, photorealistic assets NOT YET PRODUCED

---

## 1. Problem with Prior Approach

The original renderers (`ClassicSvgRenderer`, `RealisticRenderer`, etc.) drew the car body and the license plate in the same component pass. This created several problems:

- **Plate text baked into car render**: Any change to the plate forced a full car re-render.
- **No clear seam for raster asset swap**: Replacing the SVG body with a PNG required rewriting how the plate was positioned.
- **Scaling was implicit**: The plate's pixel position was computed from magic constants rather than a documented anchor system.
- **Safety was incidental**: Plate text injection prevention depended on the LicensePlate component being called, not on an architecture that enforced it.

---

## 2. Alternatives Evaluated

| Approach | Verdict |
|---|---|
| Keep SVG car + inline plate | ❌ Plate remains coupled; no upgrade path |
| CSS background-image + HTML plate | ❌ HTML plate = injection risk; no SVG transform compositing |
| Three.js textured mesh | ❌ Premature; no 3D content pipeline yet |
| SVG `<image>` + SVG plate overlay | ✅ Native SVG stacking, compositable, same transform context |
| Asset registry + SVG prototype now / PNG later | ✅ **Chosen** — clean seam, zero refactor when real assets arrive |

---

## 3. Asset Plan

### Current State (Phase 0.4c)

```
AssetViewKey = 'center_front' | 'driver_front' | 'passenger_front'
             | 'center_back'  | 'driver_back'  | 'passenger_back'

ASSET_REGISTRY = {
  center_front:    { type: 'raster', src: '/assets/vehicles/main-car/center-front.svg',    isPlaceholder: true }
  driver_front:    { type: 'raster', src: '/assets/vehicles/main-car/driver-front.svg',    isPlaceholder: true }
  passenger_front: { type: 'raster', src: '/assets/vehicles/main-car/passenger-front.svg', isPlaceholder: true }
  center_back:     { type: 'raster', src: '/assets/vehicles/main-car/center-back.svg',     isPlaceholder: true }
  driver_back:     { type: 'raster', src: '/assets/vehicles/main-car/driver-back.svg',     isPlaceholder: true }
  passenger_back:  { type: 'raster', src: '/assets/vehicles/main-car/passenger-back.svg',  isPlaceholder: true }
}
```

Each placeholder SVG shows a **schematic car from the correct angle**:
- Front views (blue): symmetric (center) or trapezoidal 3/4 body (driver/passenger)
- Rear views (red): same geometry, tail-light details
- Each SVG has the plate area outlined in yellow at the correct anchor position
- All are labelled "PLACEHOLDER" and the view key abbreviation (CF, DF, PF, CB, DB, PB)

**The SVG prototypes (`AssetCarFront`/`AssetCarRear`) are removed from the registry.** They are no longer used. The `svg-prototype` union member is retained in `AssetEntry` as a deprecated type only.

### Future State (PNG/WebP Assets)

When a 3D-rendered or AI-generated vehicle asset is ready:

```ts
ASSET_REGISTRY['front'] = {
  type: 'raster',
  src: '/assets/vehicles/main-car/center-front.webp',
  naturalW: 400,
  naturalH: 288,
};
```

`VehicleAssetLayer` renders it as `<image href={src} width={CAR_LW} height={CAR_LH} preserveAspectRatio="none" />` and the plate overlay is placed identically — no other code changes.

### Asset Production Pipeline (Recommended)

1. **Source model**: A 3D sedan model (Blender, SketchUp, or AI-generated)
2. **Render passes**: Front view and rear view at 400×288px, transparent background
3. **Format**: WebP with alpha channel (or PNG fallback)
4. **Naming convention**: `center-front.webp`, `center-rear.webp`
5. **Registration**: Add entry to `ASSET_REGISTRY` in `assetRegistry.tsx`
6. **Validation**: Run `npx tsc --noEmit` + visual check in Asset Realistic style

---

## 4. Plate Overlay Strategy

The license plate is **always** a separate layer, never included in the car asset.

### Why

- **Security**: Plate text is never in a static file or base64-encoded blob; it is always rendered via the `LicensePlate` SVG component which enforces sanitisation.
- **Runtime change**: Plate can update without touching the car body.
- **Asset portability**: A new car PNG asset requires only updating `ASSET_REGISTRY`; the plate overlay logic is unchanged.
- **Consistency**: All six detector placements share the same overlay path — visual differences come only from the scene transform (skewX).

### Anchor System

Plate positions are defined as **percentages of the 100×72 local space**:

```ts
STANDARD_FRONT = { xPct: 0.29, yPct: 0.75, wPct: 0.42, hPct: 0.181, isFront: true }
STANDARD_REAR  = { xPct: 0.29, yPct: 0.75, wPct: 0.42, hPct: 0.181, isFront: false }
```

These match the legacy constants `CAR_PLATE_X=29, CAR_PLATE_Y=54, CAR_PLATE_W=42, CAR_PLATE_H=13` exactly. When a raster asset with different natural dimensions is introduced, only `anchorToLocalRect()` is called with the new `naturalW/naturalH` — the percentages remain valid.

---

## 5. Renderer Architecture

```
AssetRealisticRenderer
  └── AssetGate         (inline, Framer Motion arm)
  └── VehicleAssetLayer
        └── ASSET_REGISTRY[viewKey].render(palette)   ← car body (no plate)
        └── DynamicPlateOverlay                        ← plate always separate
              └── LicensePlate                         ← safe SVG text component
```

Full breakdown: see [`docs/RENDERER_ARCHITECTURE.md`](./RENDERER_ARCHITECTURE.md).

---

## 6. Trade-offs

| Decision | Pro | Con |
|---|---|---|
| SVG prototype now, not PNG | Ships immediately, no content pipeline needed | Car looks stylised, not photorealistic |
| Percentage-based anchors | Works for any asset size | Requires per-asset tuning if plate position differs in future car models |
| Inline `AssetGate` in `AssetRealisticRenderer` | Keeps component count low | Gate must be manually updated if extracted to `GateAssetLayer` |
| Single `front` / `rear` view key | Simple; skew handles driver/passenger variants | Cannot use a truly angled asset (e.g., 3/4 view) without extending `AssetViewKey` |

---

## 7. Future Asset Production Notes

When ordering or generating assets for Plate Runner vehicles:

- **Resolution**: 400×288px minimum; 800×576px preferred for retina screens
- **Background**: Transparent (alpha channel required)
- **Lighting**: Soft diffuse from above-front; avoid hard shadows that fight the scene background
- **Car model**: Generic sedan, no distinctive brand markings
- **Plate area**: The real vehicle number plate must be either absent or covered by a neutral blank area — the overlay will handle the text
- **Format**: WebP with alpha (`.webp`); PNG fallback for older browsers
- **Delivery**: Drop into `apps/web/public/assets/vehicles/` and update `ASSET_REGISTRY`
