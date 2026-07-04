import type { SimulationConfig, FocusZoneConfig } from '@plate-runner/shared';
import type { SimulationPhase } from '../../hooks/useSimulation';
import type { PlateReadability } from '../../utils/depth';

interface DebugOverlayProps {
  phase: SimulationPhase;
  vehicleT: number;
  gateOpen: boolean;
  config: SimulationConfig;
  focusZone: FocusZoneConfig;
  plateReadability: PlateReadability;
  calibrationMode: boolean;
}

const PHASE_COLOR: Record<SimulationPhase, string> = {
  idle:    'text-white/40',
  running: 'text-emerald-400',
  at_gate: 'text-yellow-400',
  done:    'text-blue-400',
};

const READABILITY_COLOR: Record<PlateReadability['readability'], string> = {
  good:    'text-emerald-400',
  partial: 'text-yellow-400',
  poor:    'text-red-400',
};

export function DebugOverlay({
  phase,
  vehicleT,
  gateOpen,
  config,
  focusZone,
  plateReadability,
  calibrationMode,
}: DebugOverlayProps) {
  return (
    <div
      className="absolute bottom-2 left-2 z-10 pointer-events-none
        bg-black/70 border border-white/10 rounded px-2.5 py-2
        font-mono text-[9px] leading-relaxed backdrop-blur-sm"
      style={{ maxWidth: 230 }}
    >
      {/* Header */}
      <div className="text-white/30 uppercase tracking-widest text-[8px] mb-1 border-b border-white/10 pb-1">
        DEBUG
        {calibrationMode && (
          <span className="ml-2 text-cyan-400 text-[8px]">• CALIBRATION</span>
        )}
      </div>

      {/* Phase */}
      <Row label="phase" value={phase} valueClass={PHASE_COLOR[phase]} />
      <Row label="t"     value={vehicleT.toFixed(4)} />
      <Row label="dir"   value={config.direction} />
      <Row label="detector" value={config.detectorPlacement} />
      <Row label="gate mode" value={config.gateMode} />
      <Row label="gate"  value={gateOpen ? 'OPEN' : 'CLOSED'}
           valueClass={gateOpen ? 'text-emerald-400' : 'text-red-400'} />

      {/* Divider */}
      <div className="border-t border-white/10 my-1" />

      {/* Focus zone */}
      <Row label="focus zone" value={focusZone.enabled ? 'enabled' : 'disabled'} />
      <Row label="zone"
           value={`(${focusZone.xPercent}%,${focusZone.yPercent}%) ${focusZone.widthPercent}×${focusZone.heightPercent}%`} />

      {/* Plate readability */}
      <div className="border-t border-white/10 my-1" />
      <Row
        label="plate in zone"
        value={plateReadability.inZone ? 'YES' : 'NO'}
        valueClass={plateReadability.inZone ? 'text-emerald-400' : 'text-red-400'}
      />
      <Row
        label="overlap"
        value={`${plateReadability.overlapPercent}%`}
      />
      <Row
        label="readability"
        value={plateReadability.readability.toUpperCase()}
        valueClass={READABILITY_COLOR[plateReadability.readability]}
      />
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
      <span className="text-white/30 shrink-0" style={{ width: 72 }}>{label}:</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
