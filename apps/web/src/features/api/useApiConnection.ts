import { useCallback, useEffect, useState } from 'react';

export interface ApiConnectionControls {
  apiBaseUrl: string;
  setApiBaseUrl: (v: string) => void;
  apiKey: string;
  setApiKey: (v: string) => void;
  /**
   * Opt-in only (default off) — when true, apiBaseUrl/apiKey are persisted
   * to localStorage so they survive a reload. Per docs/SECURITY_SPEC.md,
   * the API key may only live in browser storage behind an explicit
   * user-initiated "remember" toggle like this one.
   */
  rememberCredentials: boolean;
  setRememberCredentials: (v: boolean) => void;
}

export const DEFAULT_API_BASE_URL = 'http://localhost:8787';
export const DEFAULT_API_KEY = 'dev-local-key';
const STORAGE_KEY = 'plate-runner:api-connection:v1';

interface StoredConnection {
  apiBaseUrl: string;
  apiKey: string;
}

/**
 * A trailing slash (e.g. "https://host.example.com/") makes every request
 * path concatenation double up as "…//api/…", which most backends 404 on.
 * Strip it wherever the URL is set or loaded, same as the CLI scripts do.
 */
export function normalizeApiBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function loadStoredConnection(): StoredConnection | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw) as Record<string, unknown>;
    return {
      apiBaseUrl: normalizeApiBaseUrl(typeof obj.apiBaseUrl === 'string' ? obj.apiBaseUrl : DEFAULT_API_BASE_URL),
      apiKey: typeof obj.apiKey === 'string' ? obj.apiKey : DEFAULT_API_KEY,
    };
  } catch {
    return null;
  }
}

function saveStoredConnection(conn: StoredConnection): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conn));
  } catch {
    // localStorage unavailable — the "remember" toggle just won't stick, non-fatal.
  }
}

function clearStoredConnection(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}

/**
 * Single shared "which backend + which key" connection — one instance,
 * created once in App.tsx, fed into Local API, Display Mode, and
 * Controller Mode alike. They're really the same concept (which backend
 * this browser talks to), so editing/saving it from any one of those
 * screens is reflected in the other two instead of each keeping its own
 * disconnected copy.
 */
export function useApiConnection(): ApiConnectionControls {
  const [stored] = useState(() => loadStoredConnection());
  const [rememberCredentials, setRememberCredentialsState] = useState(stored !== null);
  const [apiBaseUrl, setApiBaseUrl] = useState(stored?.apiBaseUrl ?? DEFAULT_API_BASE_URL);
  const [apiKey, setApiKey] = useState(stored?.apiKey ?? DEFAULT_API_KEY);

  // Keeps whatever is currently in the form in sync with storage while
  // "remember" is on — covers both live edits and the moment it's switched on.
  // Normalized on the way into storage, not on every keystroke of the input
  // itself — stripping trailing "/" live would make it impossible to type
  // "https://" (the trailing slash would vanish after every keystroke).
  useEffect(() => {
    if (!rememberCredentials) return;
    saveStoredConnection({ apiBaseUrl: normalizeApiBaseUrl(apiBaseUrl), apiKey });
  }, [rememberCredentials, apiBaseUrl, apiKey]);

  const setRememberCredentials = useCallback((v: boolean) => {
    setRememberCredentialsState(v);
    if (!v) clearStoredConnection();
  }, []);

  return { apiBaseUrl, setApiBaseUrl, apiKey, setApiKey, rememberCredentials, setRememberCredentials };
}
