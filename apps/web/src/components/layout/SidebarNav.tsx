import type { AppScreen } from '../../navigation/appScreens';

interface NavItem {
  id: AppScreen;
  label: string;
}

const MODES: NavItem[] = [
  { id: 'home', label: 'Home' },
  { id: 'local', label: 'Local' },
  { id: 'display', label: 'Display' },
  { id: 'controller', label: 'Controller' },
];

const DATA: NavItem[] = [
  { id: 'lists', label: 'Plate Lists' },
  { id: 'scheduler', label: 'Scheduler' },
  { id: 'history', label: 'Execution History' },
];

const SETTINGS: NavItem[] = [
  { id: 'settings', label: 'Settings / API' },
];

function NavGroup({
  title,
  items,
  screen,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  screen: AppScreen;
  onNavigate: (s: AppScreen) => void;
}) {
  return (
    <div>
      <p className="px-3 text-[10px] font-semibold text-white/30 uppercase tracking-[0.16em] mb-1.5">
        {title}
      </p>
      <div className="flex flex-col gap-0.5">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`
              text-left px-3 py-1.5 rounded text-xs font-mono font-semibold
              transition-all
              ${screen === item.id
                ? 'bg-blue-600/80 text-white'
                : 'text-white/45 hover:text-white/80 hover:bg-white/5'}
            `}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SidebarNav({
  screen,
  onNavigate,
}: {
  screen: AppScreen;
  onNavigate: (s: AppScreen) => void;
}) {
  return (
    <nav className="w-52 shrink-0 border-r border-white/8 bg-[#0a0b0f] px-2 py-4 flex flex-col gap-5 overflow-y-auto">
      <NavGroup title="Modes" items={MODES} screen={screen} onNavigate={onNavigate} />
      <NavGroup title="Data" items={DATA} screen={screen} onNavigate={onNavigate} />
      <NavGroup title="Settings" items={SETTINGS} screen={screen} onNavigate={onNavigate} />
    </nav>
  );
}
