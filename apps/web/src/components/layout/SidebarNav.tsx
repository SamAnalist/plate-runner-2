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
  divider = false,
}: {
  title: string;
  items: NavItem[];
  screen: AppScreen;
  onNavigate: (s: AppScreen) => void;
  divider?: boolean;
}) {
  return (
    <div className={divider ? 'pt-4 border-t border-white/8' : ''}>
      <p className="px-3 text-[10px] font-semibold text-white/30 uppercase tracking-[0.16em] mb-2">
        {title}
      </p>
      <div className="flex flex-col gap-0.5">
        {items.map(item => {
          const active = screen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                relative text-left pl-3.5 pr-3 py-1.5 rounded-md text-xs font-mono font-semibold
                transition-colors duration-150
                ${active
                  ? 'bg-blue-600/20 text-white'
                  : 'text-white/45 hover:text-white/80 hover:bg-white/5'}
              `}
            >
              {active && (
                <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-blue-500" />
              )}
              {item.label}
            </button>
          );
        })}
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
    <nav className="w-52 shrink-0 border-r border-white/8 bg-[#0a0b0f] px-2.5 py-4 flex flex-col gap-4 overflow-y-auto">
      <NavGroup title="Modes" items={MODES} screen={screen} onNavigate={onNavigate} />
      <NavGroup title="Data" items={DATA} screen={screen} onNavigate={onNavigate} divider />
      <NavGroup title="Settings" items={SETTINGS} screen={screen} onNavigate={onNavigate} divider />
    </nav>
  );
}
