import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  Direction,
  DetectorPlacement,
  VehicleColor,
  GateConfig,
  PlateQueueConfig,
  SetConfigPayload,
} from '@plate-runner/shared';
import type { ApiConnectionControls } from '../api/useApiConnection';
import { normalizeApiBaseUrl } from '../api/useApiConnection';

export interface PairedDisplay {
  displayId: string;
  displayName: string;
  controllerId: string;
  controllerToken: string;
  pairedAt: string;
}

export interface RunPlateArgs {
  plate: string;
  direction: Direction;
  detectorPlacement: DetectorPlacement;
  vehicleColor: VehicleColor;
  gateConfig: GateConfig;
  queueConfig: PlateQueueConfig;
}

export interface RunQueueArgs {
  plates: string[];
  direction: Direction;
  detectorPlacement: DetectorPlacement;
  vehicleColor: VehicleColor;
  gateConfig: GateConfig;
  queueConfig: PlateQueueConfig;
}

export type RemoteActionResult = { ok: true; commandId: string } | { ok: false; error: string };

/**
 * approval_pending — request created, polling for the display's decision.
 * approved/finalizing — display approved, exchanging it for a token.
 * paired — finalize succeeded, token stored.
 * rejected/expired/error — terminal, no token; user can retry with a fresh code.
 */
export type PairingRequestPhase = 'approval_pending' | 'approved' | 'finalizing' | 'paired' | 'rejected' | 'expired' | 'error';

export interface PairingRequestState {
  phase: PairingRequestPhase;
  pairingRequestId?: string;
  displayId?: string;
  displayName?: string;
  error?: string;
}

export interface RemoteControllerControls extends ApiConnectionControls {
  pairedDisplays: PairedDisplay[];
  forgetPairing: (displayId: string) => void | Promise<void>;

  pairingRequest: PairingRequestState | null;
  requestPairing: (controllerName: string, code: string) => void;
  dismissPairingRequest: () => void;

  sendPlate: (displayId: string, args: RunPlateArgs) => Promise<RemoteActionResult>;
  sendQueue: (displayId: string, args: RunQueueArgs) => Promise<RemoteActionResult>;
  pause: (displayId: string) => Promise<RemoteActionResult>;
  resume: (displayId: string) => Promise<RemoteActionResult>;
  stop: (displayId: string) => Promise<RemoteActionResult>;
  skipCurrent: (displayId: string) => Promise<RemoteActionResult>;
  openGate: (displayId: string) => Promise<RemoteActionResult>;
  setConfig: (displayId: string, partial: SetConfigPayload) => Promise<RemoteActionResult>;
}

const STORAGE_KEY = 'platerunner_controller_pairings';
const POLL_MS = 1500;

function loadPairings(): PairedDisplay[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePairings(pairings: PairedDisplay[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pairings));
  } catch {
    // localStorage unavailable — pairings just won't survive a reload, non-fatal.
  }
}

/**
 * Controller Mode's remote-control surface. Pairing is a three-step flow
 * (request -> display approves/rejects -> finalize) — no token is ever
 * held locally until finalize succeeds. Everything else (sendPlate,
 * control commands, etc.) is fire-and-forget: each just creates a
 * SimulationCommand on the backend, the target display's own listener
 * (useDisplayCommandListener) does the actual work.
 */
export function useRemoteController(apiConnection: ApiConnectionControls): RemoteControllerControls {
  const { apiBaseUrl: apiBaseUrlRaw, apiKey } = apiConnection;
  const apiBaseUrl = normalizeApiBaseUrl(apiBaseUrlRaw);
  const [pairedDisplays, setPairedDisplays] = useState<PairedDisplay[]>(() => loadPairings());
  const [pairingRequest, setPairingRequest] = useState<PairingRequestState | null>(null);

  const apiBaseUrlRef = useRef(apiBaseUrl); apiBaseUrlRef.current = apiBaseUrl;
  const apiKeyRef = useRef(apiKey); apiKeyRef.current = apiKey;
  const pairedDisplaysRef = useRef(pairedDisplays); pairedDisplaysRef.current = pairedDisplays;

  const rawFetch = useCallback((path: string, options: RequestInit = {}, controllerToken?: string) => {
    return fetch(`${apiBaseUrlRef.current}${path}`, {
      ...options,
      body: options.body ?? (options.method && options.method !== 'GET' ? '{}' : undefined),
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKeyRef.current,
        ...(controllerToken ? { 'x-controller-token': controllerToken } : {}),
        ...(options.headers ?? {}),
      },
    });
  }, []);

  const requestPairing = useCallback((controllerName: string, code: string) => {
    setPairingRequest({ phase: 'approval_pending' });
    void (async () => {
      try {
        const res = await rawFetch('/api/controllers/pair', {
          method: 'POST',
          body: JSON.stringify({ controllerName, code }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          setPairingRequest({ phase: 'error', error: data?.error ?? `HTTP ${res.status}` });
          return;
        }
        setPairingRequest({
          phase: 'approval_pending',
          pairingRequestId: data.pairingRequestId,
          displayId: data.displayId,
          displayName: data.displayName,
        });
      } catch (err) {
        setPairingRequest({ phase: 'error', error: err instanceof Error ? err.message : 'Could not reach server' });
      }
    })();
  }, [rawFetch]);

  const dismissPairingRequest = useCallback(() => setPairingRequest(null), []);

  const finalize = useCallback((pairingRequestId: string, displayId: string, displayName: string) => {
    setPairingRequest({ phase: 'finalizing', pairingRequestId, displayId, displayName });
    void (async () => {
      try {
        const res = await rawFetch(`/api/controllers/pairing-requests/${pairingRequestId}/finalize`, { method: 'POST' });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          setPairingRequest({ phase: 'error', displayId, displayName, error: data?.error ?? `HTTP ${res.status}` });
          return;
        }
        const pairing: PairedDisplay = {
          displayId: data.displayId,
          displayName,
          controllerId: data.controllerId,
          controllerToken: data.controllerToken,
          pairedAt: new Date().toISOString(),
        };
        const next = [...pairedDisplaysRef.current.filter(p => p.displayId !== pairing.displayId), pairing];
        savePairings(next);
        setPairedDisplays(next);
        setPairingRequest({ phase: 'paired', displayId, displayName });
      } catch (err) {
        setPairingRequest({ phase: 'error', displayId, displayName, error: err instanceof Error ? err.message : 'Could not reach server' });
      }
    })();
  }, [rawFetch]);

  // Poll the request's status while awaiting the display's decision.
  useEffect(() => {
    if (!pairingRequest || pairingRequest.phase !== 'approval_pending' || !pairingRequest.pairingRequestId) return;
    const { pairingRequestId } = pairingRequest;

    const tick = async () => {
      try {
        const res = await rawFetch(`/api/controllers/pairing-requests/${pairingRequestId}`);
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          setPairingRequest({ phase: 'error', error: data?.error ?? `HTTP ${res.status}` });
          return;
        }
        if (data.status === 'approved') {
          finalize(pairingRequestId, data.displayId, data.displayName);
        } else if (data.status === 'rejected') {
          setPairingRequest({ phase: 'rejected', displayId: data.displayId, displayName: data.displayName });
        } else if (data.status === 'expired') {
          setPairingRequest({ phase: 'expired', displayId: data.displayId, displayName: data.displayName });
        }
        // status === 'approval_pending' -> keep polling, no state change needed.
      } catch (err) {
        setPairingRequest({ phase: 'error', error: err instanceof Error ? err.message : 'Could not reach server' });
      }
    };

    const interval = setInterval(() => { void tick(); }, POLL_MS);
    return () => clearInterval(interval);
  }, [pairingRequest, rawFetch, finalize]);

  const forgetPairing = useCallback(async (displayId: string) => {
    const token = pairedDisplaysRef.current.find(p => p.displayId === displayId)?.controllerToken;
    if (token) {
      // Best-effort: revoke server-side so the Display's "Paired Controllers"
      // list reflects the removal too. Local state is cleared either way —
      // an unreachable server shouldn't trap the user with a stale pairing.
      await rawFetch(`/api/remote/displays/${displayId}/unpair`, { method: 'POST' }, token).catch(() => {});
    }
    const next = pairedDisplaysRef.current.filter(p => p.displayId !== displayId);
    savePairings(next);
    setPairedDisplays(next);
  }, [rawFetch]);

  const tokenFor = useCallback((displayId: string): string | undefined => {
    return pairedDisplaysRef.current.find(p => p.displayId === displayId)?.controllerToken;
  }, []);

  const post = useCallback(async (displayId: string, path: string, body?: unknown): Promise<RemoteActionResult> => {
    const token = tokenFor(displayId);
    if (!token) return { ok: false, error: 'not_paired' };
    try {
      const res = await rawFetch(`/api/remote/displays/${displayId}${path}`, {
        method: 'POST',
        body: body !== undefined ? JSON.stringify(body) : undefined,
      }, token);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) return { ok: false, error: data?.error ?? `HTTP ${res.status}` };
      return { ok: true, commandId: data.commandId };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Could not reach server' };
    }
  }, [rawFetch, tokenFor]);

  const sendPlate = useCallback((displayId: string, args: RunPlateArgs) => post(displayId, '/simulate', args), [post]);
  const sendQueue = useCallback((displayId: string, args: RunQueueArgs) => post(displayId, '/simulate/queue', args), [post]);
  const pause = useCallback((displayId: string) => post(displayId, '/pause'), [post]);
  const resume = useCallback((displayId: string) => post(displayId, '/resume'), [post]);
  const stop = useCallback((displayId: string) => post(displayId, '/stop'), [post]);
  const skipCurrent = useCallback((displayId: string) => post(displayId, '/skip-current'), [post]);
  const openGate = useCallback((displayId: string) => post(displayId, '/open-gate'), [post]);
  const setConfig = useCallback((displayId: string, partial: SetConfigPayload) => post(displayId, '/set-config', partial), [post]);

  return {
    ...apiConnection,
    pairedDisplays, forgetPairing,
    pairingRequest, requestPairing, dismissPairingRequest,
    sendPlate, sendQueue, pause, resume, stop, skipCurrent, openGate, setConfig,
  };
}
