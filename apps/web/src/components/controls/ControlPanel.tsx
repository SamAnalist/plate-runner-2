import { useState } from 'react';
import type {
  SimulationConfig,
  SpeedPhases,
  Direction,
  DetectorPlacement,
  GateMode,
  GateInitialState,
  VehicleColor,
} from '@plate-runner/shared';
import type { SimulationControls } from '../../hooks/useSimulation';
import type { PlateQueueControls } from '../../features/queue/usePlateQueue';
import type { PlateListsControls } from '../../features/lists/usePlateLists';
import type { LocalSchedulerControls } from '../../features/scheduler/useLocalScheduler';
import type { ExecutionHistoryControls } from '../../features/history/useExecutionHistory';
import type { ApiCommandListenerControls } from '../../features/api/useApiCommandListener';
import { getPlacementsForDirection } from '@plate-runner/shared';
import { PlateInput } from './PlateInput';
import { PlateQueuePanel } from './PlateQueuePanel';
import { PlateListsPanel } from './PlateListsPanel';
import { SchedulerPanel } from './SchedulerPanel';
import { ExecutionHistoryPanel } from './ExecutionHistoryPanel';
import { LocalApiPanel } from './LocalApiPanel';

interface ControlPanelProps {
  config: SimulationConfig;
  simulation: SimulationControls;
  plateQueue: PlateQueueControls;
  plateLists: PlateListsControls;
  scheduler: LocalSchedulerControls;
  executionHistory: ExecutionHistoryControls;
  apiCommandListener: ApiCommandListenerControls;
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

interface ToggleGroupProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

function ToggleGroup<T extends string>({ options, value, onChange }: ToggleGroupProps<T>) {
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`
            px-2.5 py-1.5 rounded text-xs font-mono font-semibold
            border transition-all
            ${value === opt.value
              ? 'bg-blue-600/80 border-blue-500/70 text-white'
              : 'bg-white/5 border-white/12 text-white/50 hover:text-white/80 hover:border-white/25'}
          `}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  badge,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-1 mb-2 group"
      >
        <p className="text-[10px] font-semibold text-white/35 uppercase tracking-[0.16em] group-hover:text-white/55 transition-colors">
          {title}
          {badge && (
            <span className="ml-2 px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-[9px]">
              {badge}
            </span>
          )}
        </p>
        <span className="text-white/25 text-[10px] group-hover:text-white/45 transition-colors">
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

// ─── Color swatch ─────────────────────────────────────────────────────────

const COLOR_MAP: Record<VehicleColor, string> = {
  blue: '#2563eb',
  red:  '#dc2626',
  gray: '#6b7280',
};

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

function SpeedPhasesSection({
  config,
  set,
}: {
  config: SimulationConfig;
  set: <K extends keyof SimulationConfig>(key: K, val: SimulationConfig[K]) => void;
}) {
  const isIncoming = config.direction === 'incoming';
  const key  = isIncoming ? 'speedIncoming' : 'speedAway';
  const sp   = isIncoming ? config.speedIncoming : config.speedAway;
  const hint = isIncoming
    ? ['Entry → approaching gate', 'Decel zone before gate', 'Resuming after gate opens', 'POV slide-out off bottom']
    : ['Entry from bottom → gate',  'Decel zone before gate', 'Resuming after gate opens', 'Recede toward horizon'];

  function setPhase(field: keyof SpeedPhases, v: number) {
    set(key, { ...sp, [field]: v });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <SectionLabel>Speed</SectionLabel>
        <span className="text-[9px] font-mono text-white/25 uppercase tracking-wider">
          {isIncoming ? 'Incoming' : 'Away'}
        </span>
      </div>
      <PhaseSlider label="Initial"     hint={hint[0]} value={sp.initial}   onChange={v => setPhase('initial',   v)} />
      <PhaseSlider label="Stopping"    hint={hint[1]} value={sp.stopping}  onChange={v => setPhase('stopping',  v)} />
      <PhaseSlider label="After Stop"  hint={hint[2]} value={sp.afterStop} onChange={v => setPhase('afterStop', v)} />
      <PhaseSlider label="Final / Exit" hint={hint[3]} value={sp.final}    onChange={v => setPhase('final',     v)} />
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
        <span className="text-[10px] font-mono text-blue-400 font-bold">{valueMs}ms</span>
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
  const isAtGate  = state.phase === 'stopped_at_gate' || state.phase === 'gate_opening';
  const isWaiting = state.phase === 'waiting_for_signal';
  const gateVisible = config.gateMode !== 'hidden';
  const gateClosed  = config.gateInitialState === 'closed';
  const isAutoOpen  = config.gateMode === 'auto_open';

  return (
    <div className="flex flex-col gap-3">

      {/* ── Visibility ─────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Gate</SectionLabel>
        <ToggleGroup<GateMode>
          options={[
            { value: 'hidden',          label: 'Hidden'       },
            { value: 'auto_open',       label: 'Auto Open'    },
            { value: 'wait_for_signal', label: 'Wait Signal'  },
          ]}
          value={config.gateMode}
          onChange={v => set('gateMode', v)}
        />
        <p className="mt-1.5 text-[10px] text-white/25 font-mono leading-snug">
          {config.gateMode === 'hidden'
            ? 'Gate not shown — vehicle passes without stopping.'
            : config.gateMode === 'auto_open'
            ? 'Vehicle stops at gate, arm rises automatically.'
            : 'Vehicle stops; Send Signal button triggers the arm.'}
        </p>
      </div>

      {/* ── Initial state (only when gate is visible) ─────────────────── */}
      {gateVisible && (
        <div>
          <p className="text-[10px] text-white/35 uppercase tracking-[0.16em] mb-1.5">
            Initial State
          </p>
          <ToggleGroup<GateInitialState>
            options={[
              { value: 'closed', label: 'Closed' },
              { value: 'open',   label: 'Open'   },
            ]}
            value={config.gateInitialState}
            onChange={v => set('gateInitialState', v)}
          />
          {config.gateInitialState === 'open' && (
            <p className="mt-1.5 text-[10px] text-white/25 font-mono leading-snug">
              Gate starts open — vehicle passes through without stopping.
            </p>
          )}
        </div>
      )}

      {/* ── Auto-open timings ─────────────────────────────────────────── */}
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

      {/* ── Status indicator ──────────────────────────────────────────── */}
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

      {/* ── Send Open Signal — prominent, only when waiting_for_signal ── */}
      {isWaiting && (
        <>
          <button
            onClick={openGate}
            disabled={state.isPaused}
            className="w-full py-2.5 rounded text-sm font-mono font-bold
              bg-yellow-500/20 border-2 border-yellow-400/70 text-yellow-300
              hover:bg-yellow-500/35 hover:border-yellow-300 transition-all
              disabled:opacity-30 disabled:cursor-not-allowed disabled:animate-none
              animate-pulse"
          >
            ⬆ Send Open Signal
          </button>
          {state.isPaused && (
            <p className="text-[10px] text-cyan-400/70 font-mono text-center -mt-1.5">
              Paused — resume to send signal
            </p>
          )}
        </>
      )}

      {/* ── Manual gate override ──────────────────────────────────────── */}
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
            <button onClick={closeGate} disabled={!state.gateOpen}
              className="flex-1 py-1.5 rounded text-xs font-mono font-semibold
                border border-red-500/40 text-red-400
                disabled:opacity-30 disabled:cursor-not-allowed
                hover:bg-red-500/15 transition-colors">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main panel ────────────────────────────────────────────────────────────

const QUEUE_ACTIVE_STATUSES = ['running', 'paused', 'waiting_for_signal', 'waiting_for_next'];

export function ControlPanel({
  config,
  simulation,
  plateQueue,
  plateLists,
  scheduler,
  executionHistory,
  apiCommandListener,
  onConfigChange,
  showDebug,
  onShowDebugChange,
  onEnterFullscreen,
  onEnterCamera,
  showAnchorOverlay,
  onShowAnchorOverlayChange,
  showMotionPathOverlay,
  onShowMotionPathOverlayChange,
}: ControlPanelProps) {
  const { state, start, stop, reset, pause, resume } = simulation;
  const queueActive = QUEUE_ACTIVE_STATUSES.includes(plateQueue.queueStatus);

  function set<K extends keyof SimulationConfig>(key: K, value: SimulationConfig[K]) {
    onConfigChange({ ...config, [key]: value });
  }

  const isRunning = state.isRunning;
  const isAtGate  = state.phase === 'stopped_at_gate' || state.phase === 'waiting_for_signal';
  const isGateOpening = state.phase === 'gate_opening';

  const phaseLabel =
    state.phase === 'running'            ? 'Running'            :
    state.phase === 'stopped_at_gate'    ? 'Stopped at gate'    :
    state.phase === 'waiting_for_signal' ? 'Waiting for signal' :
    state.phase === 'gate_opening'       ? 'Gate opening'       :
    state.phase === 'done'               ? 'Vehicle passed'     :
    'Idle';

  return (
    <div className="flex flex-col h-full bg-[#0f1117]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/8 shrink-0">
        <p className="text-xs font-mono font-bold text-white/60 uppercase tracking-widest">
          Simulation Controls
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">

        {/* ── Plate ──────────────────────────────────────────────────────── */}
        <PlateInput value={config.plate} onChange={p => set('plate', p)} disabled={queueActive} />

        <Divider />

        {/* ── Direction ──────────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Direction</SectionLabel>
          <ToggleGroup<Direction>
            options={[
              { value: 'incoming', label: 'Incoming' },
              { value: 'away',     label: 'Away'     },
            ]}
            value={config.direction}
            onChange={v => set('direction', v)}
          />
        </div>

        <Divider />

        {/* ── Detector Placement ─────────────────────────────────────────── */}
        <div>
          <SectionLabel>Detector Placement</SectionLabel>
          <div className="grid grid-cols-3 gap-1 text-center">
            {(
              (getPlacementsForDirection(config.direction) as DetectorPlacement[]).map(val => {
                const isFront = val.endsWith('_front');
                const side    = val.split('_')[0].toUpperCase().slice(0, 3);
                const face    = isFront ? 'FRONT' : 'BACK';
                const lbl     = `${side}\n${face}`;
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
              })
            )}
          </div>
          <p className="mt-1.5 text-[10px] text-white/30 font-mono leading-snug">
            {config.direction === 'incoming'
              ? 'Front face visible — front plate'
              : 'Rear face visible — rear plate'}
          </p>
        </div>

        <Divider />

        {/* ── Gate Settings ─────────────────────────────────────────────── */}
        <CollapsibleSection title="Gate Settings" defaultOpen>
          <GateSection
            config={config}
            onConfigChange={onConfigChange}
            simulation={simulation}
          />
        </CollapsibleSection>

        <Divider />

        {/* ── Visual Settings (vehicle color + speed) ─────────────────────── */}
        <CollapsibleSection title="Visual Settings" defaultOpen>
          <div className="flex flex-col gap-4">
            <div>
              <SectionLabel>Vehicle Color</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(COLOR_MAP) as VehicleColor[]).map(color => (
                  <button key={color} title={color} onClick={() => set('vehicleColor', color)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                      config.vehicleColor === color
                        ? 'border-white/80 scale-110'
                        : 'border-white/20 hover:border-white/50'}`}
                    style={{ backgroundColor: COLOR_MAP[color] }}
                  />
                ))}
              </div>
              {config.vehicleColor !== 'blue' && (
                <p className="mt-1.5 text-[10px] text-white/25 font-mono leading-snug">
                  No dedicated asset yet — rendering as blue until one is added.
                </p>
              )}
            </div>

            <SpeedPhasesSection config={config} set={set} />
          </div>
        </CollapsibleSection>

        <Divider />

        {/* ── Playback ───────────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Playback</SectionLabel>
          <div className="mb-3 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full transition-colors ${
              isRunning      ? 'bg-emerald-400 animate-pulse' :
              isAtGate       ? 'bg-yellow-400' :
              isGateOpening  ? 'bg-cyan-400 animate-pulse' :
              state.phase === 'done' ? 'bg-blue-400' : 'bg-white/20'}`} />
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
              {phaseLabel}
            </span>
            <span className="ml-auto text-[10px] font-mono text-white/25">
              t={state.vehicleT.toFixed(3)}
            </span>
          </div>
          {queueActive ? (
            <p className="py-2 text-center text-[10px] font-mono text-cyan-400/70 border border-cyan-500/20 rounded-md bg-cyan-500/5">
              Controlled by Plate Queue
            </p>
          ) : (
            <div className="flex gap-2">
              {!isRunning && !isGateOpening ? (
                <button onClick={start}
                  className="flex-1 py-2 rounded-md text-sm font-mono font-bold
                    bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/60 transition-colors">
                  {state.phase === 'done' || isAtGate ? 'Restart' : 'Start'}
                </button>
              ) : (
                <button onClick={stop}
                  className="flex-1 py-2 rounded-md text-sm font-mono font-bold
                    bg-red-600/80 hover:bg-red-600 text-white border border-red-500/60 transition-colors">
                  Stop
                </button>
              )}
              <button
                onClick={state.isPaused ? resume : pause}
                disabled={!state.isPaused && (state.phase === 'idle' || state.phase === 'done')}
                className="px-3 py-2 rounded-md text-sm font-mono font-semibold
                  bg-white/5 hover:bg-white/10 text-white/60 hover:text-white
                  border border-white/12 transition-colors
                  disabled:opacity-30 disabled:cursor-not-allowed">
                {state.isPaused ? '⏵ Resume' : '⏸ Pause'}
              </button>
              <button onClick={reset}
                className="px-3 py-2 rounded-md text-sm font-mono
                  bg-white/5 hover:bg-white/10 text-white/60 hover:text-white
                  border border-white/12 transition-colors">
                Reset
              </button>
            </div>
          )}
        </div>

        <Divider />

        {/* ── Plate Queue ───────────────────────────────────────────────── */}
        <CollapsibleSection
          title="Plate Queue"
          badge={queueActive ? plateQueue.queueStatus.toUpperCase() : undefined}
          defaultOpen={false}
        >
          <PlateQueuePanel {...plateQueue} />
        </CollapsibleSection>

        <Divider />

        {/* ── Plate Lists ───────────────────────────────────────────────── */}
        <CollapsibleSection
          title="Plate Lists"
          badge={plateLists.lists.length > 0 ? String(plateLists.lists.length) : undefined}
          defaultOpen={false}
        >
          <PlateListsPanel {...plateLists} />
        </CollapsibleSection>

        <Divider />

        {/* ── Scheduler ─────────────────────────────────────────────────── */}
        <CollapsibleSection
          title="Scheduler"
          badge={scheduler.schedules.filter(s => s.status === 'enabled').length > 0
            ? `${scheduler.schedules.filter(s => s.status === 'enabled').length} active`
            : undefined}
          defaultOpen={false}
        >
          <SchedulerPanel scheduler={scheduler} lists={plateLists.lists} queueActive={queueActive} />
        </CollapsibleSection>

        <Divider />

        {/* ── Execution History ────────────────────────────────────────── */}
        <CollapsibleSection
          title="Execution History"
          badge={executionHistory.records.length > 0 ? String(executionHistory.records.length) : undefined}
          defaultOpen={false}
        >
          <ExecutionHistoryPanel history={executionHistory} />
        </CollapsibleSection>

        <Divider />

        {/* ── Local API ─────────────────────────────────────────────────── */}
        <CollapsibleSection
          title="Local API"
          badge={apiCommandListener.enabled ? apiCommandListener.connectionStatus.toUpperCase() : undefined}
          defaultOpen={false}
        >
          <LocalApiPanel listener={apiCommandListener} />
        </CollapsibleSection>

        <Divider />

        {/* ── Calibration Mode ───────────────────────────────────────────── */}
        {/* ── Visual QA ──────────────────────────────────────────────────── */}
        <CollapsibleSection
          title="Visual QA"
          badge={(showAnchorOverlay || showMotionPathOverlay) ? 'ON' : undefined}
          defaultOpen={false}
        >
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-[10px] text-white/35 uppercase tracking-widest mb-1.5">Quick plates</p>
              <div className="flex flex-col gap-1">
                {[
                  { label: 'ABC123',        plate: 'ABC123'        },
                  { label: 'ABCDEFGHIJ12',  plate: 'ABCDEFGHIJ12'  },
                  { label: '123456789012',  plate: '123456789012'  },
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

        <Divider />

        {/* ── View modes ─────────────────────────────────────────────────── */}
        <div>
          <SectionLabel>View Modes</SectionLabel>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onShowDebugChange(!showDebug)}
                className={`
                  flex-1 py-1.5 rounded text-xs font-mono font-semibold
                  border transition-all
                  ${showDebug
                    ? 'bg-purple-600/25 border-purple-500/45 text-purple-300'
                    : 'bg-white/5 border-white/12 text-white/45 hover:text-white/70'}
                `}
              >
                {showDebug ? 'Debug: ON' : 'Debug: OFF'}
              </button>
            </div>
            <button
              onClick={onEnterFullscreen}
              className="py-1.5 rounded text-xs font-mono font-semibold
                bg-white/5 border border-white/12 text-white/50
                hover:text-white/80 hover:border-white/25 transition-all"
            >
              ⛶  Fullscreen Scene
            </button>
            <button
              onClick={onEnterCamera}
              className="py-1.5 rounded text-xs font-mono font-semibold
                bg-white/5 border border-white/12 text-white/50
                hover:text-white/80 hover:border-white/25 transition-all"
            >
              ◉  Camera Mode
            </button>
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/8 shrink-0">
        <p className="text-[10px] font-mono text-white/20 leading-snug">
          v0.9.0 — Gate Behavior + POV Motion
        </p>
      </div>
    </div>
  );
}
