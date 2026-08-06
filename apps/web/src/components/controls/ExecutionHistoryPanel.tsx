import type { ExecutionStatus, VehicleColor, ScheduledExecutionRecord } from '@plate-runner/shared';
import type { ExecutionHistoryControls } from '../../features/history/useExecutionHistory';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import { Badge, type BadgeTone } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { FieldError } from '../ui/FieldError';
import { downloadJSON } from '../../lib/downloadJSON';

const STATUS_TONE: Record<ExecutionStatus, BadgeTone> = {
  started: 'success',
  completed: 'info',
  stopped: 'warning',
  failed: 'danger',
  skipped: 'neutral',
};

const VEHICLE_COLOR_HEX: Record<VehicleColor, string> = {
  blue: '#2563eb',
  red: '#dc2626',
  gray: '#6b7280',
};

const TRIGGERED_BY_LABEL: Record<ScheduledExecutionRecord['triggeredBy'], string> = {
  manual_list_run: 'manual',
  schedule: 'schedule',
  api_command: 'api',
  import_test: 'import test',
  unknown: 'unknown',
};

function RecordRow({ record }: { record: ScheduledExecutionRecord }) {
  return (
    <div className="flex flex-col gap-1 p-2 rounded-md border border-white/12 bg-white/3 text-[10px] font-mono">
      <div className="flex items-center justify-between gap-2">
        <span className="text-white/70 truncate">{record.plateListName}</span>
        <Badge tone={STATUS_TONE[record.status]} pulse={record.status === 'started'} className="shrink-0">
          {record.status}
        </Badge>
      </div>
      <div className="flex items-center gap-2 text-white/30">
        <span
          className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
          style={{ backgroundColor: VEHICLE_COLOR_HEX[record.vehicleColor] }}
          title={record.vehicleColor}
        />
        <span>{record.direction} · {record.detectorPlacement}</span>
        <Badge tone="neutral" className="ml-auto">{TRIGGERED_BY_LABEL[record.triggeredBy]}</Badge>
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

  function handleResetStorage() {
    if (window.confirm('Reset execution history storage? All saved history will be permanently deleted.')) {
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
        <div className="p-2 rounded-md border border-red-500/30 bg-red-500/10">
          <FieldError>{storageError}</FieldError>
          <div className="mt-1.5">
            <Button tone="danger" onClick={handleResetStorage}>Reset Storage</Button>
          </div>
        </div>
      )}

      <div className="flex gap-1.5">
        <Button tone="danger" onClick={handleClear} disabled={records.length === 0}>Clear History</Button>
        <Button onClick={handleExport} disabled={records.length === 0}>Export History</Button>
      </div>

      <div>
        <Label>Records ({records.length})</Label>
        {sorted.length === 0 ? (
          <EmptyState message="No executions recorded yet." hint="Records appear here after you run a Plate List, manually or via the Scheduler." />
        ) : (
          <div className="flex flex-col gap-1.5 max-h-96 overflow-y-auto pr-1">
            {sorted.map(record => <RecordRow key={record.id} record={record} />)}
          </div>
        )}
      </div>
    </div>
  );
}
