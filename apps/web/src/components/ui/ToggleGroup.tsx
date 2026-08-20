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
  /** 'md' = larger padding/text/icon gap — for icon-bearing toggles that need to read clearly (e.g. Vehicle Type). Default 'sm' matches every existing toggle's sizing exactly. */
  size?: 'sm' | 'md';
}

const SIZE_CLASSES: Record<'sm' | 'md', string> = {
  sm: 'px-2.5 py-1.5 text-xs gap-1.5',
  md: 'px-3.5 py-2.5 text-sm gap-2',
};

export function ToggleGroup<T extends string>({ options, value, onChange, fullWidth = false, size = 'sm' }: ToggleGroupProps<T>) {
  return (
    <div className={fullWidth ? 'flex gap-1' : 'flex gap-1 flex-wrap'}>
      {options.map(opt => (
        <button
          key={opt.value}
          title={opt.title}
          onClick={() => onChange(opt.value)}
          className={`
            rounded font-mono font-semibold
            border transition-all
            ${SIZE_CLASSES[size]}
            ${opt.icon ? 'flex items-center justify-center' : ''}
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
