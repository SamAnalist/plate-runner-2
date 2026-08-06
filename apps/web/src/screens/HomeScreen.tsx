import type { AppScreen, AppScreenMeta } from '../navigation/appScreens';
import { APP_SCREENS } from '../navigation/appScreens';
import { Badge } from '../components/ui/Badge';

interface HomeScreenProps {
  onNavigate: (screen: AppScreen) => void;
  statusById: Partial<Record<AppScreen, string>>;
}

const MONOGRAM: Partial<Record<AppScreen, string>> = {
  local: 'LO',
  display: 'DI',
  controller: 'CO',
  lists: 'PL',
  scheduler: 'SC',
  history: 'EX',
  settings: 'ST',
};

function Card({
  meta,
  status,
  onNavigate,
  primary = false,
}: {
  meta: AppScreenMeta;
  status?: string;
  onNavigate: (screen: AppScreen) => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={() => onNavigate(meta.id)}
      className={`
        text-left flex flex-col gap-2.5 p-5 rounded-lg border transition-all group
        ${primary
          ? 'bg-gradient-to-br from-blue-600/15 to-[#0f1117] border-blue-500/30 hover:border-blue-400/60 lg:col-span-2'
          : 'bg-[#0f1117] border-white/10 hover:border-blue-500/40 hover:bg-[#12141c]'}
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-mono font-bold shrink-0 border ${
              primary
                ? 'bg-blue-600/25 border-blue-500/40 text-blue-200'
                : 'bg-white/5 border-white/10 text-white/50'}`}
          >
            {MONOGRAM[meta.id]}
          </span>
          <p className="text-sm font-mono font-bold text-white/90">{meta.label}</p>
        </div>
        {primary ? (
          <Badge tone="info" className="shrink-0">Start here</Badge>
        ) : (
          <span className="text-white/20 group-hover:text-blue-400 transition-colors text-xs shrink-0">→</span>
        )}
      </div>
      <p className="text-xs text-white/40 font-mono leading-snug">{meta.description}</p>
      {status && <Badge tone="neutral" className="w-fit">{status}</Badge>}
    </button>
  );
}

export function HomeScreen({ onNavigate, statusById }: HomeScreenProps) {
  const cards = APP_SCREENS.filter(s => s.id !== 'home');

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-mono font-bold text-white tracking-tight">
          Plate Runner
        </h1>
        <p className="text-sm text-white/40 font-mono mt-1">
          Choose a module below to get started.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(meta => (
          <Card
            key={meta.id}
            meta={meta}
            status={statusById[meta.id]}
            onNavigate={onNavigate}
            primary={meta.id === 'local'}
          />
        ))}
      </div>
    </div>
  );
}
