interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

/** Stepper-style number input (−/+ buttons flanking a centered value) — matches the app's rounded/dark control style instead of a bare native spinner. */
export function NumberField({ label, value, onChange, min, max, step = 1, className = '' }: NumberFieldProps) {
  function clamp(v: number): number {
    let n = Number.isFinite(v) ? v : (min ?? 0);
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    return n;
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider">{label}</span>
      <div className="flex items-stretch h-8 rounded-md border border-white/12 bg-white/5 overflow-hidden focus-within:border-blue-500/50 transition-colors">
        <button
          type="button"
          onClick={() => onChange(clamp(value - step))}
          disabled={min !== undefined && value <= min}
          className="w-6 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 active:bg-white/15 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-white/40 transition-colors font-mono text-xs select-none"
        >
          −
        </button>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={e => onChange(clamp(Number(e.target.value)))}
          className="w-10 text-center bg-transparent text-[11px] font-mono font-bold text-blue-300 outline-none
            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => onChange(clamp(value + step))}
          disabled={max !== undefined && value >= max}
          className="w-6 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 active:bg-white/15 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-white/40 transition-colors font-mono text-xs select-none"
        >
          +
        </button>
      </div>
    </div>
  );
}
