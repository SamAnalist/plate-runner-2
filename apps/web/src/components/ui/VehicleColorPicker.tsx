import type { VehicleColor } from '@plate-runner/shared';

/** Single source of truth for the color swatch hex values — was duplicated as COLOR_MAP/VEHICLE_COLOR_HEX in three separate files. */
export const VEHICLE_COLOR_HEX: Record<VehicleColor, string> = {
  blue: '#2563eb',
  red: '#dc2626',
  gray: '#6b7280',
};

const VEHICLE_COLOR_LABEL: Record<VehicleColor, string> = {
  blue: 'Blue',
  red: 'Red',
  gray: 'Gray',
};

const SIZE = {
  sm: { dot: 'w-7 h-7', check: 12, label: 'text-[9px]' },
  md: { dot: 'w-9 h-9', check: 14, label: 'text-[10px]' },
} as const;

/** Small white check badge shown on the selected swatch — a color-independent confirmation beyond just the ring, so selection reads clearly even for very similar-looking colors. */
function CheckBadge({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 12.5l5 5L20 7" stroke="white" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Vehicle color swatch picker — a small enhancement over the original bare
 * dots: each swatch gets a soft glow in its own color when selected (not
 * just a white border), a check badge so selection doesn't rely on color
 * alone, a subtle hover lift, and a text label underneath so the color
 * name is always legible (not just inferred from the dot).
 */
export function VehicleColorPicker({
  value,
  onChange,
  size = 'md',
  fullWidth = false,
}: {
  value: VehicleColor;
  onChange: (v: VehicleColor) => void;
  size?: 'sm' | 'md';
  /** Spreads the three swatches evenly across the row instead of sitting left-aligned at their natural size — only really reads well while there are just a few colors. */
  fullWidth?: boolean;
}) {
  const s = SIZE[size];
  return (
    <div className={fullWidth ? 'flex gap-2' : 'flex gap-3'}>
      {(Object.keys(VEHICLE_COLOR_HEX) as VehicleColor[]).map(color => {
        const selected = value === color;
        return (
          <button
            key={color}
            type="button"
            title={VEHICLE_COLOR_LABEL[color]}
            aria-label={VEHICLE_COLOR_LABEL[color]}
            aria-pressed={selected}
            onClick={() => onChange(color)}
            className={`flex flex-col items-center gap-1.5 group transition-all py-1 ${fullWidth ? 'flex-1' : ''}`}
          >
            <span
              className={`relative flex items-center justify-center rounded-full border-2 transition-all duration-150 ${s.dot} ${
                selected
                  ? 'border-white/90 scale-110'
                  : 'border-white/15 group-hover:border-white/40 group-hover:scale-105'}`}
              style={{
                backgroundColor: VEHICLE_COLOR_HEX[color],
                boxShadow: selected ? `0 0 0 3px rgba(0,0,0,0.35), 0 0 12px 1px ${VEHICLE_COLOR_HEX[color]}99` : undefined,
              }}
            >
              {selected && <CheckBadge size={s.check} />}
            </span>
            <span className={`font-mono font-semibold tracking-wide transition-colors ${s.label} ${
              selected ? 'text-white/85' : 'text-white/35 group-hover:text-white/60'}`}
            >
              {VEHICLE_COLOR_LABEL[color]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
