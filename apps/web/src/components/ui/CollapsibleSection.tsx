import { useState } from 'react';
import { Badge } from './Badge';

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  badge,
  /** Size of the ▾/▸ chevron — bump this up in roomier layouts (e.g. Settings) where the default reads too small. */
  chevronClassName = 'text-[10px]',
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
  chevronClassName?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-1 mb-2 group"
      >
        <p className="text-[10px] font-semibold text-white/35 uppercase tracking-[0.16em] group-hover:text-white/55 transition-colors flex items-center gap-1.5">
          {title}
          {badge && <Badge tone="info">{badge}</Badge>}
        </p>
        <span className={`text-white/25 group-hover:text-white/45 transition-colors ${chevronClassName}`}>
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}
