export type SettingsCardAccent = 'blue' | 'cyan' | 'violet' | 'emerald' | 'amber' | 'red' | 'slate';

const ACCENT_CLASSES: Record<SettingsCardAccent, { border: string; glow: string; dot: string }> = {
  blue:    { border: 'border-l-blue-500/70',    glow: 'from-blue-500/10',    dot: 'bg-blue-400' },
  cyan:    { border: 'border-l-cyan-500/70',    glow: 'from-cyan-500/10',    dot: 'bg-cyan-400' },
  violet:  { border: 'border-l-violet-500/70',  glow: 'from-violet-500/10',  dot: 'bg-violet-400' },
  emerald: { border: 'border-l-emerald-500/70', glow: 'from-emerald-500/10', dot: 'bg-emerald-400' },
  amber:   { border: 'border-l-amber-500/70',   glow: 'from-amber-500/10',   dot: 'bg-amber-400' },
  red:     { border: 'border-l-red-500/70',     glow: 'from-red-500/10',     dot: 'bg-red-400' },
  slate:   { border: 'border-l-slate-400/60',   glow: 'from-white/5',        dot: 'bg-slate-400' },
};

/** Visually distinct, color-coded card used to group a Settings section — a step up from a plain heading + content stack. */
export function SettingsCard({
  title,
  description,
  accent = 'slate',
  action,
  children,
}: {
  title: string;
  description?: string;
  accent?: SettingsCardAccent;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const c = ACCENT_CLASSES[accent];
  return (
    <div className={`relative rounded-xl border border-white/8 border-l-[3px] ${c.border} bg-gradient-to-br ${c.glow} to-transparent bg-[#12141a] overflow-hidden`}>
      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full ${c.dot} opacity-[0.06] blur-2xl pointer-events-none`} />
      <div className="relative px-5 py-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
            <h2 className="text-xs font-mono font-bold text-white/80 uppercase tracking-widest">
              {title}
            </h2>
          </div>
          {action}
        </div>
        {description && (
          <p className="text-[10px] text-white/35 font-mono leading-snug mb-3 -mt-1.5">
            {description}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
