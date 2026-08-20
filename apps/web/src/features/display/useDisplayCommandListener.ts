import { useCallback, useEffect, useRef, useState } from 'react';
import type { DevicePairingSummary, DisplayDevice, PairingRequestSummary, SetConfigPayload, SimulationCommand } from '@plate-runner/shared';
import type { SimulationControls } from '../../hooks/useSimulation';
import type { PlateQueueControls } from '../queue/usePlateQueue';
import type { PlateListsControls } from '../lists/usePlateLists';
import type { ApiConnectionControls } from '../api/useApiConnection';
import { normalizeApiBaseUrl } from '../api/useApiConnection';
import { runLocalAction, isRunCommandBusy } from '../api/commandExecutor';

interface UseDisplayCommandListenerArgs {
  simulation: SimulationControls;
  plateQueue: PlateQueueControls;
  plateLists: PlateListsControls;
  onSetConfig?: (partial: SetConfigPayload) => void;
  /** Shared with Local API and Controller Mode — see useApiConnection. */
  apiConnection: ApiConnectionControls;
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

export interface DisplayCommandListenerControls extends ApiConnectionControls {
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
  /** Set when the command poll gets a 401 with a specific reason — 'display_revoked' or
   * 'display_secret_expired' — so the UI can show that instead of a generic error. */
  authErrorReason: string | null;

  displaySecurity: DisplayDevice | null;
  refreshDisplaySecurity: () => void;
  rotateSecret: () => void;
  rotateSecretError: string | null;
  revokeThisDisplay: () => void;
  revokeError: string | null;

  pairingCode: PairingCodeState | null;
  generatePairingCode: () => void;
  pairingCodeError: string | null;

  pairings: DevicePairingSummary[];
  refreshPairings: () => void;
  revokePairing: (pairingId: string) => void;

  pairingRequests: PairingRequestSummary[];
  refreshPairingRequests: () => void;
  approveRequest: (pairingRequestId: string) => void;
  rejectRequest: (pairingRequestId: string) => void;
}

const POLL_MS = 1500;
const HEARTBEAT_MS = 20_000;
const PAIRING_REQUESTS_POLL_MS = 2000;
const PAIRINGS_POLL_MS = 4000;
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
export function useDisplayCommandListener({ simulation, plateQueue, plateLists, onSetConfig, apiConnection }: UseDisplayCommandListenerArgs): DisplayCommandListenerControls {
  const { apiBaseUrl: apiBaseUrlRaw, apiKey } = apiConnection;
  const apiBaseUrl = normalizeApiBaseUrl(apiBaseUrlRaw);
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
  const [pairingRequests, setPairingRequests] = useState<PairingRequestSummary[]>([]);
  const [authErrorReason, setAuthErrorReason] = useState<string | null>(null);
  const [displaySecurity, setDisplaySecurity] = useState<DisplayDevice | null>(null);
  const [rotateSecretError, setRotateSecretError] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

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
    setPairingRequests([]);
    setAuthErrorReason(null);
    setDisplaySecurity(null);
    setRotateSecretError(null);
    setRevokeError(null);
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

  const refreshDisplaySecurity = useCallback(() => {
    const reg = registrationRef.current;
    if (!reg) return;
    void (async () => {
      try {
        const res = await authedFetch(`/api/displays/${reg.displayId}`);
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok) setDisplaySecurity(data.display);
      } catch {
        // best-effort — surfaced via connectionStatus from the poll loop instead
      }
    })();
  }, [authedFetch]);

  /** Only overwrites the persisted secret on success — a failure leaves the old, still-working secret untouched. */
  const rotateSecret = useCallback(() => {
    const reg = registrationRef.current;
    if (!reg) return;
    setRotateSecretError(null);
    void (async () => {
      try {
        const res = await authedFetch(`/api/displays/${reg.displayId}/rotate-secret`, { method: 'POST' });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          setRotateSecretError(data?.error ?? `HTTP ${res.status}`);
          return;
        }
        const updated: DisplayRegistration = { ...reg, displaySecret: data.displaySecret };
        saveRegistration(updated);
        setRegistration(updated);
        refreshDisplaySecurity();
      } catch (err) {
        setRotateSecretError(err instanceof Error ? err.message : 'Could not reach server');
      }
    })();
  }, [authedFetch, refreshDisplaySecurity]);

  const revokeThisDisplay = useCallback(() => {
    const reg = registrationRef.current;
    if (!reg) return;
    setRevokeError(null);
    void (async () => {
      try {
        const res = await authedFetch(`/api/displays/${reg.displayId}/revoke`, { method: 'POST' });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          setRevokeError(data?.error ?? `HTTP ${res.status}`);
          return;
        }
        forgetRegistration();
      } catch (err) {
        setRevokeError(err instanceof Error ? err.message : 'Could not reach server');
      }
    })();
  }, [authedFetch, forgetRegistration]);

  const refreshPairingRequests = useCallback(() => {
    const reg = registrationRef.current;
    if (!reg) return;
    void (async () => {
      try {
        const res = await authedFetch(`/api/displays/${reg.displayId}/pairing-requests`);
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok) setPairingRequests(data.requests);
      } catch {
        // best-effort — surfaced via connectionStatus from the command poll loop instead
      }
    })();
  }, [authedFetch]);

  const approveRequest = useCallback((pairingRequestId: string) => {
    const reg = registrationRef.current;
    if (!reg) return;
    void (async () => {
      const res = await authedFetch(`/api/displays/${reg.displayId}/pairing-requests/${pairingRequestId}/approve`, { method: 'POST' }).catch(() => null);
      // The code that led to this request is now spent (a display only ever
      // has one active code — a new one expires it, see pairingService.ts's
      // expirePendingForDisplay) — clear it so the panel goes back to
      // "No active code." instead of showing a code that no longer works.
      if (res?.ok) setPairingCode(null);
      refreshPairingRequests();
      refreshPairings();
    })();
  }, [authedFetch, refreshPairingRequests, refreshPairings]);

  const rejectRequest = useCallback((pairingRequestId: string) => {
    const reg = registrationRef.current;
    if (!reg) return;
    void (async () => {
      await authedFetch(`/api/displays/${reg.displayId}/pairing-requests/${pairingRequestId}/reject`, { method: 'POST' }).catch(() => {});
      refreshPairingRequests();
    })();
  }, [authedFetch, refreshPairingRequests]);

  // Independent of the "Listen for Remote Commands" toggle — approving a controller
  // shouldn't require the command execution listener to be enabled.
  useEffect(() => {
    if (!registration) return;
    refreshPairingRequests();
    const interval = setInterval(refreshPairingRequests, PAIRING_REQUESTS_POLL_MS);
    return () => clearInterval(interval);
  }, [registration, refreshPairingRequests]);

  // Independent of the "Listen for Remote Commands" toggle, same as pairing
  // requests above — a Controller unpairing itself (or being revoked
  // elsewhere) should show up here without a manual refresh or page reload.
  useEffect(() => {
    if (!registration) return;
    refreshPairings();
    const interval = setInterval(refreshPairings, PAIRINGS_POLL_MS);
    return () => clearInterval(interval);
  }, [registration, refreshPairings]);

  useEffect(() => {
    if (!registration) return;
    refreshDisplaySecurity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registration?.displayId]);

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
        const data = await res.json().catch(() => null);
        setConnectionStatus('unauthorized');
        setAuthErrorReason(data?.error ?? null);
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
      setAuthErrorReason(null);
      setPendingCount(data.commands.length);
      // A run_plate/run_queue/run_list command arriving while a previous run is
      // still in progress is left pending (not claimed) — it retries on the next
      // tick once the current run finishes, so back-to-back commands play in
      // sequence instead of the 2nd+ one being claimed-then-failed and vanishing.
      if (data.commands.length > 0 && !isRunCommandBusy(data.commands[0], plateQueueRef.current)) {
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
    ...apiConnection,
    registration, registerDisplay, forgetRegistration, registerError,
    enabled, setEnabled,
    connectionStatus, pendingCount, lastError, lastCommandAt, authErrorReason,
    pairingCode, generatePairingCode, pairingCodeError,
    pairings, refreshPairings, revokePairing,
    pairingRequests, refreshPairingRequests, approveRequest, rejectRequest,
    displaySecurity, refreshDisplaySecurity,
    rotateSecret, rotateSecretError,
    revokeThisDisplay, revokeError,
  };
}
