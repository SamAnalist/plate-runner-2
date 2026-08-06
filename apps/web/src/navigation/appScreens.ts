export type AppScreen =
  | 'home'
  | 'local'
  | 'display'
  | 'controller'
  | 'lists'
  | 'scheduler'
  | 'history'
  | 'settings';

export interface AppScreenMeta {
  id: AppScreen;
  label: string;
  description: string;
}

export const APP_SCREENS: AppScreenMeta[] = [
  { id: 'home', label: 'Home', description: 'Overview of every module.' },
  { id: 'local', label: 'Local Simulator', description: 'Simulate a car and license plate right on this machine.' },
  { id: 'display', label: 'Display Mode', description: 'Turn this screen into a display that receives plates and commands from a paired Controller.' },
  { id: 'controller', label: 'Controller Mode', description: 'Control a paired Display from this computer.' },
  { id: 'lists', label: 'Plate Lists', description: 'Create, import, export, and run saved sets of plates.' },
  { id: 'scheduler', label: 'Scheduler', description: 'Run saved Plate Lists automatically, on a schedule.' },
  { id: 'history', label: 'Execution History', description: 'A record of every past Plate List run.' },
  { id: 'settings', label: 'Settings / API', description: 'API connection, System Status, Screen Saver, backups, and local storage.' },
];

const SCREEN_IDS = new Set<string>(APP_SCREENS.map(s => s.id));

export function isAppScreen(value: unknown): value is AppScreen {
  return typeof value === 'string' && SCREEN_IDS.has(value);
}
