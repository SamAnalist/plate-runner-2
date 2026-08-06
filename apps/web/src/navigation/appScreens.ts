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
  { id: 'local', label: 'Local Simulator', description: 'Run plates directly on this machine.' },
  { id: 'display', label: 'Display Mode', description: 'Use this computer as a remote display for camera testing.' },
  { id: 'controller', label: 'Controller Mode', description: 'Control a paired display from this computer.' },
  { id: 'lists', label: 'Plate Lists', description: 'Create, import, export, and run saved plate lists.' },
  { id: 'scheduler', label: 'Scheduler', description: 'Schedule saved lists to run automatically.' },
  { id: 'history', label: 'Execution History', description: 'Review local execution logs.' },
  { id: 'settings', label: 'Settings / API', description: 'Configure API connection and local listener.' },
];

const SCREEN_IDS = new Set<string>(APP_SCREENS.map(s => s.id));

export function isAppScreen(value: unknown): value is AppScreen {
  return typeof value === 'string' && SCREEN_IDS.has(value);
}
