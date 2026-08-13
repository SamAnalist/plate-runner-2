export interface ToggleGroupOption<T extends string> {
  value: T;
  label: string;
  title?: string;
  /** Rendered after the label, inside the button — e.g. a small directional arrow. */
  icon?: React.ReactNode;
}

interface ToggleGroupProps<T extends string> {
  options: ToggleGroupOption<T>[];
  value: T;
  onChange: (v: T) => void;
  /** Buttons split the full row width evenly, single line, no wrap. */
  fullWidth?: boolean;
}

export function ToggleGroup<T extends string>({ options, value, onChange, fullWidth = false }: ToggleGroupProps<T>) {
  return (
    <div className={fullWidth ? 'flex gap-1' : 'flex gap-1 flex-wrap'}>
      {options.map(opt => (
        <button
          key={opt.value}
          title={opt.title}
          onClick={() => onChange(opt.value)}
          className={`
            px-2.5 py-1.5 rounded text-xs font-mono font-semibold
            border transition-all
            ${opt.icon ? 'flex items-center justify-center gap-1.5' : ''}
            ${fullWidth ? 'flex-1' : ''}
            ${value === opt.value
              ? 'bg-blue-600/80 border-blue-500/70 text-white'
              : 'bg-white/5 border-white/12 text-white/50 hover:text-white/80 hover:border-white/25'}
          `}
        >
          <span>{opt.label}</span>
          {opt.icon}
        </button>
      ))}
    </div>
  );
}
