import type { ReactNode } from 'react';
import type { AppScreen } from '../../navigation/appScreens';
import { SidebarNav } from './SidebarNav';

export interface StatusChip {
  label: string;
  detail: string;
  active: boolean;
}

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
      <header className="flex items-center justify-between px-5 py-2.5 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-mono font-bold text-white tracking-[0.12em] uppercase">
            Plate Runner
          </span>
          <span className="text-[10px] text-white/25 font-mono bg-white/5 px-1.5 py-0.5 rounded">
            v0.9
          </span>
        </div>

        <div className="flex items-center gap-2">
          {activeChips.map(chip => (
            <span
              key={chip.label}
              className="flex items-center gap-1.5 text-[10px] font-mono text-white/40 bg-white/5 border border-white/10 rounded px-2 py-1"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-white/55">{chip.label}:</span> {chip.detail}
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
