export type BadgeTone = 'neutral' | 'success' | 'info' | 'warning' | 'danger';

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-white/8 text-white/40 border-white/15',
  success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  info: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  warning: 'bg-yellow-500/15 text-yellow-300 border-yellow-400/35',
  danger: 'bg-red-500/15 text-red-400 border-red-500/35',
};

export function Badge({
  tone = 'neutral',
  pulse = false,
  children,
  className = '',
}: {
  tone?: BadgeTone;
  pulse?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`
        inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono
        font-semibold uppercase tracking-wide border
        ${TONE_CLASSES[tone]} ${pulse ? 'animate-pulse' : ''} ${className}
      `}
    >
      {children}
    </span>
  );
}
