import { useCallback, useEffect, useRef, useState } from 'react';

export type ScreenSaverStyle = 'floating_plate' | 'moving_logo' | 'subtle_gradient';

export interface ScreenSaverSettings {
  enabled: boolean;
  timeoutMinutes: number;
  style: ScreenSaverStyle;
  updatedAt: string;
}

export const SCREEN_SAVER_STORAGE_KEY = 'plate-runner:screensaver:v1';

const MIN_TIMEOUT_MINUTES = 1;
const MAX_TIMEOUT_MINUTES = 60;
const TICK_MS = 5000;
const STYLES: ScreenSaverStyle[] = ['floating_plate', 'moving_logo', 'subtle_gradient'];

export const DEFAULT_SCREEN_SAVER_SETTINGS: ScreenSaverSettings = {
  enabled: true,
  timeoutMinutes: 10,
  style: 'floating_plate',
  updatedAt: new Date(0).toISOString(),
};

function clampTimeout(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : DEFAULT_SCREEN_SAVER_SETTINGS.timeoutMinutes;
  return Math.min(MAX_TIMEOUT_MINUTES, Math.max(MIN_TIMEOUT_MINUTES, Math.round(n)));
}

function sanitize(raw: unknown): ScreenSaverSettings {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_SCREEN_SAVER_SETTINGS;
  const obj = raw as Record<string, unknown>;
  const style = STYLES.includes(obj.style as ScreenSaverStyle) ? (obj.style as ScreenSaverStyle) : DEFAULT_SCREEN_SAVER_SETTINGS.style;
  return {
    enabled: typeof obj.enabled === 'boolean' ? obj.enabled : DEFAULT_SCREEN_SAVER_SETTINGS.enabled,
    timeoutMinutes: clampTimeout(obj.timeoutMinutes),
    style,
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : new Date().toISOString(),
  };
}

function loadSettings(): ScreenSaverSettings {
  try {
    const raw = localStorage.getItem(SCREEN_SAVER_STORAGE_KEY);
    if (!raw) return DEFAULT_SCREEN_SAVER_SETTINGS;
    return sanitize(JSON.parse(raw));
  } catch {
    return DEFAULT_SCREEN_SAVER_SETTINGS;
  }
}

function saveSettings(settings: ScreenSaverSettings): void {
  try {
    localStorage.setItem(SCREEN_SAVER_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage unavailable — settings just won't survive a reload, non-fatal.
  }
}

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isEditingForm(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  return EDITABLE_TAGS.has(el.tagName) || (el as HTMLElement).isContentEditable;
}

export interface ScreenSaverControls {
  settings: ScreenSaverSettings;
  updateSettings: (partial: Partial<Omit<ScreenSaverSettings, 'updatedAt'>>) => void;
  resetSettings: () => void;
  isActive: boolean;
  dismiss: () => void;
  notifyActivity: () => void;
}

export function useScreenSaver({ busy }: { busy: boolean }): ScreenSaverControls {
  const [settings, setSettings] = useState<ScreenSaverSettings>(() => loadSettings());
  const [isActive, setIsActive] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const lastListenerWriteRef = useRef(0);

  const notifyActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIsActive(active => (active ? false : active));
  }, []);

  const dismiss = useCallback(() => {
    notifyActivity();
  }, [notifyActivity]);

  const updateSettings = useCallback((partial: Partial<Omit<ScreenSaverSettings, 'updatedAt'>>) => {
    setSettings(prev => {
      const next = sanitize({ ...prev, ...partial, updatedAt: new Date().toISOString() });
      saveSettings(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    const next = { ...DEFAULT_SCREEN_SAVER_SETTINGS, updatedAt: new Date().toISOString() };
    saveSettings(next);
    setSettings(next);
  }, []);

  // Window-level activity listeners — throttled ref writes, no re-render unless dismissing.
  useEffect(() => {
    const onActivity = () => {
      const now = Date.now();
      if (now - lastListenerWriteRef.current < 250) return;
      lastListenerWriteRef.current = now;
      notifyActivity();
    };
    const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel'];
    events.forEach(evt => window.addEventListener(evt, onActivity, { passive: true }));
    return () => events.forEach(evt => window.removeEventListener(evt, onActivity));
  }, [notifyActivity]);

  // Force-dismiss the instant the app becomes busy while the overlay is showing.
  useEffect(() => {
    if (busy && isActive) {
      setIsActive(false);
      lastActivityRef.current = Date.now();
    }
  }, [busy, isActive]);

  // Idle-timeout tick.
  useEffect(() => {
    const interval = setInterval(() => {
      if (!settings.enabled || busy || isEditingForm()) return;
      const elapsedMs = Date.now() - lastActivityRef.current;
      if (elapsedMs >= settings.timeoutMinutes * 60_000) {
        setIsActive(active => (active ? active : true));
      }
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [settings.enabled, settings.timeoutMinutes, busy]);

  return { settings, updateSettings, resetSettings, isActive, dismiss, notifyActivity };
}
