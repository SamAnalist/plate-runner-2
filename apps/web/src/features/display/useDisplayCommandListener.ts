import { useCallback, useEffect, useRef, useState } from 'react';
import type { DevicePairingSummary, SetConfigPayload, SimulationCommand } from '@plate-runner/shared';
import type { SimulationControls } from '../../hooks/useSimulation';
import type { PlateQueueControls } from '../queue/usePlateQueue';
import type { PlateListsControls } from '../lists/usePlateLists';
import { runLocalAction } from '../api/commandExecutor';

interface UseDisplayCommandListenerArgs {
  simulation: SimulationControls;
  plateQueue: PlateQueueControls;
  plateLists: PlateListsControls;
  onSetConfig?: (partial: SetConfigPayload) => void;
}

export type DisplayConnectionStatus = 'disconnected' | 'connected' | 'unauthorized' | 'error';

interface DisplayRegistration {
  displayId: string;
  displaySecret: string;
  displayName: string;
}

interface PairingCodeState {
  code: string;
  expiresAt: string;
  pairingSessionId: string;
}

export interface DisplayCommandListenerControls {
  apiBaseUrl: string;
  setApiBaseUrl: (v: string) => void;
  apiKey: string;
  setApiKey: (v: string) => void;

  registration: DisplayRegistration | null;
  registerDisplay: (name: string) => void;
  forgetRegistration: () => void;
  registerError: string | null;

  enabled: boolean;
  setEnabled: (v: boolean) => void;
  connectionStatus: DisplayConnectionStatus;
  pendingCount: number;
  lastError: string | null;
  lastCommandAt: string | null;

  pairingCode: PairingCodeState | null;
  generatePairingCode: () => void;
  pairingCodeError: string | null;

  pairings: DevicePairingSummary[];
  refreshPairings: () => void;
  revokePairing: (pairingId: string) => void;
}

const DEFAULT_BASE_URL = 'http://localhost:8787';
const DEFAULT_API_KEY = 'dev-local-key';
const POLL_MS = 1500;
const HEARTBEAT_MS = 20_000;
const STORAGE_KEY = 'platerunner_display_registration';

function loadRegistration(): DisplayRegistration | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.displayId === 'string' && typeof parsed?.displaySecret === 'string') return parsed;
    return null;
  } catch {
    return null;
  }
}

function saveRegistration(reg: DisplayRegistration | null): void {
  try {
    if (reg) localStorage.setItem(STORAGE_KEY, JSON.stringify(reg));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable — registration just won't survive a reload, non-fatal.
  }
}

function buildFetch(baseUrl: string, apiKey: string, displaySecret?: string) {
  return (path: string, options: RequestInit = {}) =>
    fetch(`${baseUrl}${path}`, {
      ...options,
      body: options.body ?? (options.method && options.method !== 'GET' ? '{}' : undefined),
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        ...(displaySecret ? { 'x-display-secret': displaySecret } : {}),
        ...(options.headers ?? {}),
      },
    });
}

/**
 * Display Mode's command listener — same poll/claim/execute/report shape
 * as useApiCommandListener, but scoped to a registered displayId via
 * /api/displays/:displayId/commands/*, authenticated with both the global
 * API key and this display's own secret. Registration is persisted to
 * localStorage so a reload doesn't require re-registering.
 */
export function useDisplayCommandListener({ simulation, plateQueue, plateLists, onSetConfig }: UseDisplayCommandListenerArgs): DisplayCommandListenerControls {
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_BASE_URL);
  const [apiKey, setApiKey] = useState(DEFAULT_API_KEY);
  const [registration, setRegistration] = useState<DisplayRegistration | null>(() => loadRegistration());
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<DisplayConnectionStatus>('disconnected');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastCommandAt, setLastCommandAt] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<PairingCodeState | null>(null);
  const [pairingCodeError, setPairingCodeError] = useState<string | null>(null);
  const [pairings, setPairings] = useState<DevicePairingSummary[]>([]);

  const simulationRef = useRef(simulation); simulationRef.current = simulation;
  const plateQueueRef = useRef(plateQueue); plateQueueRef.current = plateQueue;
  const plateListsRef = useRef(plateLists); plateListsRef.current = plateLists;
  const onSetConfigRef = useRef(onSetConfig); onSetConfigRef.current = onSetConfig;
  const apiBaseUrlRef = useRef(apiBaseUrl); apiBaseUrlRef.current = apiBaseUrl;
  const apiKeyRef = useRef(apiKey); apiKeyRef.current = apiKey;
  const registrationRef = useRef(registration); registrationRef.current = registration;

  const authedFetch = useCallback((path: string, options?: RequestInit) => {
    return buildFetch(apiBaseUrlRef.current, apiKeyRef.current, registrationRef.current?.displaySecret)(path, options);
  }, []);

  const registerDisplay = useCallback((name: string) => {
    setRegisterError(null);
    void (async () => {
      try {
        const res = await buildFetch(apiBaseUrlRef.current, apiKeyRef.current)('/api/displays/register', {
          method: 'POST',
          body: JSON.stringify({ name }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          setRegisterError(data?.error ?? `HTTP ${res.status}`);
          return;
        }
        const reg: DisplayRegistration = { displayId: data.displayId, displaySecret: data.displaySecret, displayName: name };
        saveRegistration(reg);
        setRegistration(reg);
      } catch (err) {
        setRegisterError(err instanceof Error ? err.message : 'Could not reach server');
      }
    })();
  }, []);

  const forgetRegistration = useCallback(() => {
    saveRegistration(null);
    setRegistration(null);
    setEnabled(false);
    setPairingCode(null);
    setPairings([]);
  }, []);

  const refreshPairings = useCallback(() => {
    const reg = registrationRef.current;
    if (!reg) return;
    void (async () => {
      try {
        const res = await authedFetch(`/api/displays/${reg.displayId}/pairings`);
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok) setPairings(data.pairings);
      } catch {
        // best-effort — surfaced via connectionStatus from the poll loop instead
      }
    })();
  }, [authedFetch]);

  const revokePairing = useCallback((pairingId: string) => {
    const reg = registrationRef.current;
    if (!reg) return;
    void (async () => {
      await authedFetch(`/api/displays/${reg.displayId}/pairings/${pairingId}/revoke`, { method: 'POST' }).catch(() => {});
      refreshPairings();
    })();
  }, [authedFetch, refreshPairings]);

  const generatePairingCode = useCallback(() => {
    const reg = registrationRef.current;
    if (!reg) return;
    setPairingCodeError(null);
    void (async () => {
      try {
        const res = await authedFetch(`/api/displays/${reg.displayId}/pairing-code`, { method: 'POST' });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          setPairingCodeError(data?.error ?? `HTTP ${res.status}`);
          return;
        }
        setPairingCode({ code: data.code, expiresAt: data.expiresAt, pairingSessionId: data.pairingSessionId });
      } catch (err) {
        setPairingCodeError(err instanceof Error ? err.message : 'Could not reach server');
      }
    })();
  }, [authedFetch]);

  const claim = useCallback(async (id: string): Promise<boolean> => {
    const reg = registrationRef.current;
    if (!reg) return false;
    try {
      const res = await authedFetch(`/api/displays/${reg.displayId}/commands/${id}/claim`, { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  }, [authedFetch]);

  const complete = useCallback(async (id: string): Promise<void> => {
    const reg = registrationRef.current;
    if (!reg) return;
    await authedFetch(`/api/displays/${reg.displayId}/commands/${id}/complete`, { method: 'POST' }).catch(() => {});
  }, [authedFetch]);

  const fail = useCallback(async (id: string, error: string): Promise<void> => {
    const reg = registrationRef.current;
    if (!reg) return;
    await authedFetch(`/api/displays/${reg.displayId}/commands/${id}/fail`, {
      method: 'POST',
      body: JSON.stringify({ error }),
    }).catch(() => {});
  }, [authedFetch]);

  const executeCommand = useCallback(async (command: SimulationCommand) => {
    const claimed = await claim(command.id);
    if (!claimed) return;

    const outcome = await runLocalAction(command, {
      simulation: simulationRef.current,
      plateQueue: plateQueueRef.current,
      plateLists: plateListsRef.current,
      onSetConfig: onSetConfigRef.current,
    });

    setLastCommandAt(new Date().toISOString());
    if (outcome.status === 'completed') await complete(command.id);
    else await fail(command.id, outcome.error);
  }, [claim, complete, fail]);

  const poll = useCallback(async () => {
    const reg = registrationRef.current;
    if (!reg) return;
    try {
      const res = await authedFetch(`/api/displays/${reg.displayId}/commands/pending`);
      if (res.status === 401) {
        setConnectionStatus('unauthorized');
        return;
      }
      if (!res.ok) {
        setConnectionStatus('error');
        setLastError(`HTTP ${res.status}`);
        return;
      }
      const data = (await res.json()) as { commands: SimulationCommand[] };
      setConnectionStatus('connected');
      setLastError(null);
      setPendingCount(data.commands.length);
      if (data.commands.length > 0) {
        await executeCommand(data.commands[0]);
      }
    } catch (err) {
      setConnectionStatus('error');
      setLastError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [authedFetch, executeCommand]);

  useEffect(() => {
    if (!enabled || !registration) {
      setConnectionStatus('disconnected');
      return;
    }
    void poll();
    const interval = setInterval(() => { void poll(); }, POLL_MS);
    return () => clearInterval(interval);
  }, [enabled, registration, poll]);

  useEffect(() => {
    if (!enabled || !registration) return;
    const heartbeat = () => { void authedFetch(`/api/displays/${registration.displayId}/heartbeat`, { method: 'POST' }).catch(() => {}); };
    heartbeat();
    const interval = setInterval(heartbeat, HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, [enabled, registration, authedFetch]);

  return {
    apiBaseUrl, setApiBaseUrl,
    apiKey, setApiKey,
    registration, registerDisplay, forgetRegistration, registerError,
    enabled, setEnabled,
    connectionStatus, pendingCount, lastError, lastCommandAt,
    pairingCode, generatePairingCode, pairingCodeError,
    pairings, refreshPairings, revokePairing,
  };
}
