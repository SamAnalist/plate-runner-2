import { useState, useCallback } from 'react';
import { validatePlate } from '@plate-runner/shared';

interface PlateInputProps {
  value: string;
  onChange: (normalized: string) => void;
}

export function PlateInput({ value, onChange }: PlateInputProps) {
  const [raw, setRaw]   = useState(value);
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      setRaw(input);

      // Validate on every keystroke for instant feedback
      const result = validatePlate(input);
      if (result.valid && result.normalized) {
        setError(null);
        onChange(result.normalized);
      } else {
        setError(result.error ?? null);
      }
    },
    [onChange],
  );

  const handleBlur = useCallback(() => {
    // On blur: normalize display to uppercase
    const result = validatePlate(raw);
    if (result.valid && result.normalized) {
      setRaw(result.normalized);
      setError(null);
    }
  }, [raw]);

  const isValid = !error && raw.length > 0;

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-white/50 uppercase tracking-widest">
        License Plate
      </label>

      <div className="relative">
        <input
          type="text"
          value={raw}
          onChange={handleChange}
          onBlur={handleBlur}
          maxLength={12}
          placeholder="ABC123"
          spellCheck={false}
          autoCapitalize="characters"
          className={`
            w-full px-3 py-2 rounded-md
            bg-white/5 border
            font-mono font-bold text-base tracking-[0.15em] text-white text-center
            outline-none transition-colors
            placeholder:text-white/20
            ${isValid
              ? 'border-white/20 focus:border-blue-500/60'
              : error
              ? 'border-red-500/60 focus:border-red-500/80'
              : 'border-white/20 focus:border-white/40'
            }
          `}
        />

        {/* Character count */}
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-white/25 font-mono">
          {raw.length}/12
        </span>
      </div>

      {/* Validation error */}
      {error && (
        <p className="text-[11px] text-red-400 font-mono leading-tight">{error}</p>
      )}

      {/* Valid indicator */}
      {isValid && (
        <p className="text-[11px] text-emerald-400/70 font-mono leading-tight">
          Plate accepted
        </p>
      )}
    </div>
  );
}
