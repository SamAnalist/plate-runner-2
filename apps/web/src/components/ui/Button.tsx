import type { ButtonHTMLAttributes } from 'react';

export type ButtonTone = 'neutral' | 'primary' | 'danger' | 'warn';
export type ButtonVariant = 'pill' | 'solid' | 'ghost';
export type ButtonSize = 'sm' | 'md';

const PILL_TONE: Record<ButtonTone, string> = {
  neutral: 'border-white/12 text-white/55 hover:text-white/85 hover:border-white/25 bg-white/5',
  primary: 'border-blue-500/60 text-blue-300 hover:bg-blue-600/20 bg-blue-600/10',
  danger: 'border-red-500/40 text-red-400 hover:bg-red-500/15 bg-white/5',
  warn: 'border-yellow-400/50 text-yellow-300 hover:bg-yellow-500/15 bg-white/5',
};

const GHOST_TONE: Record<ButtonTone, string> = {
  neutral: 'border-white/12 text-white/50 hover:text-white/80 hover:border-white/25 bg-white/5',
  primary: 'border-blue-500/40 text-blue-300 hover:bg-blue-600/15 bg-transparent',
  danger: 'border-red-500/30 text-red-400/80 hover:bg-red-500/10 bg-transparent',
  warn: 'border-yellow-400/40 text-yellow-300/90 hover:bg-yellow-500/10 bg-transparent',
};

const SOLID_TONE: Record<ButtonTone, string> = {
  neutral: 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/12',
  primary: 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/60',
  danger: 'bg-red-600/80 hover:bg-red-600 text-white border border-red-500/60',
  warn: 'bg-yellow-500/20 border-2 border-yellow-400/70 text-yellow-300 hover:bg-yellow-500/35 hover:border-yellow-300',
};

const SIZE_CLASSES: Record<ButtonVariant, Record<ButtonSize, string>> = {
  pill: { sm: 'px-2.5 py-1.5 rounded text-[10px]', md: 'px-3 py-2 rounded-md text-xs' },
  ghost: { sm: 'px-2.5 py-1.5 rounded text-xs', md: 'py-1.5 px-3 rounded text-xs' },
  solid: { sm: 'px-3 py-1.5 rounded-md text-xs', md: 'py-2 rounded-md text-sm' },
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  tone = 'neutral',
  variant = 'pill',
  size = 'sm',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const toneClasses =
    variant === 'solid' ? SOLID_TONE[tone] :
    variant === 'ghost' ? GHOST_TONE[tone] :
    PILL_TONE[tone];

  return (
    <button
      {...rest}
      className={`
        font-mono font-semibold border transition-all
        disabled:opacity-30 disabled:cursor-not-allowed
        ${SIZE_CLASSES[variant][size]} ${toneClasses} ${className}
      `}
    >
      {children}
    </button>
  );
}
