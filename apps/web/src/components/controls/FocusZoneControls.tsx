import type { FocusZoneConfig } from '@plate-runner/shared';

interface FocusZoneControlsProps {
  focusZone: FocusZoneConfig;
  onChange: (fz: FocusZoneConfig) => void;
}

function set<K extends keyof FocusZoneConfig>(
  fz: FocusZoneConfig,
  key: K,
  value: FocusZoneConfig[K],
  onChange: (fz: FocusZoneConfig) => void,
) {
  onChange({ ...fz, [key]: value });
}

function NumSlider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between">
        <span className="text-[10px] text-white/40 font-mono">{label}</span>
        <span className="text-[10px] text-white/60 font-mono font-bold">{value}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 accent-cyan-400 rounded cursor-pointer"
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`
        flex items-center gap-2 w-full px-2.5 py-1.5 rounded text-xs font-mono
        border transition-all text-left
        ${checked
          ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
          : 'bg-white/4 border-white/10 text-white/40 hover:text-white/60'
        }
      `}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
        checked ? 'bg-cyan-400' : 'bg-white/20'
      }`} />
      {label}
    </button>
  );
}

export function FocusZoneControls({ focusZone, onChange }: FocusZoneControlsProps) {
  return (
    <div className="flex flex-col gap-2.5">
      {/* Toggles */}
      <div className="flex flex-col gap-1.5">
        <Toggle
          label="Focus zone enabled"
          checked={focusZone.enabled}
          onChange={v => set(focusZone, 'enabled', v, onChange)}
        />
        <Toggle
          label="Show overlay"
          checked={focusZone.showOverlay}
          onChange={v => set(focusZone, 'showOverlay', v, onChange)}
        />
      </div>

      {/* Position sliders */}
      <div className="flex flex-col gap-2">
        <NumSlider
          label="X position"
          value={focusZone.xPercent}
          min={0}
          max={90}
          onChange={v => set(focusZone, 'xPercent', v, onChange)}
        />
        <NumSlider
          label="Y position"
          value={focusZone.yPercent}
          min={0}
          max={90}
          onChange={v => set(focusZone, 'yPercent', v, onChange)}
        />
        <NumSlider
          label="Width"
          value={focusZone.widthPercent}
          min={5}
          max={100}
          onChange={v => set(focusZone, 'widthPercent', v, onChange)}
        />
        <NumSlider
          label="Height"
          value={focusZone.heightPercent}
          min={5}
          max={100}
          onChange={v => set(focusZone, 'heightPercent', v, onChange)}
        />
      </div>

      {/* Color + label */}
      <div className="flex items-center gap-2">
        <label className="text-[10px] text-white/40 font-mono">Border color</label>
        <input
          type="color"
          value={focusZone.borderColor}
          onChange={e => set(focusZone, 'borderColor', e.target.value, onChange)}
          className="w-8 h-6 rounded cursor-pointer border border-white/20 bg-transparent"
        />
        <span className="text-[10px] font-mono text-white/30">{focusZone.borderColor}</span>
      </div>

      <div className="flex flex-col gap-0.5">
        <label className="text-[10px] text-white/40 font-mono">Label</label>
        <input
          type="text"
          value={focusZone.label}
          onChange={e => set(focusZone, 'label', e.target.value.slice(0, 24), onChange)}
          maxLength={24}
          className="w-full px-2 py-1 rounded bg-white/5 border border-white/15
                     text-xs font-mono text-white/70 outline-none
                     focus:border-cyan-500/50 transition-colors"
        />
      </div>

      {/* Reset to default */}
      <button
        onClick={() => onChange({
          enabled: true,
          showOverlay: true,
          xPercent: 33,
          yPercent: 47,
          widthPercent: 34,
          heightPercent: 24,
          borderColor: '#22d3ee',
          label: 'CAMERA FOCUS',
        })}
        className="text-[10px] font-mono text-white/30 hover:text-white/55
                   text-left underline underline-offset-2 transition-colors"
      >
        Reset to default position
      </button>
    </div>
  );
}
