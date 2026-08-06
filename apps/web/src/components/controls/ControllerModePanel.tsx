import { useState } from 'react';
import {
  DIRECTIONS,
  VEHICLE_COLORS,
  GATE_MODES,
  DEFAULT_CONFIG,
  getPlacementsForDirection,
  remapPlacementForDirection,
  isPlacementAllowedForDirection,
  type Direction,
  type DetectorPlacement,
  type VehicleColor,
  type GateMode,
  type PlateList,
} from '@plate-runner/shared';
import type { RemoteControllerControls, RemoteActionResult } from '../../features/controller/useRemoteController';
import { parsePlateQueueInput } from '../../features/queue/plateQueueParser';

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] text-white/35 uppercase tracking-[0.16em] mb-1.5">{children}</p>;
}

function SmallButton({
  onClick, disabled, children, tone = 'neutral',
}: {
  onClick: () => void; disabled?: boolean; children: React.ReactNode; tone?: 'neutral' | 'primary' | 'danger';
}) {
  const toneClasses: Record<string, string> = {
    neutral: 'border-white/12 text-white/55 hover:text-white/85 hover:border-white/25 bg-white/5',
    primary: 'border-blue-500/60 text-blue-300 hover:bg-blue-600/20 bg-blue-600/10',
    danger:  'border-red-500/40 text-red-400 hover:bg-red-500/15 bg-white/5',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-2.5 py-1.5 rounded text-[10px] font-mono font-semibold border transition-all disabled:opacity-25 disabled:cursor-not-allowed ${toneClasses[tone]}`}
    >
      {children}
    </button>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/15 text-[11px] font-mono text-white/80 outline-none focus:border-blue-500/50"
    />
  );
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
    ? <p className="text-[10px] font-mono text-emerald-400/80">Sent — command {result.commandId.slice(0, 8)}</p>
    : <p className="text-[10px] font-mono text-red-400/80">{result.error}</p>;
}

export function ControllerModePanel({ controller, localLists }: { controller: RemoteControllerControls; localLists: PlateList[] }) {
  const {
    apiBaseUrl, setApiBaseUrl, apiKey, setApiKey,
    pairedDisplays, pairWithCode, forgetPairing, pairError,
    sendPlate, sendQueue, pause, resume, stop, skipCurrent, openGate,
  } = controller;

  const [controllerName, setControllerName] = useState('');
  const [pairCode, setPairCode] = useState('');
  const [selectedDisplayId, setSelectedDisplayId] = useState<string>('');

  const [plate, setPlate] = useState(DEFAULT_CONFIG.plate);
  const [direction, setDirection] = useState<Direction>(DEFAULT_CONFIG.direction);
  const [placement, setPlacement] = useState<DetectorPlacement>(DEFAULT_CONFIG.detectorPlacement);
  const [vehicleColor, setVehicleColor] = useState<VehicleColor>(DEFAULT_CONFIG.vehicleColor);
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
          <TextInput value={apiBaseUrl} onChange={setApiBaseUrl} placeholder="http://localhost:8787" />
          <TextInput value={apiKey} onChange={setApiKey} placeholder="dev-local-key" />
        </div>
      </div>

      <div>
        <Label>Pair Display</Label>
        <div className="flex flex-col gap-2">
          <TextInput value={controllerName} onChange={setControllerName} placeholder="Controller name (e.g. Laptop Samuel)" />
          <TextInput value={pairCode} onChange={setPairCode} placeholder="6-digit code" />
          <SmallButton
            tone="primary"
            disabled={!controllerName.trim() || !/^\d{6}$/.test(pairCode.trim())}
            onClick={() => void pairWithCode(controllerName.trim(), pairCode.trim()).then(() => setPairCode(''))}
          >
            Pair
          </SmallButton>
          {pairError && <p className="text-[10px] font-mono text-red-400/80">{pairError}</p>}
        </div>
      </div>

      <div>
        <Label>Paired Displays ({activePairings.length})</Label>
        {activePairings.length === 0 ? (
          <p className="text-[10px] font-mono text-white/25">No displays paired yet.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {activePairings.map(p => (
              <div
                key={p.displayId}
                onClick={() => setSelectedDisplayId(p.displayId)}
                className={`flex items-center justify-between px-2 py-1.5 rounded border cursor-pointer transition-all ${
                  effectiveDisplayId === p.displayId ? 'bg-blue-600/15 border-blue-500/40' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-mono text-white/70 truncate">{p.displayName}</p>
                  <p className="text-[9px] font-mono text-white/25">paired {new Date(p.pairedAt).toLocaleString()}</p>
                </div>
                <SmallButton tone="danger" onClick={() => forgetPairing(p.displayId)}>Remove</SmallButton>
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
                <Select value={vehicleColor} onChange={setVehicleColor} options={VEHICLE_COLORS} />
              </div>
              <Select value={placement} onChange={setPlacement} options={getPlacementsForDirection(direction)} />
              <Select value={gateMode} onChange={setGateMode} options={GATE_MODES} />
              <SmallButton
                tone="primary"
                onClick={() => void sendPlate(effectiveDisplayId, {
                  plate, direction, detectorPlacement: placement, vehicleColor,
                  gateConfig: gateConfigFor(gateMode), queueConfig: queueConfigDefault,
                }).then(setPlateResult)}
              >
                Send Plate
              </SmallButton>
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
              <SmallButton
                tone="primary"
                disabled={queuePreview.valid.length === 0}
                onClick={() => void sendQueue(effectiveDisplayId, {
                  plates: queuePreview.valid, direction, detectorPlacement: placement, vehicleColor,
                  gateConfig: gateConfigFor(gateMode), queueConfig: queueConfigDefault,
                }).then(setQueueResult)}
              >
                Send Queue
              </SmallButton>
            </div>
            <ActionResultBadge result={queueResult} />
          </div>

          <div>
            <Label>Control → {target?.displayName}</Label>
            <div className="grid grid-cols-3 gap-1.5">
              <SmallButton onClick={() => void pause(effectiveDisplayId).then(setControlResult)}>Pause</SmallButton>
              <SmallButton onClick={() => void resume(effectiveDisplayId).then(setControlResult)}>Resume</SmallButton>
              <SmallButton onClick={() => void stop(effectiveDisplayId).then(setControlResult)}>Stop</SmallButton>
              <SmallButton onClick={() => void skipCurrent(effectiveDisplayId).then(setControlResult)}>Skip</SmallButton>
              <SmallButton onClick={() => void openGate(effectiveDisplayId).then(setControlResult)}>Open Gate</SmallButton>
            </div>
            <div className="mt-1.5"><ActionResultBadge result={controlResult} /></div>
          </div>

          <div>
            <Label>Send List → {target?.displayName}</Label>
            {localLists.length === 0 ? (
              <p className="text-[10px] font-mono text-white/25">No local Plate Lists — create one in Local Mode first.</p>
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
                <SmallButton
                  tone="primary"
                  disabled={!selectedListId}
                  onClick={() => {
                    const list = localLists.find(l => l.id === selectedListId);
                    if (!list) return;
                    void sendQueue(effectiveDisplayId, { plates: list.plates, ...list.simulationDefaults }).then(setListResult);
                  }}
                >
                  Run Remote List
                </SmallButton>
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
