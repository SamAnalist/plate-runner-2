import { useState } from 'react';
import {
  DIRECTIONS,
  VEHICLE_COLORS,
  VEHICLE_TYPES,
  GATE_MODES,
  DEFAULT_CONFIG,
  getPlacementsForDirection,
  remapPlacementForDirection,
  isPlacementAllowedForDirection,
  type Direction,
  type DetectorPlacement,
  type VehicleColor,
  type VehicleType,
  type GateMode,
  type PlateList,
} from '@plate-runner/shared';
import type { RemoteControllerControls, RemoteActionResult } from '../../features/controller/useRemoteController';
import { parsePlateQueueInput } from '../../features/queue/plateQueueParser';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';

function TextInput({
  value, onChange, placeholder, type = 'text', maxLength, invalid,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  type?: 'text' | 'password'; maxLength?: number; invalid?: boolean;
}) {
  return (
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      maxLength={maxLength} autoComplete={type === 'password' ? 'off' : undefined}
      className={`w-full px-2 py-1.5 rounded bg-white/5 border text-[11px] font-mono text-white/80 outline-none focus:border-blue-500/50 ${
        invalid ? 'border-red-500/50' : 'border-white/15'}`}
    />
  );
}

const URL_SCHEME_PATTERN = /^https?:\/\//i;

const REMOTE_ERROR_MESSAGES: Record<string, string> = {
  token_expired: 'Pairing expired — re-pair with this display.',
  unauthorized: 'Not authorized — this pairing may have been revoked. Re-pair if needed.',
};

function friendlyRemoteError(error: string): string {
  return REMOTE_ERROR_MESSAGES[error] ?? error;
}

function Select<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: readonly T[] }) {
  return (
    <select
      value={value} onChange={e => onChange(e.target.value as T)}
      className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/15 text-[11px] font-mono text-white/80 outline-none focus:border-blue-500/50"
    >
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  );
}

function ActionResultBadge({ result }: { result: RemoteActionResult | null }) {
  if (!result) return null;
  return result.ok
    ? <Badge tone="success">Sent — {result.commandId.slice(0, 8)}</Badge>
    : <Badge tone="danger">{friendlyRemoteError(result.error)}</Badge>;
}

export function ControllerModePanel({ controller, localLists }: { controller: RemoteControllerControls; localLists: PlateList[] }) {
  const {
    apiBaseUrl, setApiBaseUrl, apiKey, setApiKey,
    pairedDisplays, forgetPairing,
    pairingRequest, requestPairing, dismissPairingRequest,
    sendPlate, sendQueue, pause, resume, stop, skipCurrent, openGate,
  } = controller;

  const [controllerName, setControllerName] = useState('');
  const [pairCode, setPairCode] = useState('');
  const [selectedDisplayId, setSelectedDisplayId] = useState<string>('');

  const [plate, setPlate] = useState(DEFAULT_CONFIG.plate);
  const [direction, setDirection] = useState<Direction>(DEFAULT_CONFIG.direction);
  const [placement, setPlacement] = useState<DetectorPlacement>(DEFAULT_CONFIG.detectorPlacement);
  const [vehicleColor, setVehicleColor] = useState<VehicleColor>(DEFAULT_CONFIG.vehicleColor);
  const [vehicleType, setVehicleType] = useState<VehicleType>(DEFAULT_CONFIG.vehicleType);
  const [gateMode, setGateMode] = useState<GateMode>(DEFAULT_CONFIG.gateMode);
  const [plateResult, setPlateResult] = useState<RemoteActionResult | null>(null);

  const [queueInput, setQueueInput] = useState('');
  const [queueResult, setQueueResult] = useState<RemoteActionResult | null>(null);

  const [controlResult, setControlResult] = useState<RemoteActionResult | null>(null);
  const [selectedListId, setSelectedListId] = useState('');
  const [listResult, setListResult] = useState<RemoteActionResult | null>(null);

  const activePairings = pairedDisplays;
  const target = activePairings.find(p => p.displayId === selectedDisplayId) ?? activePairings[0];
  const effectiveDisplayId = target?.displayId ?? '';

  function onDirectionChange(next: Direction) {
    setDirection(next);
    if (!isPlacementAllowedForDirection(next, placement)) setPlacement(remapPlacementForDirection(placement, next));
  }

  const queuePreview = parsePlateQueueInput(queueInput);

  const gateConfigFor = (mode: GateMode) => ({
    gateMode: mode,
    gateInitialState: 'closed' as const,
    stopBeforeOpenMs: DEFAULT_CONFIG.stopBeforeOpenMs,
    delayAfterOpenMs: DEFAULT_CONFIG.delayAfterOpenMs,
  });
  const queueConfigDefault = { mode: 'run_all' as const, gapBetweenVehiclesMs: 500, loop: false };

  return (
    <div className="flex flex-col gap-5 max-w-md">
      <div>
        <Label>Connection</Label>
        <div className="flex flex-col gap-2">
          <TextInput
            value={apiBaseUrl} onChange={setApiBaseUrl} placeholder="http://localhost:8787"
            invalid={!!apiBaseUrl && !URL_SCHEME_PATTERN.test(apiBaseUrl)}
          />
          <TextInput value={apiKey} onChange={setApiKey} placeholder="dev-local-key" type="password" />
          <p className="text-[9px] font-mono text-white/25 leading-snug">
            Shared with Settings → Local API — editing it here changes it there too. To remember
            it across reloads, enable "Remember on this device" in Settings.
          </p>
        </div>
      </div>

      <div>
        <Label>Pair Display</Label>
        {!pairingRequest ? (
          <div className="flex flex-col gap-2">
            <TextInput value={controllerName} onChange={setControllerName} placeholder="Controller name (e.g. Laptop 1)" maxLength={80} />
            <TextInput value={pairCode} onChange={setPairCode} placeholder="6-digit code" maxLength={6} />
            <Button
              tone="primary"
              disabled={!controllerName.trim() || !/^\d{6}$/.test(pairCode.trim())}
              onClick={() => { requestPairing(controllerName.trim(), pairCode.trim()); setPairCode(''); }}
            >
              Pair
            </Button>
          </div>
        ) : (
          <div className="px-2.5 py-2 rounded-md bg-white/5 border border-white/10">
            {(pairingRequest.phase === 'approval_pending' || pairingRequest.phase === 'finalizing') && (
              <p className="text-[11px] font-mono text-cyan-300 animate-pulse">
                {pairingRequest.phase === 'finalizing' ? 'Finalizing…' : `Waiting for display approval${pairingRequest.displayName ? ` (${pairingRequest.displayName})` : ''}…`}
              </p>
            )}
            {pairingRequest.phase === 'paired' && (
              <p className="text-[11px] font-mono text-emerald-400">Paired successfully with {pairingRequest.displayName}.</p>
            )}
            {pairingRequest.phase === 'rejected' && (
              <p className="text-[11px] font-mono text-red-400">Pairing rejected by display.</p>
            )}
            {pairingRequest.phase === 'expired' && (
              <p className="text-[11px] font-mono text-orange-400">Pairing code expired.</p>
            )}
            {pairingRequest.phase === 'error' && (
              <p className="text-[11px] font-mono text-red-400">{pairingRequest.error ?? 'Something went wrong.'}</p>
            )}
            {(pairingRequest.phase === 'paired' || pairingRequest.phase === 'rejected' || pairingRequest.phase === 'expired' || pairingRequest.phase === 'error') && (
              <div className="mt-2">
                <Button onClick={dismissPairingRequest}>
                  {pairingRequest.phase === 'paired' ? 'Done' : 'Try Again'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <Label>Paired Displays ({activePairings.length})</Label>
        {activePairings.length === 0 ? (
          <EmptyState message="No displays paired yet." hint="Pair one above using a 6-digit code from a Display's screen." />
        ) : (
          <div className="flex flex-col gap-1.5">
            {activePairings.map(p => (
              <div
                key={p.displayId}
                onClick={() => setSelectedDisplayId(p.displayId)}
                className={`flex items-center justify-between px-2 py-1.5 rounded-md border cursor-pointer transition-all ${
                  effectiveDisplayId === p.displayId ? 'bg-blue-600/15 border-blue-500/40' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-mono text-white/70 truncate">{p.displayName}</p>
                  <p className="text-[9px] font-mono text-white/25">paired {new Date(p.pairedAt).toLocaleString()}</p>
                </div>
                <Button tone="danger" onClick={() => forgetPairing(p.displayId)}>Remove</Button>
              </div>
            ))}
          </div>
        )}
        <p className="mt-1.5 text-[9px] text-white/25 font-mono leading-snug">
          Click a display to select it as the target for every action below. "Remove" only forgets it locally — revoke from the Display's own panel.
        </p>
      </div>

      {effectiveDisplayId && (
        <>
          <div>
            <Label>Send Single Plate → {target?.displayName}</Label>
            <div className="flex flex-col gap-2">
              <TextInput value={plate} onChange={v => setPlate(v.toUpperCase())} placeholder="ABC123" />
              <div className="flex gap-2">
                <Select value={direction} onChange={onDirectionChange} options={DIRECTIONS} />
                <Select value={vehicleType} onChange={setVehicleType} options={VEHICLE_TYPES} />
                <Select value={vehicleColor} onChange={setVehicleColor} options={VEHICLE_COLORS} />
              </div>
              <Select value={placement} onChange={setPlacement} options={getPlacementsForDirection(direction)} />
              <Select value={gateMode} onChange={setGateMode} options={GATE_MODES} />
              <Button
                tone="primary"
                onClick={() => void sendPlate(effectiveDisplayId, {
                  plate, direction, detectorPlacement: placement, vehicleColor, vehicleType,
                  gateConfig: gateConfigFor(gateMode), queueConfig: queueConfigDefault,
                }).then(setPlateResult)}
              >
                Send Plate
              </Button>
              <ActionResultBadge result={plateResult} />
            </div>
          </div>

          <div>
            <Label>Send Queue → {target?.displayName}</Label>
            <textarea
              value={queueInput}
              onChange={e => setQueueInput(e.target.value)}
              placeholder="ABC123, DEF456, GHI789..."
              rows={3}
              className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/15 text-[11px] font-mono text-white/80 outline-none focus:border-blue-500/50 resize-none"
            />
            {queueInput.trim() && (
              <p className="mt-1 text-[9px] font-mono text-white/30">
                {queuePreview.valid.length} valid, {queuePreview.invalid.length} invalid
              </p>
            )}
            <div className="mt-2">
              <Button
                tone="primary"
                disabled={queuePreview.valid.length === 0}
                onClick={() => void sendQueue(effectiveDisplayId, {
                  plates: queuePreview.valid, direction, detectorPlacement: placement, vehicleColor, vehicleType,
                  gateConfig: gateConfigFor(gateMode), queueConfig: queueConfigDefault,
                }).then(setQueueResult)}
              >
                Send Queue
              </Button>
            </div>
            <ActionResultBadge result={queueResult} />
          </div>

          <div>
            <Label>Control → {target?.displayName}</Label>
            <div className="grid grid-cols-3 gap-1.5">
              <Button onClick={() => void pause(effectiveDisplayId).then(setControlResult)}>Pause</Button>
              <Button onClick={() => void resume(effectiveDisplayId).then(setControlResult)}>Resume</Button>
              <Button onClick={() => void stop(effectiveDisplayId).then(setControlResult)}>Stop</Button>
              <Button onClick={() => void skipCurrent(effectiveDisplayId).then(setControlResult)}>Skip</Button>
              <Button onClick={() => void openGate(effectiveDisplayId).then(setControlResult)}>Open Gate</Button>
            </div>
            <div className="mt-1.5"><ActionResultBadge result={controlResult} /></div>
          </div>

          <div>
            <Label>Send List → {target?.displayName}</Label>
            {localLists.length === 0 ? (
              <EmptyState message="No local Plate Lists." hint="Create one from the Plate Lists screen first." />
            ) : (
              <div className="flex flex-col gap-2">
                <select
                  value={selectedListId}
                  onChange={e => setSelectedListId(e.target.value)}
                  className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/15 text-[11px] font-mono text-white/80 outline-none focus:border-blue-500/50"
                >
                  <option value="">Select a list…</option>
                  {localLists.map(l => <option key={l.id} value={l.id}>{l.name} ({l.plates.length} plates)</option>)}
                </select>
                <Button
                  tone="primary"
                  disabled={!selectedListId}
                  onClick={() => {
                    const list = localLists.find(l => l.id === selectedListId);
                    if (!list) return;
                    void sendQueue(effectiveDisplayId, { plates: list.plates, ...list.simulationDefaults }).then(setListResult);
                  }}
                >
                  Run Remote List
                </Button>
                <ActionResultBadge result={listResult} />
              </div>
            )}
            <p className="mt-1.5 text-[9px] text-white/25 font-mono leading-snug">
              Sent as a run_queue command (plates + simulationDefaults) — displays and controllers don't sync list storage yet.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
