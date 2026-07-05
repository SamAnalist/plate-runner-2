import type { SimulationConfig } from '@plate-runner/shared';
import type { SimulationPhase } from '../../hooks/useSimulation';

interface DebugOverlayProps {
  phase: SimulationPhase;
  vehicleT: number;
  gateOpen: boolean;
  config: SimulationConfig;
}

const PHASE_COLOR: Record<SimulationPhase, string> = {
  idle:               'text-white/40',
  running:            'text-emerald-400',
  stopped_at_gate:    'text-yellow-400',
  waiting_for_signal: 'text-amber-400',
  gate_opening:       'text-cyan-400',
  done:               'text-blue-400',
};

export function DebugOverlay({
  phase,
  vehicleT,
  gateOpen,
  config,
}: DebugOverlayProps) {
  return (
    <div
      className="absolute bottom-2 left-2 z-10 pointer-events-none
        bg-black/70 border border-white/10 rounded px-2.5 py-2
        font-mono text-[9px] leading-relaxed backdrop-blur-sm"
      style={{ maxWidth: 240 }}
    >
      <div className="text-white/30 uppercase tracking-widest text-[8px] mb-1 border-b border-white/10 pb-1">
        DEBUG
      </div>

      <Row label="phase"    value={phase}                     valueClass={PHASE_COLOR[phase]} />
      <Row label="t"        value={vehicleT.toFixed(4)} />
      <Row label="dir"      value={config.direction} />
      <Row label="detector" value={config.detectorPlacement} />
      <Row label="gate mode"  value={config.gateMode} />
      <Row label="gate init"  value={config.gateInitialState} />
      <Row label="gate"       value={gateOpen ? 'OPEN' : 'CLOSED'}
           valueClass={gateOpen ? 'text-emerald-400' : 'text-red-400'} />

      <div className="border-t border-white/10 my-1" />
      <Row label="stopMs"   value={`${config.stopBeforeOpenMs}ms`} />
      <Row label="delayMs"  value={`${config.delayAfterOpenMs}ms`} />
    </div>
  );
}

function Row({
  label,
  value,
  valueClass = 'text-white/70',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex gap-2">
      <span className="text-white/30 shrink-0" style={{ width: 76 }}>{label}:</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
