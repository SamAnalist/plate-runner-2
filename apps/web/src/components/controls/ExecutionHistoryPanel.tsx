import type { ExecutionStatus, VehicleColor, ScheduledExecutionRecord } from '@plate-runner/shared';
import type { ExecutionHistoryControls } from '../../features/history/useExecutionHistory';

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] text-white/35 uppercase tracking-[0.16em] mb-1.5">{children}</p>;
}

function SmallButton({
  onClick,
  disabled,
  children,
  tone = 'neutral',
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  tone?: 'neutral' | 'primary' | 'danger';
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
      className={`
        px-2.5 py-1.5 rounded text-[10px] font-mono font-semibold
        border transition-all disabled:opacity-25 disabled:cursor-not-allowed
        ${toneClasses[tone]}
      `}
    >
      {children}
    </button>
  );
}

const STATUS_BADGE: Record<ExecutionStatus, string> = {
  started:   'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse',
  completed: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  stopped:   'bg-orange-500/15 text-orange-300 border-orange-500/30',
  failed:    'bg-red-500/15 text-red-400 border-red-500/35',
  skipped:   'bg-white/8 text-white/40 border-white/15',
};

const VEHICLE_COLOR_HEX: Record<VehicleColor, string> = {
  blue: '#2563eb',
  red:  '#dc2626',
  gray: '#6b7280',
};

const TRIGGERED_BY_LABEL: Record<ScheduledExecutionRecord['triggeredBy'], string> = {
  manual_list_run: 'manual',
  schedule: 'schedule',
  api_command: 'api',
  import_test: 'import test',
  unknown: 'unknown',
};

function downloadJSON(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function RecordRow({ record }: { record: ScheduledExecutionRecord }) {
  return (
    <div className="flex flex-col gap-1 p-2 rounded-md border border-white/12 bg-white/3 text-[10px] font-mono">
      <div className="flex items-center justify-between gap-2">
        <span className="text-white/70 truncate">{record.plateListName}</span>
        <span className={`px-1.5 py-0.5 rounded border shrink-0 ${STATUS_BADGE[record.status]}`}>{record.status}</span>
      </div>
      <div className="flex items-center gap-2 text-white/30">
        <span
          className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
          style={{ backgroundColor: VEHICLE_COLOR_HEX[record.vehicleColor] }}
          title={record.vehicleColor}
        />
        <span>{record.direction} · {record.detectorPlacement}</span>
        <span className="ml-auto px-1.5 py-0.5 rounded bg-white/8 text-white/40">{TRIGGERED_BY_LABEL[record.triggeredBy]}</span>
      </div>
      <div className="text-white/25">
        {new Date(record.startedAt).toLocaleString()}
        {' · '}
        {record.completedPlates}/{record.totalPlates} done
        {record.skippedPlates > 0 && ` · ${record.skippedPlates} skipped`}
        {record.failedPlates > 0 && ` · ${record.failedPlates} failed`}
      </div>
      {record.error && <p className="text-red-400/70">{record.error}</p>}
    </div>
  );
}

export function ExecutionHistoryPanel({ history }: { history: ExecutionHistoryControls }) {
  const { records, storageError, clearHistory, exportHistoryToJSON } = history;

  function handleClear() {
    if (window.confirm(`Clear all ${records.length} execution history record(s)? This cannot be undone.`)) {
      clearHistory();
    }
  }

  function handleExport() {
    downloadJSON('plate-runner-execution-history.json', exportHistoryToJSON());
  }

  // Newest first.
  const sorted = records.slice().reverse();

  return (
    <div className="flex flex-col gap-3">
      {storageError && (
        <p className="text-[10px] font-mono text-red-400 leading-snug p-2 rounded border border-red-500/30 bg-red-500/10">
          {storageError}
        </p>
      )}

      <div className="flex gap-1.5">
        <SmallButton tone="danger" onClick={handleClear} disabled={records.length === 0}>Clear History</SmallButton>
        <SmallButton onClick={handleExport} disabled={records.length === 0}>Export History</SmallButton>
      </div>

      <div>
        <Label>Records ({records.length})</Label>
        {sorted.length === 0 ? (
          <p className="text-[10px] font-mono text-white/25">No executions recorded yet.</p>
        ) : (
          <div className="flex flex-col gap-1.5 max-h-96 overflow-y-auto pr-1">
            {sorted.map(record => <RecordRow key={record.id} record={record} />)}
          </div>
        )}
      </div>
    </div>
  );
}
