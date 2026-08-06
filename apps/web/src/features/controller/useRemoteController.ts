import { useCallback, useRef, useState } from 'react';
import type {
  Direction,
  DetectorPlacement,
  VehicleColor,
  GateConfig,
  PlateQueueConfig,
  SetConfigPayload,
} from '@plate-runner/shared';

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

export interface RemoteControllerControls {
  apiBaseUrl: string;
  setApiBaseUrl: (v: string) => void;
  apiKey: string;
  setApiKey: (v: string) => void;

  pairedDisplays: PairedDisplay[];
  pairWithCode: (controllerName: string, code: string) => Promise<RemoteActionResult>;
  forgetPairing: (displayId: string) => void;
  pairError: string | null;

  sendPlate: (displayId: string, args: RunPlateArgs) => Promise<RemoteActionResult>;
  sendQueue: (displayId: string, args: RunQueueArgs) => Promise<RemoteActionResult>;
  pause: (displayId: string) => Promise<RemoteActionResult>;
  resume: (displayId: string) => Promise<RemoteActionResult>;
  stop: (displayId: string) => Promise<RemoteActionResult>;
  skipCurrent: (displayId: string) => Promise<RemoteActionResult>;
  openGate: (displayId: string) => Promise<RemoteActionResult>;
  setConfig: (displayId: string, partial: SetConfigPayload) => Promise<RemoteActionResult>;
}

const DEFAULT_BASE_URL = 'http://localhost:8787';
const DEFAULT_API_KEY = 'dev-local-key';
const STORAGE_KEY = 'platerunner_controller_pairings';

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
 * Controller Mode's remote-control surface — pairs with displays via a
 * 6-digit code and sends fire-and-forget commands to them. No polling: each
 * action just creates a SimulationCommand on the backend; the target
 * display's own listener (useDisplayCommandListener) does the actual work.
 */
export function useRemoteController(): RemoteControllerControls {
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_BASE_URL);
  const [apiKey, setApiKey] = useState(DEFAULT_API_KEY);
  const [pairedDisplays, setPairedDisplays] = useState<PairedDisplay[]>(() => loadPairings());
  const [pairError, setPairError] = useState<string | null>(null);

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

  const pairWithCode = useCallback(async (controllerName: string, code: string): Promise<RemoteActionResult> => {
    setPairError(null);
    try {
      const res = await rawFetch('/api/controllers/pair', {
        method: 'POST',
        body: JSON.stringify({ controllerName, code }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        const error = data?.error ?? `HTTP ${res.status}`;
        setPairError(error);
        return { ok: false, error };
      }
      const pairing: PairedDisplay = {
        displayId: data.displayId,
        displayName: data.displayName,
        controllerId: data.controllerId,
        controllerToken: data.controllerToken,
        pairedAt: new Date().toISOString(),
      };
      const next = [...pairedDisplaysRef.current.filter(p => p.displayId !== pairing.displayId), pairing];
      savePairings(next);
      setPairedDisplays(next);
      return { ok: true, commandId: data.pairingId };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Could not reach server';
      setPairError(error);
      return { ok: false, error };
    }
  }, [rawFetch]);

  const forgetPairing = useCallback((displayId: string) => {
    const next = pairedDisplaysRef.current.filter(p => p.displayId !== displayId);
    savePairings(next);
    setPairedDisplays(next);
  }, []);

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
    apiBaseUrl, setApiBaseUrl, apiKey, setApiKey,
    pairedDisplays, pairWithCode, forgetPairing, pairError,
    sendPlate, sendQueue, pause, resume, stop, skipCurrent, openGate, setConfig,
  };
}
