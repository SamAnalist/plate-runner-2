import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  PlateList,
  PlateQueueStatus,
  RunListPayload,
  RunPlatePayload,
  RunQueuePayload,
  SimulationCommand,
} from '@plate-runner/shared';
import type { SimulationControls } from '../../hooks/useSimulation';
import type { PlateQueueControls } from '../queue/usePlateQueue';
import type { PlateListsControls } from '../lists/usePlateLists';

interface UseApiCommandListenerArgs {
  simulation: SimulationControls;
  plateQueue: PlateQueueControls;
  plateLists: PlateListsControls;
}

export type ApiConnectionStatus = 'disconnected' | 'connected' | 'unauthorized' | 'error';

export interface ApiCommandListenerControls {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  apiBaseUrl: string;
  setApiBaseUrl: (v: string) => void;
  apiKey: string;
  setApiKey: (v: string) => void;
  connectionStatus: ApiConnectionStatus;
  pendingCount: number;
  lastError: string | null;
  testConnection: () => void;
}

const DEFAULT_BASE_URL = 'http://localhost:8787';
const DEFAULT_API_KEY = 'dev-local-key';
const POLL_MS = 1500;
const QUEUE_ACTIVE_STATUSES: PlateQueueStatus[] = ['running', 'paused', 'waiting_for_signal', 'waiting_for_next'];

function buildFetch(baseUrl: string, apiKey: string) {
  return (path: string, options: RequestInit = {}) =>
    fetch(`${baseUrl}${path}`, {
      ...options,
      // Fastify's JSON body parser rejects Content-Type: application/json with an empty
      // body (FST_ERR_CTP_EMPTY_JSON_BODY) — always send a valid body on POST/PUT.
      body: options.body ?? (options.method && options.method !== 'GET' ? '{}' : undefined),
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        ...(options.headers ?? {}),
      },
    });
}

/** Turns a run_plate/run_queue command payload into a single-use PlateList-shaped object so it can flow through the same runListSnapshot path as run_list. */
function runPlatePayloadToList(payload: RunPlatePayload): PlateList {
  const now = new Date().toISOString();
  return {
    id: `api-plate-${now}`,
    name: `API: ${payload.plate}`,
    plates: [payload.plate],
    simulationDefaults: {
      direction: payload.direction,
      detectorPlacement: payload.detectorPlacement,
      vehicleColor: payload.vehicleColor,
      gateConfig: payload.gateConfig,
      queueConfig: payload.queueConfig,
    },
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
}

function runQueuePayloadToList(payload: RunQueuePayload): PlateList {
  const now = new Date().toISOString();
  return {
    id: `api-queue-${now}`,
    name: `API: ${payload.plates.length} plates`,
    plates: payload.plates,
    simulationDefaults: {
      direction: payload.direction,
      detectorPlacement: payload.detectorPlacement,
      vehicleColor: payload.vehicleColor,
      gateConfig: payload.gateConfig,
      queueConfig: payload.queueConfig,
    },
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
}

/**
 * Polls the local backend (apps/server) for pending SimulationCommands and
 * executes them against the local simulator/queue. Instantiated in App.tsx
 * (not inside ControlPanel) so polling keeps running in Camera Mode/Fullscreen
 * — only its UI panel is conditionally hidden there, same as every other panel.
 */
export function useApiCommandListener({ simulation, plateQueue, plateLists }: UseApiCommandListenerArgs): ApiCommandListenerControls {
  const [enabled, setEnabled] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_BASE_URL);
  const [apiKey, setApiKey] = useState(DEFAULT_API_KEY);
  const [connectionStatus, setConnectionStatus] = useState<ApiConnectionStatus>('disconnected');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const simulationRef = useRef(simulation);
  simulationRef.current = simulation;
  const plateQueueRef = useRef(plateQueue);
  plateQueueRef.current = plateQueue;
  const plateListsRef = useRef(plateLists);
  plateListsRef.current = plateLists;
  const apiBaseUrlRef = useRef(apiBaseUrl);
  apiBaseUrlRef.current = apiBaseUrl;
  const apiKeyRef = useRef(apiKey);
  apiKeyRef.current = apiKey;

  const claim = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await buildFetch(apiBaseUrlRef.current, apiKeyRef.current)(`/api/simulation/commands/${id}/claim`, { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  const complete = useCallback(async (id: string): Promise<void> => {
    await buildFetch(apiBaseUrlRef.current, apiKeyRef.current)(`/api/simulation/commands/${id}/complete`, { method: 'POST' }).catch(() => {});
  }, []);

  const fail = useCallback(async (id: string, error: string): Promise<void> => {
    await buildFetch(apiBaseUrlRef.current, apiKeyRef.current)(`/api/simulation/commands/${id}/fail`, {
      method: 'POST',
      body: JSON.stringify({ error }),
    }).catch(() => {});
  }, []);

  const executeCommand = useCallback(async (command: SimulationCommand) => {
    const isRunCommand = command.type === 'run_plate' || command.type === 'run_queue' || command.type === 'run_list';

    if (isRunCommand) {
      const claimed = await claim(command.id);
      if (!claimed) return;

      const busy = QUEUE_ACTIVE_STATUSES.includes(plateQueueRef.current.queueStatus);
      if (busy) {
        await fail(command.id, 'local_queue_busy');
        return;
      }

      let list: PlateList;
      if (command.type === 'run_plate') list = runPlatePayloadToList(command.payload as RunPlatePayload);
      else if (command.type === 'run_queue') list = runQueuePayloadToList(command.payload as RunQueuePayload);
      else list = (command.payload as RunListPayload).list;

      plateListsRef.current.runListSnapshot(list, 'api_command');
      await complete(command.id);
      return;
    }

    if (command.type === 'set_config') {
      const claimed = await claim(command.id);
      if (!claimed) return;
      await fail(command.id, 'not_implemented');
      return;
    }

    // pause / resume / stop / skip_current / open_gate — idempotent/no-op-safe locally, best-effort complete.
    const claimed = await claim(command.id);
    if (!claimed) return;
    switch (command.type) {
      case 'pause': plateQueueRef.current.pauseQueue(); break;
      case 'resume': plateQueueRef.current.resumeQueue(); break;
      case 'stop': plateQueueRef.current.stopQueue(); break;
      case 'skip_current': plateQueueRef.current.skipCurrent(); break;
      case 'open_gate': simulationRef.current.openGate(); break;
    }
    await complete(command.id);
  }, [claim, complete, fail]);

  const poll = useCallback(async () => {
    try {
      const res = await buildFetch(apiBaseUrlRef.current, apiKeyRef.current)('/api/simulation/commands/pending');
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
  }, [executeCommand]);

  useEffect(() => {
    if (!enabled) {
      setConnectionStatus('disconnected');
      return;
    }
    void poll();
    const interval = setInterval(() => { void poll(); }, POLL_MS);
    return () => clearInterval(interval);
  }, [enabled, poll]);

  const testConnection = useCallback(() => {
    void (async () => {
      try {
        const res = await buildFetch(apiBaseUrlRef.current, apiKeyRef.current)('/api/status');
        if (res.ok) {
          setConnectionStatus('connected');
          setLastError(null);
        } else if (res.status === 401) {
          setConnectionStatus('unauthorized');
          setLastError('Invalid API key');
        } else {
          setConnectionStatus('error');
          setLastError(`HTTP ${res.status}`);
        }
      } catch (err) {
        setConnectionStatus('error');
        setLastError(err instanceof Error ? err.message : 'Could not reach server');
      }
    })();
  }, []);

  return {
    enabled,
    setEnabled,
    apiBaseUrl,
    setApiBaseUrl,
    apiKey,
    setApiKey,
    connectionStatus,
    pendingCount,
    lastError,
    testConnection,
  };
}
