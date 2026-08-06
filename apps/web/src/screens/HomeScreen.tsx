import type { AppScreen, AppScreenMeta } from '../navigation/appScreens';
import { APP_SCREENS } from '../navigation/appScreens';

interface HomeScreenProps {
  onNavigate: (screen: AppScreen) => void;
  statusById: Partial<Record<AppScreen, string>>;
}

function Card({
  meta,
  status,
  onNavigate,
}: {
  meta: AppScreenMeta;
  status?: string;
  onNavigate: (screen: AppScreen) => void;
}) {
  return (
    <button
      onClick={() => onNavigate(meta.id)}
      className="text-left flex flex-col gap-2 p-4 rounded-lg
        bg-[#0f1117] border border-white/10 hover:border-blue-500/50
        hover:bg-[#12141c] transition-all group"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-mono font-bold text-white/85">{meta.label}</p>
        <span className="text-white/20 group-hover:text-blue-400 transition-colors text-xs">→</span>
      </div>
      <p className="text-xs text-white/40 font-mono leading-snug">{meta.description}</p>
      {status && (
        <p className="mt-1 text-[10px] font-mono text-cyan-400/70 bg-cyan-500/5 border border-cyan-500/15 rounded px-2 py-1 w-fit">
          {status}
        </p>
      )}
    </button>
  );
}

export function HomeScreen({ onNavigate, statusById }: HomeScreenProps) {
  const cards = APP_SCREENS.filter(s => s.id !== 'home');

  return (
    <div className="px-6 py-6 max-w-4xl">
      <div className="mb-5">
        <h1 className="text-sm font-mono font-bold text-white/70 uppercase tracking-widest">
          Welcome to Plate Runner
        </h1>
        <p className="text-xs text-white/35 font-mono mt-1">
          Pick a module to get started.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map(meta => (
          <Card key={meta.id} meta={meta} status={statusById[meta.id]} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}
