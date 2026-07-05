import { useState } from 'react';
import type {
  SimulationConfig,
  FocusZoneConfig,
  Direction,
  DetectorPlacement,
  GateMode,
  VehicleColor,
} from '@plate-runner/shared';
import type { SimulationControls } from '../../hooks/useSimulation';
import { READING_T_INCOMING, READING_T_AWAY } from '../../hooks/useSimulation';
import { PlateInput } from './PlateInput';
import { FocusZoneControls } from './FocusZoneControls';
import type { VisualStyle } from '../simulation/renderers/types';
import { VISUAL_STYLE_LABELS } from '../simulation/renderers/types';

interface ControlPanelProps {
  config: SimulationConfig;
  simulation: SimulationControls;
  focusZone: FocusZoneConfig;
  onConfigChange: (c: SimulationConfig) => void;
  onFocusZoneChange: (fz: FocusZoneConfig) => void;
  showDebug: boolean;
  onShowDebugChange: (v: boolean) => void;
  calibrationMode: boolean;
  onCalibrationModeChange: (v: boolean) => void;
  onEnterFullscreen: () => void;
  onEnterCamera: () => void;
  visualStyle: VisualStyle;
  onVisualStyleChange: (s: VisualStyle) => void;
  showAnchorOverlay: boolean;
  onShowAnchorOverlayChange: (v: boolean) => void;
  showMotionPathOverlay: boolean;
  onShowMotionPathOverlayChange: (v: boolean) => void;
  /** One-click: switch to asset-realistic + calibration freeze */
  onEnterVisualQA: () => void;
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
  blue:   '#2563eb',
  white:  '#e8e8e8',
  black:  '#1c1c2e',
  silver: '#8d96a3',
  red:    '#dc2626',
  green:  '#16a34a',
};

// ─── Speed slider ──────────────────────────────────────────────────────────

function SpeedSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <SectionLabel>Speed</SectionLabel>
        <span className="text-xs font-mono text-blue-400 font-bold">{value}/10</span>
      </div>
      <input
        type="range" min={1} max={10} step={1} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-blue-500 h-1.5 rounded cursor-pointer"
      />
    </div>
  );
}

// ─── Calibration panel ─────────────────────────────────────────────────────

function CalibrationPanel({
  config,
  simulation,
  onConfigChange,
}: {
  config: SimulationConfig;
  simulation: SimulationControls;
  onConfigChange: (c: SimulationConfig) => void;
}) {
  const readingT = config.direction === 'incoming' ? READING_T_INCOMING : READING_T_AWAY;

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[10px] text-white/40 font-mono leading-snug">
        Vehicle is frozen at reading position (t≈{readingT.toFixed(2)}).
        Test different plates to verify legibility.
      </p>

      <div>
        <p className="text-[10px] text-white/35 uppercase tracking-widest mb-1.5">Quick plates</p>
        <div className="flex flex-col gap-1.5">
          {[
            { label: 'Short (ABC123)',       plate: 'ABC123'      },
            { label: 'Medium (ABC 1234)',     plate: 'ABC1234'     },
            { label: '12-char (ABCDEFGHIJ12)', plate: 'ABCDEFGHIJ12' },
            { label: 'Single char (A)',       plate: 'A'           },
          ].map(({ label, plate }) => (
            <button
              key={plate}
              onClick={() => onConfigChange({ ...config, plate })}
              className={`
                px-2.5 py-1.5 rounded text-[10px] font-mono font-semibold
                border transition-all text-left
                ${config.plate === plate
                  ? 'bg-cyan-600/25 border-cyan-500/50 text-cyan-300'
                  : 'bg-white/4 border-white/10 text-white/45 hover:text-white/70 hover:border-white/22'}
              `}
            >
              <span className="text-white/30 mr-1.5">▶</span>{label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => simulation.holdAt(readingT)}
        className="py-1.5 rounded text-[10px] font-mono font-semibold
          border border-cyan-500/40 text-cyan-400
          hover:bg-cyan-500/15 transition-colors"
      >
        Re-center at reading position
      </button>
    </div>
  );
}

// ─── Main panel ────────────────────────────────────────────────────────────

export function ControlPanel({
  config,
  simulation,
  focusZone,
  onConfigChange,
  onFocusZoneChange,
  showDebug,
  onShowDebugChange,
  calibrationMode,
  onCalibrationModeChange,
  onEnterFullscreen,
  onEnterCamera,
  visualStyle,
  onVisualStyleChange,
  showAnchorOverlay,
  onShowAnchorOverlayChange,
  showMotionPathOverlay,
  onShowMotionPathOverlayChange,
  onEnterVisualQA,
}: ControlPanelProps) {
  const { state, start, stop, reset, openGate, closeGate } = simulation;

  function set<K extends keyof SimulationConfig>(key: K, value: SimulationConfig[K]) {
    onConfigChange({ ...config, [key]: value });
  }

  const isRunning = state.isRunning;
  const isAtGate  = state.phase === 'at_gate';

  return (
    <div className="flex flex-col h-full bg-[#0f1117]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/8 shrink-0">
        <p className="text-xs font-mono font-bold text-white/60 uppercase tracking-widest">
          Simulation Controls
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">

        {/* ── Visual Style ───────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Visual Style</SectionLabel>
          <div className="flex flex-col gap-1">
            {(Object.entries(VISUAL_STYLE_LABELS) as [VisualStyle, string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => onVisualStyleChange(val)}
                className={`
                  px-3 py-2 rounded text-xs font-mono font-semibold text-left
                  border transition-all
                  ${visualStyle === val
                    ? 'bg-blue-600/80 border-blue-500/70 text-white'
                    : 'bg-white/5 border-white/12 text-white/50 hover:text-white/80 hover:border-white/25'}
                `}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <Divider />

        {/* ── Plate ──────────────────────────────────────────────────────── */}
        <PlateInput value={config.plate} onChange={p => set('plate', p)} />

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
              [
                ['driver_front',    'DRV\nFRONT'],
                ['center_front',    'CTR\nFRONT'],
                ['passenger_front', 'PSG\nFRONT'],
                ['driver_back',     'DRV\nBACK' ],
                ['center_back',     'CTR\nBACK' ],
                ['passenger_back',  'PSG\nBACK' ],
              ] as [DetectorPlacement, string][]
            ).map(([val, lbl]) => (
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
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-white/30 font-mono leading-snug">
            {config.detectorPlacement.endsWith('_front')
              ? 'Front face visible — front plate'
              : 'Rear face visible — rear plate'}
          </p>
        </div>

        <Divider />

        {/* ── Gate Mode ──────────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Gate Mode</SectionLabel>
          <ToggleGroup<GateMode>
            options={[
              { value: 'auto_open',       label: 'Auto Open'    },
              { value: 'wait_for_signal', label: 'Wait Signal'  },
              { value: 'hidden',          label: 'Hidden'       },
            ]}
            value={config.gateMode}
            onChange={v => set('gateMode', v)}
          />
          <p className="mt-1.5 text-[10px] text-white/25 font-mono leading-snug">
            {config.gateMode === 'wait_for_signal'
              ? 'Vehicle stops at gate and waits for Open Gate signal'
              : config.gateMode === 'auto_open'
              ? 'Gate opens automatically as vehicle approaches'
              : 'Gate is hidden'}
          </p>
        </div>

        <Divider />

        {/* ── Gate manual override ───────────────────────────────────────── */}
        {config.gateMode !== 'hidden' && (
          <>
            <div>
              <SectionLabel>Gate Override</SectionLabel>
              <div className="flex gap-2">
                <button onClick={openGate}  disabled={state.gateOpen}
                  className="flex-1 py-1.5 rounded text-xs font-mono font-semibold
                    border border-emerald-500/40 text-emerald-400
                    disabled:opacity-30 disabled:cursor-not-allowed
                    hover:bg-emerald-500/15 transition-colors">
                  Open Gate
                </button>
                <button onClick={closeGate} disabled={!state.gateOpen}
                  className="flex-1 py-1.5 rounded text-xs font-mono font-semibold
                    border border-red-500/40 text-red-400
                    disabled:opacity-30 disabled:cursor-not-allowed
                    hover:bg-red-500/15 transition-colors">
                  Close Gate
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full transition-colors ${
                  state.gateOpen ? 'bg-emerald-400' : 'bg-red-500'}`} />
                <span className="text-[10px] font-mono text-white/40">
                  Gate is {state.gateOpen ? 'OPEN' : 'CLOSED'}
                </span>
              </div>
            </div>
            <Divider />
          </>
        )}

        {/* ── Vehicle Color ──────────────────────────────────────────────── */}
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
        </div>

        <Divider />

        {/* ── Speed ───────────────────────────────��──────────────────────── */}
        <SpeedSlider value={config.speed} onChange={v => set('speed', v)} />

        <Divider />

        {/* ── Playback ───────────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Playback</SectionLabel>
          <div className="mb-3 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full transition-colors ${
              isRunning     ? 'bg-emerald-400 animate-pulse' :
              isAtGate      ? 'bg-yellow-400' :
              state.phase === 'done' ? 'bg-blue-400' : 'bg-white/20'}`} />
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
              {isRunning     ? 'Running' :
               isAtGate      ? 'Waiting for signal' :
               state.phase === 'done' ? 'Vehicle passed' : 'Idle'}
            </span>
            <span className="ml-auto text-[10px] font-mono text-white/25">
              t={state.vehicleT.toFixed(3)}
            </span>
          </div>
          <div className="flex gap-2">
            {!isRunning ? (
              <button onClick={start}
                className="flex-1 py-2 rounded-md text-sm font-mono font-bold
                  bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/60 transition-colors">
                {state.phase === 'done' || state.phase === 'at_gate' ? 'Restart' : 'Start'}
              </button>
            ) : (
              <button onClick={stop}
                className="flex-1 py-2 rounded-md text-sm font-mono font-bold
                  bg-red-600/80 hover:bg-red-600 text-white border border-red-500/60 transition-colors">
                Stop
              </button>
            )}
            <button onClick={reset}
              className="px-3 py-2 rounded-md text-sm font-mono
                bg-white/5 hover:bg-white/10 text-white/60 hover:text-white
                border border-white/12 transition-colors">
              Reset
            </button>
          </div>
          {isAtGate && (
            <p className="mt-2 text-[10px] font-mono text-yellow-400/70 leading-snug">
              Vehicle waiting for signal. Use Gate Override to open, or press Restart.
            </p>
          )}
        </div>

        <Divider />

        {/* ── Focus Zone ─────────────────────────────────────────────────── */}
        <CollapsibleSection title="Camera Focus Zone" badge="CAM" defaultOpen={false}>
          <FocusZoneControls focusZone={focusZone} onChange={onFocusZoneChange} />
        </CollapsibleSection>

        <Divider />

        {/* ── Calibration Mode ───────────────────────────────────────────── */}
        <CollapsibleSection
          title="Calibration Mode"
          badge={calibrationMode ? 'ON' : undefined}
          defaultOpen={calibrationMode}
        >
          <div className="flex flex-col gap-3">
            <button
              onClick={() => onCalibrationModeChange(!calibrationMode)}
              className={`
                w-full py-2 rounded text-xs font-mono font-bold
                border transition-all
                ${calibrationMode
                  ? 'bg-cyan-600/30 border-cyan-500/50 text-cyan-300'
                  : 'bg-white/5 border-white/15 text-white/50 hover:text-white/75 hover:border-white/28'}
              `}
            >
              {calibrationMode ? 'Exit Calibration' : 'Enter Calibration'}
            </button>

            {calibrationMode && (
              <CalibrationPanel
                config={config}
                simulation={simulation}
                onConfigChange={onConfigChange}
              />
            )}
          </div>
        </CollapsibleSection>

        <Divider />

        {/* ── Visual QA ──────────────────────────────────────────────────── */}
        <CollapsibleSection
          title="Visual QA"
          badge={visualStyle === 'asset-realistic' && (showAnchorOverlay || showMotionPathOverlay) ? 'ON' : undefined}
          defaultOpen={false}
        >
          <div className="flex flex-col gap-3">
            {/* One-click QA setup */}
            <button
              onClick={onEnterVisualQA}
              className="w-full py-2 rounded text-xs font-mono font-bold
                bg-green-700/30 border border-green-500/40 text-green-300
                hover:bg-green-600/40 transition-colors"
            >
              ◎ Enter Visual QA Mode
            </button>
            <p className="text-[9px] text-white/30 font-mono leading-snug -mt-1">
              Switches to Asset Realistic + freezes at reading pos + shows anchor bounds
            </p>

            {/* Quick plate buttons */}
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

            {/* Overlays */}
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

            {/* Screenshot instruction */}
            <div className="mt-1 border border-white/8 rounded p-2">
              <p className="text-[9px] text-white/30 font-mono leading-relaxed">
                <span className="text-white/50">Screenshot:</span> Cmd+Shift+4 (Mac) or
                Win+Shift+S (Windows). Cycle all 6 placements and both directions.
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
          v0.6.0 — Visual QA Mode
        </p>
      </div>
    </div>
  );
}
