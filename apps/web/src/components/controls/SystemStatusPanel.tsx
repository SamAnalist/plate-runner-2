import { useState } from 'react';
import type { AppScreen } from '../../navigation/appScreens';
import type { ApiCommandListenerControls } from '../../features/api/useApiCommandListener';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { FieldError } from '../ui/FieldError';

interface SystemStatusPanelProps {
  apiCommandListener: ApiCommandListenerControls;
  displayRegistered: boolean;
  controllerPairingsCount: number;
  plateListsCount: number;
  schedulesCount: number;
  executionHistoryCount: number;
  queueStatus: string;
  vehicleColor: string;
  lastScreen: AppScreen;
  screenSaverEnabled: boolean;
  screenSaverTimeoutMinutes: number;
}

function storageAvailable(): boolean {
  try {
    const probeKey = '__plate_runner_storage_probe__';
    localStorage.setItem(probeKey, '1');
    localStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-white/5 last:border-b-0">
      <span className="text-[10px] font-mono text-white/40">{label}</span>
      <span className="text-[10px] font-mono text-white/75 text-right">{value}</span>
    </div>
  );
}

interface BackendStatus {
  ok: boolean;
  storage: { type: string; ok: boolean };
  commands: { pending: number; claimed: number };
  serverTime: string;
}

export function SystemStatusPanel({
  apiCommandListener,
  displayRegistered,
  controllerPairingsCount,
  plateListsCount,
  schedulesCount,
  executionHistoryCount,
  queueStatus,
  vehicleColor,
  lastScreen,
  screenSaverEnabled,
  screenSaverTimeoutMinutes,
}: SystemStatusPanelProps) {
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function checkBackend() {
    setChecking(true);
    setBackendError(null);
    try {
      const res = await fetch(`${apiCommandListener.apiBaseUrl}/api/status`, {
        headers: { 'x-api-key': apiCommandListener.apiKey },
      });
      if (!res.ok) {
        setBackendError(`Backend responded ${res.status}`);
        setBackendStatus(null);
        return;
      }
      const json = await res.json();
      setBackendStatus(json);
    } catch {
      setBackendError('Could not reach backend at this API Base URL.');
      setBackendStatus(null);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label>Frontend</Label>
        <div className="flex flex-col">
          <Row label="App name" value="Plate Runner" />
          <Row label="Frontend mode" value={import.meta.env.MODE} />
          <Row label="API Base URL" value={apiCommandListener.apiBaseUrl} />
          <Row label="API connection status" value={<Badge tone="neutral">{apiCommandListener.connectionStatus}</Badge>} />
          <Row label="Display registered" value={displayRegistered ? 'Yes' : 'No'} />
          <Row label="Controller pairings" value={controllerPairingsCount} />
          <Row label="Plate lists" value={plateListsCount} />
          <Row label="Schedules" value={schedulesCount} />
          <Row label="Execution history" value={executionHistoryCount} />
          <Row label="Queue status" value={queueStatus} />
          <Row label="Vehicle color" value={vehicleColor} />
          <Row label="Last screen persisted" value={lastScreen} />
          <Row label="Browser storage available" value={storageAvailable() ? 'Yes' : 'No'} />
          <Row label="Screen Saver enabled" value={screenSaverEnabled ? 'Yes' : 'No'} />
          <Row label="Screen Saver timeout" value={`${screenSaverTimeoutMinutes} min`} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label>Backend</Label>
          <Button onClick={checkBackend} disabled={checking}>
            {checking ? 'Checking…' : 'Check Backend Status'}
          </Button>
        </div>
        {backendError && <FieldError>{backendError}</FieldError>}
        {backendStatus && (
          <div className="flex flex-col">
            <Row label="Backend health" value={<Badge tone={backendStatus.ok ? 'success' : 'danger'}>{backendStatus.ok ? 'ok' : 'error'}</Badge>} />
            <Row label="Backend storage type" value={backendStatus.storage.type} />
            <Row label="Backend storage ok" value={backendStatus.storage.ok ? 'Yes' : 'No'} />
            <Row label="Pending commands" value={backendStatus.commands.pending} />
            <Row label="Server time" value={new Date(backendStatus.serverTime).toLocaleString()} />
          </div>
        )}
        {!backendStatus && !backendError && (
          <p className="text-[9px] font-mono text-white/25 leading-snug">
            Click "Check Backend Status" to query the local backend. Never shown here: API key, controller tokens, display secrets, or pairing codes.
          </p>
        )}
      </div>
    </div>
  );
}
