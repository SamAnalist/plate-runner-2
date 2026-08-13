import { getPlacementsForDirection } from '@plate-runner/shared';
import type { Direction, DetectorPlacement, VehicleColor, GateMode, GateInitialState } from '@plate-runner/shared';
import type { SimulatorDefaultsControls } from '../../features/simulatorDefaults/useSimulatorDefaults';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { ToggleGroup } from '../ui/ToggleGroup';
import { Button } from '../ui/Button';
import { DirectionArrow } from '../ui/DirectionArrow';

const COLOR_MAP: Record<VehicleColor, string> = {
  blue: '#2563eb',
  red: '#dc2626',
  gray: '#6b7280',
};

const SPEED_PRESET_OPTIONS: { value: 'slow' | 'regular' | 'fast'; label: string }[] = [
  { value: 'slow', label: 'Slow' },
  { value: 'regular', label: 'Regular' },
  { value: 'fast', label: 'Fast' },
];

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-white/35 uppercase tracking-[0.16em] mb-2">
      {children}
    </p>
  );
}

function DurationField({
  label, valueMs, onChange, min = 0, max = 10000, step = 100,
}: {
  label: string; valueMs: number; onChange: (ms: number) => void; min?: number; max?: number; step?: number;
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

/**
 * Editable "what a fresh run starts with" — separate from the live
 * SimulationConfig in Local/Display Mode, which always resets to these
 * values on reload. Grouped the same way as Local Mode's Visual Settings
 * so the mental model carries over.
 */
export function SimulatorDefaultsPanel({ controls }: { controls: SimulatorDefaultsControls }) {
  const { settings, updateSettings, resetSettings } = controls;

  function setDirection(direction: Direction) {
    updateSettings({ direction });
  }

  return (
    <div className="flex flex-col gap-3">
      <CollapsibleSection title="Direction & Placement" defaultOpen chevronClassName="text-lg">
        <div className="flex gap-6 items-start">
          <div className="w-44 shrink-0">
            <GroupLabel>Direction</GroupLabel>
            <ToggleGroup<Direction>
              options={[
                { value: 'incoming', label: 'Incoming', icon: <DirectionArrow direction="down" /> },
                { value: 'away', label: 'Away', icon: <DirectionArrow direction="up" /> },
              ]}
              value={settings.direction}
              onChange={setDirection}
              fullWidth
            />
          </div>

          <div className="flex-1 min-w-0">
            <GroupLabel>Detector Placement</GroupLabel>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              {(getPlacementsForDirection(settings.direction) as DetectorPlacement[]).map(val => {
                const isFront = val.endsWith('_front');
                const side = val.split('_')[0].toUpperCase();
                const face = isFront ? 'FRONT' : 'BACK';
                return (
                  <button
                    key={val}
                    onClick={() => updateSettings({ detectorPlacement: val })}
                    className={`
                      py-2 rounded text-[10px] font-mono font-semibold leading-snug
                      border transition-all whitespace-pre-line
                      ${settings.detectorPlacement === val
                        ? 'bg-blue-600/80 border-blue-500/70 text-white'
                        : 'bg-white/5 border-white/12 text-white/45 hover:text-white/75 hover:border-white/25'}
                    `}
                  >
                    {`${side}\n${face}`}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Speed" defaultOpen chevronClassName="text-lg">
        <ToggleGroup value={settings.speedPreset === 'advanced' ? 'regular' : settings.speedPreset}
          options={SPEED_PRESET_OPTIONS}
          onChange={v => updateSettings({ speedPreset: v })}
          fullWidth
        />
        <p className="mt-1.5 text-[9px] text-white/25 font-mono leading-snug">
          Sets all speed phases uniformly on load. Fine per-phase tuning is done in Local Mode.
        </p>
      </CollapsibleSection>

      <CollapsibleSection title="Vehicle Color" defaultOpen chevronClassName="text-lg">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(COLOR_MAP) as VehicleColor[]).map(color => (
            <button key={color} title={color} onClick={() => updateSettings({ vehicleColor: color })}
              className={`w-7 h-7 rounded-full border-2 transition-all ${
                settings.vehicleColor === color
                  ? 'border-white/80 scale-110'
                  : 'border-white/20 hover:border-white/50'}`}
              style={{ backgroundColor: COLOR_MAP[color] }}
            />
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Gate Settings" chevronClassName="text-lg">
        <div className="flex flex-col gap-3">
          <div>
            <GroupLabel>Mode</GroupLabel>
            <ToggleGroup<GateMode>
              options={[
                { value: 'hidden', label: 'Hidden' },
                { value: 'auto_open', label: 'Auto Open' },
                { value: 'wait_for_signal', label: 'Wait Signal' },
              ]}
              value={settings.gateMode}
              onChange={v => updateSettings({ gateMode: v })}
              fullWidth
            />
          </div>

          {settings.gateMode !== 'hidden' && (
            <>
              <div>
                <GroupLabel>Initial State</GroupLabel>
                <ToggleGroup<GateInitialState>
                  options={[
                    { value: 'closed', label: 'Closed' },
                    { value: 'open', label: 'Open' },
                  ]}
                  value={settings.gateInitialState}
                  onChange={v => updateSettings({ gateInitialState: v })}
                  fullWidth
                />
              </div>

              {settings.gateInitialState === 'closed' && settings.gateMode === 'auto_open' && (
                <div className="flex flex-col gap-2">
                  <DurationField
                    label="Stop before opening"
                    valueMs={settings.stopBeforeOpenMs}
                    onChange={v => updateSettings({ stopBeforeOpenMs: v })}
                    min={200} max={8000} step={200}
                  />
                  <DurationField
                    label="Delay after arm rises"
                    valueMs={settings.delayAfterOpenMs}
                    onChange={v => updateSettings({ delayAfterOpenMs: v })}
                    min={0} max={3000} step={100}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </CollapsibleSection>

      <div className="flex items-center justify-between pt-1">
        <p className="text-[9px] text-white/25 font-mono leading-snug max-w-[70%]">
          Applies the next time the simulator starts — doesn't change a run already in progress.
        </p>
        <Button tone="neutral" onClick={resetSettings}>Restore Factory Defaults</Button>
      </div>
    </div>
  );
}
