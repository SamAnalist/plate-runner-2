import { useState, useEffect } from 'react';
import type {
  SimulationConfig,
  SpeedPhases,
  SpeedPreset,
  Direction,
  DetectorPlacement,
  GateMode,
  GateInitialState,
  VehicleType,
} from '@plate-runner/shared';
import { getPlacementsForDirection, speedPhasesForPreset } from '@plate-runner/shared';
import type { SimulationControls } from '../hooks/useSimulation';
import type { PlateQueueControls } from '../features/queue/usePlateQueue';
import type { PlateListsControls } from '../features/lists/usePlateLists';
import { SimulationScene } from '../components/simulation/SimulationScene';
import { PlateInput } from '../components/controls/PlateInput';
import { PlateQueuePanel } from '../components/controls/PlateQueuePanel';
import { SceneQuickControls } from '../components/simulation/SceneQuickControls';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Label } from '../components/ui/Label';
import { FieldError } from '../components/ui/FieldError';
import { CollapsibleSection } from '../components/ui/CollapsibleSection';
import { ToggleGroup } from '../components/ui/ToggleGroup';
import { DirectionArrow } from '../components/ui/DirectionArrow';
import { SedanIcon, SuvIcon } from '../components/ui/VehicleTypeIcon';
import { VehicleColorPicker } from '../components/ui/VehicleColorPicker';

export const QUEUE_ACTIVE_STATUSES = ['running', 'paused', 'waiting_for_signal', 'waiting_for_next'];

interface LocalModeScreenProps {
  config: SimulationConfig;
  simulation: SimulationControls;
  plateQueue: PlateQueueControls;
  plateLists: PlateListsControls;
  onConfigChange: (c: SimulationConfig) => void;
  showDebug: boolean;
  onShowDebugChange: (v: boolean) => void;
  onEnterFullscreen: () => void;
  onEnterCamera: () => void;
  showAnchorOverlay: boolean;
  onShowAnchorOverlayChange: (v: boolean) => void;
  showMotionPathOverlay: boolean;
  onShowMotionPathOverlayChange: (v: boolean) => void;
}

// ─── Shared primitives ─────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-white/35 uppercase tracking-[0.16em] mb-2">
      {children}
    </p>
  );
}

function Divider() {
  return <div className="border-t border-white/8 my-4" />;
}


const VEHICLE_TYPE_OPTIONS: { value: VehicleType; label: string; icon: React.ReactNode }[] = [
  { value: 'sedan', label: 'Sedan', icon: <SedanIcon /> },
  { value: 'suv', label: 'SUV', icon: <SuvIcon /> },
];

// ─── Phase speed controls ─────────────────────────────────────────────────

interface PhaseSliderProps {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
}

function PhaseSlider({ label, hint, value, onChange }: PhaseSliderProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-mono text-white/50">{label}</span>
        <span className="text-[10px] font-mono text-blue-400 font-bold">{value}/10</span>
      </div>
      <input
        type="range" min={1} max={10} step={1} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-blue-500 h-1 rounded cursor-pointer"
      />
      <p className="text-[9px] text-white/22 font-mono leading-snug">{hint}</p>
    </div>
  );
}

const SPEED_PRESET_OPTIONS: { value: SpeedPreset; label: string; title?: string }[] = [
  { value: 'slow', label: 'Slow' },
  { value: 'regular', label: 'Regular' },
  { value: 'fast', label: 'Fast' },
  { value: 'advanced', label: '+', title: 'Advanced' },
];

function SpeedPhasesSection({
  config,
  set,
  onConfigChange,
}: {
  config: SimulationConfig;
  set: <K extends keyof SimulationConfig>(key: K, val: SimulationConfig[K]) => void;
  onConfigChange: (c: SimulationConfig) => void;
}) {
  const isIncoming = config.direction === 'incoming';
  const key = isIncoming ? 'speedIncoming' : 'speedAway';
  const sp = isIncoming ? config.speedIncoming : config.speedAway;
  const hint = isIncoming
    ? ['Entry → approaching gate', 'Decel zone before gate', 'Resuming after gate opens', 'POV slide-out off bottom']
    : ['Entry from bottom → gate', 'Decel zone before gate', 'Resuming after gate opens', 'Recede toward horizon'];

  function setPhase(field: keyof SpeedPhases, v: number) {
    set(key, { ...sp, [field]: v });
  }

  // Non-advanced presets keep both directions' speedIncoming/speedAway in lockstep at the
  // same uniform value. Advanced always opens centered ("en el medio") regardless of
  // whatever values were last dialed in, per spec. One onConfigChange call so all three
  // fields land in the same state update (three separate `set` calls would each start
  // from the same stale `config` closure and clobber each other).
  function setPreset(preset: SpeedPreset) {
    const phases = speedPhasesForPreset(preset === 'advanced' ? 'regular' : preset);
    onConfigChange({ ...config, speedPreset: preset, speedIncoming: phases, speedAway: phases });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <SectionLabel>Speed</SectionLabel>
        {config.speedPreset === 'advanced' && (
          <span className="text-[9px] font-mono text-white/25 uppercase tracking-wider">
            {isIncoming ? 'Incoming' : 'Away'}
          </span>
        )}
      </div>
      <ToggleGroup<SpeedPreset> options={SPEED_PRESET_OPTIONS} value={config.speedPreset} onChange={setPreset} fullWidth />
      {config.speedPreset === 'advanced' && (
        <div className="flex flex-col gap-3 mt-1">
          <PhaseSlider label="Initial" hint={hint[0]} value={sp.initial} onChange={v => setPhase('initial', v)} />
          <PhaseSlider label="Stopping" hint={hint[1]} value={sp.stopping} onChange={v => setPhase('stopping', v)} />
          <PhaseSlider label="After Stop" hint={hint[2]} value={sp.afterStop} onChange={v => setPhase('afterStop', v)} />
          <PhaseSlider label="Final / Exit" hint={hint[3]} value={sp.final} onChange={v => setPhase('final', v)} />
        </div>
      )}
    </div>
  );
}

// ─── Duration input ────────────────────────────────────────────────────────

function DurationInput({
  label,
  valueMs,
  onChange,
  min = 100,
  max = 10000,
  step = 100,
}: {
  label: string;
  valueMs: number;
  onChange: (ms: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-white/40 font-mono">{label}</span>
        <span className="text-[10px] font-mono text-blue-400 font-bold">{(valueMs / 1000).toFixed(1)}s</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={valueMs}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-blue-500 h-1 rounded cursor-pointer"
      />
    </div>
  );
}

// ─── Gate section ──────────────────────────────────────────────────────────

function GateSection({
  config,
  onConfigChange,
  simulation,
}: {
  config: SimulationConfig;
  onConfigChange: (c: SimulationConfig) => void;
  simulation: SimulationControls;
}) {
  function set<K extends keyof SimulationConfig>(key: K, val: SimulationConfig[K]) {
    onConfigChange({ ...config, [key]: val });
  }

  const { state, openGate, closeGate } = simulation;
  const isAtGate = state.phase === 'stopped_at_gate' || state.phase === 'gate_opening';
  const isWaiting = state.phase === 'waiting_for_signal';
  const gateVisible = config.gateMode !== 'hidden';
  const gateClosed = config.gateInitialState === 'closed';
  const isAutoOpen = config.gateMode === 'auto_open';

  return (
    <div className="flex flex-col gap-3">
      <div>
        <SectionLabel>Gate</SectionLabel>
        <ToggleGroup<GateMode>
          options={[
            { value: 'hidden', label: 'Hidden' },
            { value: 'auto_open', label: 'Auto Open' },
            { value: 'wait_for_signal', label: 'Wait Signal' },
          ]}
          value={config.gateMode}
          onChange={v => set('gateMode', v)}
          fullWidth
        />
        <p className="mt-1.5 text-[10px] text-white/25 font-mono leading-snug">
          {config.gateMode === 'hidden'
            ? 'Gate not shown — vehicle passes without stopping.'
            : config.gateMode === 'auto_open'
              ? 'Vehicle stops at gate, arm rises automatically.'
              : 'Vehicle stops; Send Signal button triggers the arm.'}
        </p>
      </div>

      {gateVisible && (
        <div>
          <p className="text-[10px] text-white/35 uppercase tracking-[0.16em] mb-1.5">
            Initial State
          </p>
          <ToggleGroup<GateInitialState>
            options={[
              { value: 'closed', label: 'Closed' },
              { value: 'open', label: 'Open' },
            ]}
            value={config.gateInitialState}
            onChange={v => set('gateInitialState', v)}
            fullWidth
          />
          {config.gateInitialState === 'open' && (
            <p className="mt-1.5 text-[10px] text-white/25 font-mono leading-snug">
              Gate starts open — vehicle passes through without stopping.
            </p>
          )}
        </div>
      )}

      {gateVisible && gateClosed && isAutoOpen && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] text-white/35 uppercase tracking-[0.16em]">Timings</p>
          <DurationInput
            label="Stop before opening"
            valueMs={config.stopBeforeOpenMs}
            onChange={v => set('stopBeforeOpenMs', v)}
            min={200} max={8000} step={200}
          />
          <DurationInput
            label="Delay after arm rises"
            valueMs={config.delayAfterOpenMs}
            onChange={v => set('delayAfterOpenMs', v)}
            min={0} max={3000} step={100}
          />
        </div>
      )}

      {gateVisible && (
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full transition-colors ${
            state.gateOpen ? 'bg-emerald-400' : 'bg-red-500'}`} />
          <span className="text-[10px] font-mono text-white/40">
            Arm: {state.gateOpen ? 'OPEN' : 'CLOSED'}
          </span>
          {isAtGate && (
            <span className="ml-auto text-[10px] font-mono text-orange-400 animate-pulse">
              STOPPED
            </span>
          )}
          {isWaiting && (
            <span className="ml-auto text-[10px] font-mono text-yellow-400 animate-pulse">
              WAITING
            </span>
          )}
        </div>
      )}

      {isWaiting && (
        <>
          <Button
            variant="solid"
            tone="warn"
            className="w-full animate-pulse disabled:animate-none"
            onClick={openGate}
            disabled={state.isPaused}
          >
            ⬆ Send Open Signal
          </Button>
          {state.isPaused && (
            <p className="text-[10px] text-cyan-400/70 font-mono text-center -mt-1.5">
              Paused — resume to send signal
            </p>
          )}
        </>
      )}

      {gateVisible && !isWaiting && (
        <div>
          <p className="text-[10px] text-white/35 uppercase tracking-[0.16em] mb-1.5">
            Manual Override
          </p>
          <div className="flex gap-2">
            <button onClick={openGate} disabled={state.gateOpen}
              className="flex-1 py-1.5 rounded text-xs font-mono font-semibold
                border border-emerald-500/40 text-emerald-400
                disabled:opacity-30 disabled:cursor-not-allowed
                hover:bg-emerald-500/15 transition-colors">
              Open
            </button>
            <Button variant="ghost" tone="danger" className="flex-1" onClick={closeGate} disabled={!state.gateOpen}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Plate Queue: Manual / From List ────────────────────────────────────────

function SaveAsListDialog({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (name: string) => { ok: boolean; error?: string };
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    const result = onSave(name);
    if (!result.ok) {
      setError(result.error ?? 'Could not save list.');
      return;
    }
    onCancel();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onCancel}>
      <div
        className="w-full max-w-xs rounded-lg border border-white/12 bg-[#171a22] p-4 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3">Save as Plate List</p>
        <Label>Name</Label>
        <input
          autoFocus
          value={name}
          onChange={e => { setName(e.target.value); setError(null); }}
          placeholder="e.g. Morning Shift"
          className="w-full px-2.5 py-2 rounded-md bg-white/5 border border-white/15
            font-mono text-xs text-white/80 outline-none focus:border-blue-500/50"
        />
        {error && <div className="mt-1.5"><FieldError>{error}</FieldError></div>}
        <div className="mt-3 flex justify-end gap-2">
          <Button tone="neutral" onClick={onCancel}>Cancel</Button>
          <Button tone="primary" onClick={handleSave} disabled={!name.trim()}>Save</Button>
        </div>
      </div>
    </div>
  );
}

type QueueSource = 'manual' | 'from_list';

function PlateQueueSection({
  config,
  plateQueue,
  plateLists,
}: {
  config: SimulationConfig;
  plateQueue: PlateQueueControls;
  plateLists: PlateListsControls;
}) {
  const [source, setSource] = useState<QueueSource>('manual');
  const [selectedListId, setSelectedListId] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Runs when a list starts playing via a path other than this section's own
  // "From List" picker — the Plate Lists screen's Run button, or a schedule
  // firing. plateLists.lastLoadedList is a fresh object every such run, so
  // this fires even for a repeat run of the same list.
  useEffect(() => {
    if (!plateLists.lastLoadedList) return;
    setSource('from_list');
    setSelectedListId(plateLists.lastLoadedList.id);
  }, [plateLists.lastLoadedList]);

  function handleSelectList(id: string) {
    setSelectedListId(id);
    if (id) plateLists.loadListIntoQueue(id);
  }

  function handleSave(name: string) {
    if (plateQueue.items.length === 0) {
      return { ok: false, error: 'Apply a queue first — nothing to save.' };
    }
    return plateLists.createList({
      name,
      plates: plateQueue.items.map(item => item.plate),
      simulationDefaults: {
        direction: config.direction,
        detectorPlacement: config.detectorPlacement,
        vehicleColor: config.vehicleColor,
        vehicleType: config.vehicleType,
        gateConfig: {
          gateMode: config.gateMode,
          gateInitialState: config.gateInitialState,
          stopBeforeOpenMs: config.stopBeforeOpenMs,
          delayAfterOpenMs: config.delayAfterOpenMs,
        },
        queueConfig: plateQueue.queueConfig,
        speedPreset: config.speedPreset === 'advanced' ? undefined : config.speedPreset,
      },
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <ToggleGroup<QueueSource>
        options={[
          { value: 'manual', label: 'Manual' },
          { value: 'from_list', label: 'From List' },
        ]}
        value={source}
        onChange={setSource}
      />

      {source === 'from_list' && (
        <div>
          <SectionLabel>Saved Plate Lists</SectionLabel>
          {plateLists.lists.length === 0 ? (
            <p className="text-[10px] text-white/30 font-mono">No plate lists saved yet.</p>
          ) : (
            <select
              value={selectedListId}
              onChange={e => handleSelectList(e.target.value)}
              className="w-full px-2.5 py-2 rounded-md bg-white/5 border border-white/15
                font-mono text-xs text-white/80 outline-none focus:border-blue-500/50"
            >
              <option value="">Select a plate list…</option>
              {plateLists.lists.map(list => (
                <option key={list.id} value={list.id}>{list.name} ({list.plates.length})</option>
              ))}
            </select>
          )}
          <p className="mt-1.5 text-[9px] text-white/25 font-mono leading-snug">
            Loads the list's plates and simulation defaults into the queue below — press Run Queue to start.
          </p>
        </div>
      )}

      <PlateQueuePanel {...plateQueue} hideInput={source === 'from_list'} />

      {source === 'manual' && (
        <Button
          variant="ghost"
          tone="neutral"
          className="w-full"
          onClick={() => setShowSaveDialog(true)}
          disabled={plateQueue.items.length === 0}
        >
          💾 Save as Plate List
        </Button>
      )}

      {showSaveDialog && (
        <SaveAsListDialog onCancel={() => setShowSaveDialog(false)} onSave={handleSave} />
      )}
    </div>
  );
}

// ─── Main screen ────────────────────────────────────────────────────────────

export function LocalModeScreen({
  config,
  simulation,
  plateQueue,
  plateLists,
  onConfigChange,
  showDebug,
  onShowDebugChange,
  onEnterFullscreen,
  onEnterCamera,
  showAnchorOverlay,
  onShowAnchorOverlayChange,
  showMotionPathOverlay,
  onShowMotionPathOverlayChange,
}: LocalModeScreenProps) {
  const { state, start, stop, reset, pause, resume } = simulation;
  const queueActive = QUEUE_ACTIVE_STATUSES.includes(plateQueue.queueStatus);

  // Off by default — when on, a completed single-plate run (phase 'done')
  // restarts instead of stopping, until the user turns it off or presses
  // Stop. Separate from PlateQueueConfig.loop (that loops through a *list*
  // of plates in Queue Mode); this loops the current single plate
  // indefinitely and only applies outside Queue Mode.
  //
  // Restart is delayed by loopGapMs (own setting, independent of Queue
  // Mode's gapBetweenVehiclesMs — defaults to the same 1500ms starting
  // point, but Loop and Queue paces are independently tunable) — not
  // immediate. This isn't just pacing, it's required for the gate-close
  // animation to be visible at all. The gate arm's CSS transition is
  // 850ms; restarting immediately respawns the next vehicle at full size
  // while the arm is still mid-close, and depth ordering (SimulationScene's
  // vehicleBehindGate) paints the vehicle over the gate the instant it
  // spawns for several placements (away scenes, and incoming center_front),
  // hiding the close animation entirely. Queue Mode never showed this bug
  // only because its gap already left enough empty-road time for the close
  // animation to finish before the next vehicle could occlude it — keep
  // loopGapMs at 850ms or more for the same reason.
  const [loopPlayback, setLoopPlayback] = useState(false);
  const [loopGapMs, setLoopGapMs] = useState(1500);
  useEffect(() => {
    if (!loopPlayback || queueActive || state.phase !== 'done') return;
    const id = setTimeout(start, loopGapMs);
    return () => clearTimeout(id);
  }, [loopPlayback, queueActive, state.phase, start, loopGapMs]);

  function set<K extends keyof SimulationConfig>(key: K, value: SimulationConfig[K]) {
    onConfigChange({ ...config, [key]: value });
  }

  const isRunning = state.isRunning;
  const isAtGate = state.phase === 'stopped_at_gate' || state.phase === 'waiting_for_signal';
  const isGateOpening = state.phase === 'gate_opening';

  const phaseLabel =
    state.phase === 'running' ? 'Running' :
    state.phase === 'stopped_at_gate' ? 'Stopped at gate' :
    state.phase === 'waiting_for_signal' ? 'Waiting for signal' :
    state.phase === 'gate_opening' ? 'Gate opening' :
    state.phase === 'done' ? 'Vehicle passed' :
    'Idle';

  return (
    <div className="flex h-full">
      <div className="relative flex-1 flex items-center justify-center p-6 min-w-0">
        <SimulationScene
          config={config}
          simulation={simulation}
          showDebug={showDebug}
          showAnchorOverlay={showAnchorOverlay}
          showMotionPathOverlay={showMotionPathOverlay}
        />
        <SceneQuickControls
          isRunning={isRunning && !isGateOpening}
          isPaused={state.isPaused}
          isGateOpening={isGateOpening}
          isDone={state.phase === 'done'}
          onStart={start}
          onPause={pause}
          onResume={resume}
          canSkip={queueActive}
          onSkip={plateQueue.skipCurrent}
        />
      </div>
      <aside className="w-72 shrink-0 border-l border-white/8 overflow-y-auto">
        <div className="flex flex-col h-full bg-[#0f1117]">
          <div className="px-4 py-3 border-b border-white/8 shrink-0">
            <p className="text-xs font-mono font-bold text-white/60 uppercase tracking-widest">
              Simulation Controls
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <CollapsibleSection title="License Plate" defaultOpen chevronClassName="text-lg">
              <PlateInput value={config.plate} onChange={p => set('plate', p)} disabled={queueActive} />
            </CollapsibleSection>

            <Divider />

            <CollapsibleSection title="Playback" defaultOpen chevronClassName="text-lg">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full transition-colors ${
                    isRunning ? 'bg-emerald-400 animate-pulse' :
                    isAtGate ? 'bg-yellow-400' :
                    isGateOpening ? 'bg-cyan-400 animate-pulse' :
                    state.phase === 'done' ? 'bg-blue-400' : 'bg-white/20'}`} />
                  <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                    {phaseLabel}
                  </span>
                  <span className="ml-auto text-[10px] font-mono text-white/25">
                    t={state.vehicleT.toFixed(3)}
                  </span>
                </div>
                {queueActive ? (
                  <div className="py-2 text-center">
                    <Badge tone="info">Controlled by Plate Queue</Badge>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 grid-rows-2 gap-2">
                    {!isRunning && !isGateOpening ? (
                      <Button variant="solid" tone="primary" onClick={start}>
                        ▶ {state.phase === 'done' || isAtGate ? 'Restart' : 'Start'}
                      </Button>
                    ) : (
                      <Button variant="solid" tone="danger" onClick={stop}>
                        ⏹ Stop
                      </Button>
                    )}
                    <Button
                      variant="solid"
                      tone="neutral"
                      onClick={state.isPaused ? resume : pause}
                      disabled={!state.isPaused && (state.phase === 'idle' || state.phase === 'done')}
                    >
                      {state.isPaused ? '⏵ Resume' : '⏸ Pause'}
                    </Button>
                    <Button variant="solid" tone="neutral" onClick={reset}>
                      ↺ Reset
                    </Button>
                    <Button
                      variant="solid"
                      tone={loopPlayback ? 'primary' : 'neutral'}
                      onClick={() => setLoopPlayback(v => !v)}
                      aria-label={loopPlayback ? 'Loop playback: on' : 'Loop playback: off'}
                      title={loopPlayback ? 'Loop playback: on — vehicle repeats indefinitely' : 'Loop playback: off'}
                    >
                      ↻ Loop
                    </Button>
                  </div>
                )}
                {!queueActive && loopPlayback && (
                  <div className="mt-2 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-white/40 font-mono">Loop gap</span>
                      <span className="text-[10px] font-mono text-blue-400 font-bold">{loopGapMs}ms</span>
                    </div>
                    <input
                      type="range" min={850} max={10000} step={100}
                      value={loopGapMs}
                      onChange={e => setLoopGapMs(Number(e.target.value))}
                      className="w-full accent-blue-500 h-1 rounded cursor-pointer"
                    />
                    <p className="text-[9px] font-mono text-white/25 leading-snug">
                      Delay before the next run starts. Keep at 850ms+ so the gate's close animation has time to play.
                    </p>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            <Divider />

            <CollapsibleSection title="Visual Settings" defaultOpen chevronClassName="text-lg">
              <div className="flex flex-col gap-4">
                <SpeedPhasesSection config={config} set={set} onConfigChange={onConfigChange} />

                <div>
                  <SectionLabel>Vehicle Type</SectionLabel>
                  <ToggleGroup<VehicleType>
                    options={VEHICLE_TYPE_OPTIONS}
                    value={config.vehicleType}
                    onChange={v => set('vehicleType', v)}
                    fullWidth
                    size="md"
                  />
                </div>

                <div>
                  <SectionLabel>Vehicle Color</SectionLabel>
                  <VehicleColorPicker value={config.vehicleColor} onChange={color => set('vehicleColor', color)} fullWidth />
                </div>

                <CollapsibleSection title="Direction & Placement" defaultOpen={false} chevronClassName="text-lg">
                  <div className="flex flex-col gap-4">
                    <div>
                      <SectionLabel>Direction</SectionLabel>
                      <ToggleGroup<Direction>
                        options={[
                          { value: 'incoming', label: 'Incoming', icon: <DirectionArrow direction="down" /> },
                          { value: 'away', label: 'Away', icon: <DirectionArrow direction="up" /> },
                        ]}
                        value={config.direction}
                        onChange={v => set('direction', v)}
                        fullWidth
                      />
                    </div>

                    <div>
                      <SectionLabel>Detector Placement</SectionLabel>
                      <div className="grid grid-cols-3 gap-1 text-center">
                        {(getPlacementsForDirection(config.direction) as DetectorPlacement[]).map(val => {
                          const isFront = val.endsWith('_front');
                          const side = val.split('_')[0].toUpperCase();
                          const face = isFront ? 'FRONT' : 'BACK';
                          const lbl = `${side}\n${face}`;
                          return (
                            <button
                              key={val}
                              onClick={() => set('detectorPlacement', val)}
                              className={`
                                py-2 rounded text-[10px] font-mono font-semibold leading-snug
                                border transition-all whitespace-pre-line
                                ${config.detectorPlacement === val
                                  ? 'bg-blue-600/80 border-blue-500/70 text-white'
                                  : 'bg-white/5 border-white/12 text-white/45 hover:text-white/75 hover:border-white/25'}
                              `}
                            >
                              {lbl}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-1.5 text-[10px] text-white/30 font-mono leading-snug">
                        {config.direction === 'incoming'
                          ? 'Front face visible — front plate'
                          : 'Rear face visible — rear plate'}
                      </p>
                    </div>
                  </div>
                </CollapsibleSection>
              </div>
            </CollapsibleSection>

            <Divider />

            <CollapsibleSection
              title="Plate Queue"
              badge={queueActive ? plateQueue.queueStatus.toUpperCase() : undefined}
              defaultOpen={false}
              chevronClassName="text-lg"
            >
              <PlateQueueSection config={config} plateQueue={plateQueue} plateLists={plateLists} />
            </CollapsibleSection>

            <Divider />

            <CollapsibleSection title="Gate Settings" defaultOpen={false} chevronClassName="text-lg">
              <GateSection config={config} onConfigChange={onConfigChange} simulation={simulation} />
            </CollapsibleSection>

            {!import.meta.env.PROD && (
              <>
                <Divider />

                <CollapsibleSection
                  title="Visual QA"
                  badge={(showAnchorOverlay || showMotionPathOverlay) ? 'ON' : undefined}
                  defaultOpen={false}
                  chevronClassName="text-lg"
                >
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-[10px] text-white/35 uppercase tracking-widest mb-1.5">Quick plates</p>
                      <div className="flex flex-col gap-1">
                        {[
                          { label: 'ABC123', plate: 'ABC123' },
                          { label: 'ABCDEFGHIJ12', plate: 'ABCDEFGHIJ12' },
                          { label: '123456789012', plate: '123456789012' },
                        ].map(({ label, plate }) => (
                          <button
                            key={plate}
                            onClick={() => onConfigChange({ ...config, plate })}
                            className={`
                              px-2.5 py-1.5 rounded text-[10px] font-mono font-semibold
                              border transition-all text-left tracking-wider
                              ${config.plate === plate
                                ? 'bg-green-600/25 border-green-500/50 text-green-300'
                                : 'bg-white/4 border-white/10 text-white/45 hover:text-white/70 hover:border-white/22'}
                            `}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] text-white/35 uppercase tracking-widest mb-1.5">Overlays</p>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => onShowAnchorOverlayChange(!showAnchorOverlay)}
                          className={`
                            w-full py-1.5 rounded text-xs font-mono font-semibold
                            border transition-all
                            ${showAnchorOverlay
                              ? 'bg-green-600/25 border-green-500/45 text-green-300'
                              : 'bg-white/5 border-white/12 text-white/45 hover:text-white/70'}
                          `}
                        >
                          {showAnchorOverlay ? '▣ Anchor bounds: ON' : '▢ Anchor bounds: OFF'}
                        </button>
                        <button
                          onClick={() => onShowMotionPathOverlayChange(!showMotionPathOverlay)}
                          className={`
                            w-full py-1.5 rounded text-xs font-mono font-semibold
                            border transition-all
                            ${showMotionPathOverlay
                              ? 'bg-orange-600/25 border-orange-500/45 text-orange-300'
                              : 'bg-white/5 border-white/12 text-white/45 hover:text-white/70'}
                          `}
                        >
                          {showMotionPathOverlay ? '◈ Motion path: ON' : '◇ Motion path: OFF'}
                        </button>
                      </div>
                      <p className="mt-1 text-[9px] text-white/25 font-mono leading-snug">
                        Asset Realistic only · hidden in Camera Mode
                      </p>
                    </div>
                  </div>
                </CollapsibleSection>
              </>
            )}

            <Divider />

            <CollapsibleSection title="View Modes" defaultOpen chevronClassName="text-lg">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    tone={showDebug ? 'primary' : 'neutral'}
                    className="flex-1"
                    onClick={() => onShowDebugChange(!showDebug)}
                  >
                    {showDebug ? 'Debug: ON' : 'Debug: OFF'}
                  </Button>
                </div>
                <Button variant="ghost" tone="neutral" onClick={onEnterFullscreen}>
                  ⛶  Fullscreen Scene
                </Button>
                <Button variant="ghost" tone="neutral" onClick={onEnterCamera}>
                  ◉  Camera Mode
                </Button>
              </div>
            </CollapsibleSection>
          </div>

          <div className="px-4 py-3 border-t border-white/8 shrink-0">
            <p className="text-[10px] font-mono text-white/20 leading-snug">
              v0.9.0 — Gate Behavior + POV Motion
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
