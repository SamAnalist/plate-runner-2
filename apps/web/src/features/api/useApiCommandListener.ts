import { useCallback, useEffect, useRef, useState } from 'react';
import type { SetConfigPayload, SimulationCommand } from '@plate-runner/shared';
import type { SimulationControls } from '../../hooks/useSimulation';
import type { PlateQueueControls } from '../queue/usePlateQueue';
import type { PlateListsControls } from '../lists/usePlateLists';
import type { ApiConnectionControls } from './useApiConnection';
import { normalizeApiBaseUrl } from './useApiConnection';
import { runLocalAction, isRunCommandBusy } from './commandExecutor';

interface UseApiCommandListenerArgs {
  simulation: SimulationControls;
  plateQueue: PlateQueueControls;
  plateLists: PlateListsControls;
  /** Applies a partial SimulationConfig change for 'set_config' commands. Omit to leave set_config unimplemented. */
  onSetConfig?: (partial: SetConfigPayload) => void;
  /** Shared with Display Mode and Controller Mode — see useApiConnection. */
  apiConnection: ApiConnectionControls;
}

export type ApiConnectionStatus = 'disconnected' | 'connected' | 'unauthorized' | 'error';

export interface ApiCommandListenerControls extends ApiConnectionControls {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  connectionStatus: ApiConnectionStatus;
  pendingCount: number;
  lastError: string | null;
  testConnection: () => void;
}

const POLL_MS = 1500;

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

/**
 * Polls the local backend (apps/server) for pending SimulationCommands and
 * executes them against the local simulator/queue. Instantiated in App.tsx
 * (not inside ControlPanel) so polling keeps running in Camera Mode/Fullscreen
 * — only its UI panel is conditionally hidden there, same as every other panel.
 */
export function useApiCommandListener({ simulation, plateQueue, plateLists, onSetConfig, apiConnection }: UseApiCommandListenerArgs): ApiCommandListenerControls {
  const { apiBaseUrl: apiBaseUrlRaw, apiKey } = apiConnection;
  const apiBaseUrl = normalizeApiBaseUrl(apiBaseUrlRaw);
  const [enabled, setEnabled] = useState(false);
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
  const onSetConfigRef = useRef(onSetConfig);
  onSetConfigRef.current = onSetConfig;

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
    const claimed = await claim(command.id);
    if (!claimed) return;

    const outcome = await runLocalAction(command, {
      simulation: simulationRef.current,
      plateQueue: plateQueueRef.current,
      plateLists: plateListsRef.current,
      onSetConfig: onSetConfigRef.current,
    });

    if (outcome.status === 'completed') await complete(command.id);
    else await fail(command.id, outcome.error);
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
    ...apiConnection,
    enabled,
    setEnabled,
    connectionStatus,
    pendingCount,
    lastError,
    testConnection,
  };
}
