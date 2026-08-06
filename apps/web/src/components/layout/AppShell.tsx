import type { ReactNode } from 'react';
import type { AppScreen } from '../../navigation/appScreens';
import { SidebarNav } from './SidebarNav';
import type { BadgeTone } from '../ui/Badge';

export interface StatusChip {
  label: string;
  detail: string;
  active: boolean;
  tone?: BadgeTone;
}

const DOT_TONE: Record<BadgeTone, string> = {
  neutral: 'bg-white/30',
  success: 'bg-emerald-400',
  info: 'bg-cyan-400',
  warning: 'bg-yellow-400',
  danger: 'bg-red-400',
};

export function AppShell({
  screen,
  onNavigate,
  statusChips,
  children,
}: {
  screen: AppScreen;
  onNavigate: (s: AppScreen) => void;
  statusChips: StatusChip[];
  children: ReactNode;
}) {
  const activeChips = statusChips.filter(c => c.active);

  return (
    <div className="flex flex-col h-screen bg-[#0a0b0f] overflow-hidden">
      <header className="flex items-center justify-between gap-4 px-5 py-3 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-sm font-mono font-bold text-white tracking-[0.14em] uppercase">
            Plate Runner
          </span>
          <span className="text-[10px] text-white/30 font-mono bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
            v0.9
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {activeChips.map(chip => (
            <span
              key={chip.label}
              className="flex items-center gap-1.5 text-[10px] font-mono text-white/45 bg-white/5 border border-white/10 rounded-md px-2 py-1 whitespace-nowrap"
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT_TONE[chip.tone ?? 'success']}`} />
              <span className="text-white/60">{chip.label}:</span> {chip.detail}
            </span>
          ))}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden min-h-0">
        <SidebarNav screen={screen} onNavigate={onNavigate} />
        <main className="flex-1 overflow-y-auto min-w-0 bg-[#080910]">
          {children}
        </main>
      </div>
    </div>
  );
}
