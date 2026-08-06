import { useCallback, useState } from 'react';
import { type AppScreen, isAppScreen } from '../navigation/appScreens';

const STORAGE_KEY = 'plate-runner:last-screen:v1';

function loadScreen(): AppScreen {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (isAppScreen(raw)) return raw;
  } catch {
    // localStorage unavailable — fall through to default.
  }
  return 'home';
}

export interface PersistentAppScreenControls {
  screen: AppScreen;
  setScreen: (screen: AppScreen) => void;
}

export function usePersistentAppScreen(): PersistentAppScreenControls {
  const [screen, setScreenState] = useState<AppScreen>(() => loadScreen());

  const setScreen = useCallback((next: AppScreen) => {
    setScreenState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // best-effort — screen still switches in-memory even if persistence fails
    }
  }, []);

  return { screen, setScreen };
}
