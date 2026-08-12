import { useMemo, useState } from 'react';
import type { PlateQueueItemStatus, PlateQueueMode } from '@plate-runner/shared';
import type { PlateQueueControls } from '../../features/queue/usePlateQueue';
import { parsePlateQueueInput } from '../../features/queue/plateQueueParser';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import { Badge, type BadgeTone } from '../ui/Badge';
import { FieldError } from '../ui/FieldError';

const STATUS_TONE: Record<PlateQueueItemStatus, BadgeTone> = {
  pending: 'neutral',
  running: 'success',
  waiting_for_signal: 'warning',
  completed: 'info',
  skipped: 'neutral',
  failed: 'danger',
};

function StatusBadge({ status }: { status: PlateQueueItemStatus }) {
  return (
    <Badge
      tone={STATUS_TONE[status]}
      pulse={status === 'running' || status === 'waiting_for_signal'}
      className={`shrink-0 ${status === 'skipped' ? 'line-through' : ''}`}
    >
      {status}
    </Badge>
  );
}

// ─── Panel ───────────────────────────────────────────────────────────────

/** hideInput: used by the "From List" queue source mode — the raw textarea/Apply Queue input is replaced by a saved-list picker upstream, but Queue Settings/Status/Playback Controls/Queue Items still apply to whatever got loaded. */
export function PlateQueuePanel(props: PlateQueueControls & { hideInput?: boolean }) {
  const {
    items, currentIndex, queueStatus, queueConfig, progress, loadError,
    loadQueue, setQueueConfig,
    runQueue, pauseQueue, resumeQueue, stopQueue, skipCurrent, nextVehicle, clearQueue, resetQueue,
    hideInput,
  } = props;

  const [raw, setRaw] = useState('');
  const preview = useMemo(() => parsePlateQueueInput(raw), [raw]);

  const hasQueue      = items.length > 0;
  const isRunning      = queueStatus === 'running';
  const isWaitingSignal = queueStatus === 'waiting_for_signal';
  const isWaitingNext   = queueStatus === 'waiting_for_next';
  const isPaused        = queueStatus === 'paused';

  const canRun     = hasQueue && ['idle', 'stopped', 'completed'].includes(queueStatus);
  const canPause   = isRunning || isWaitingSignal;
  const canResume  = isPaused;
  const canStop    = isRunning || isWaitingSignal || isWaitingNext || isPaused;
  const canSkip    = isRunning || isWaitingSignal || isWaitingNext || isPaused;
  const canNext    = isWaitingNext;
  const canClear   = hasQueue && !isRunning && !isWaitingSignal;
  const canReset   = hasQueue && !isRunning && !isWaitingSignal;

  return (
    <div className="flex flex-col gap-4">

      {/* ── Input ─────────────────────────────────────────────────────── */}
      {!hideInput && (
        <div>
          <Label>Input</Label>
          <textarea
            value={raw}
            onChange={e => setRaw(e.target.value)}
            placeholder={'ABC123\nXYZ999\nTEST01, 123456789012'}
            rows={5}
            spellCheck={false}
            className="w-full px-2.5 py-2 rounded-md bg-white/5 border border-white/15
              font-mono text-[11px] text-white/80 tracking-wide outline-none resize-y
              placeholder:text-white/20 focus:border-blue-500/50"
          />
          <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono">
            <span className="text-white/35">
              total <span className="text-white/60">{preview.total}</span>
              {' · '}
              valid <span className="text-emerald-400">{preview.valid.length}</span>
              {' · '}
              invalid <span className="text-red-400">{preview.invalid.length}</span>
            </span>
            <Button tone="primary" onClick={() => loadQueue(raw)} disabled={preview.total === 0}>
              Apply Queue
            </Button>
          </div>
          {loadError && (
            <div className="mt-1"><FieldError>{loadError}</FieldError></div>
          )}
          {preview.invalid.length > 0 && (
            <div className="mt-1.5 max-h-16 overflow-y-auto rounded-md border border-red-500/20 bg-red-500/5 px-2 py-1">
              {preview.invalid.slice(0, 20).map((inv, i) => (
                <p key={i} className="text-[9px] font-mono text-red-400/80 leading-snug truncate">
                  "{inv.raw}" — {inv.reason}
                </p>
              ))}
              {preview.invalid.length > 20 && (
                <p className="text-[9px] font-mono text-red-400/60">
                  +{preview.invalid.length - 20} more…
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Queue Settings ────────────────────────────────────────────── */}
      <div>
        <Label>Queue Settings</Label>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-white/50">Mode</span>
            <div className="flex gap-1">
              {(['run_all', 'manual_next'] as PlateQueueMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setQueueConfig({ ...queueConfig, mode: m })}
                  className={`px-2.5 py-1.5 rounded text-xs font-mono font-semibold border transition-all ${
                    queueConfig.mode === m
                      ? 'bg-blue-600/80 border-blue-500/70 text-white'
                      : 'bg-white/5 border-white/12 text-white/50 hover:text-white/80'}`}
                >
                  {m === 'run_all' ? 'Run All' : 'Manual Next'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-white/40 font-mono">Gap between vehicles</span>
              <span className="text-[10px] font-mono text-blue-400 font-bold">{queueConfig.gapBetweenVehiclesMs}ms</span>
            </div>
            <input
              type="range" min={0} max={10000} step={100}
              value={queueConfig.gapBetweenVehiclesMs}
              onChange={e => setQueueConfig({ ...queueConfig, gapBetweenVehiclesMs: Number(e.target.value) })}
              className="w-full accent-blue-500 h-1 rounded cursor-pointer"
            />
          </div>

          <Button
            variant="ghost"
            tone={queueConfig.loop ? 'primary' : 'neutral'}
            className="w-full"
            onClick={() => setQueueConfig({ ...queueConfig, loop: !queueConfig.loop })}
          >
            {queueConfig.loop ? '↻ Loop: ON' : '↻ Loop: OFF'}
          </Button>
        </div>
      </div>

      {/* ── Status ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 text-[10px] font-mono">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            isRunning ? 'bg-emerald-400 animate-pulse' :
            isWaitingSignal ? 'bg-yellow-400 animate-pulse' :
            isWaitingNext ? 'bg-cyan-400' :
            isPaused ? 'bg-orange-400' :
            queueStatus === 'completed' ? 'bg-blue-400' : 'bg-white/20'}`}
          />
          <span className="text-white/50 uppercase tracking-wider">{queueStatus}</span>
          <span className="ml-auto text-white/30">
            {hasQueue ? `${progress.currentIndex + 1} / ${progress.total}` : '—'}
          </span>
        </div>
        <div className="flex justify-between text-white/30">
          <span>Current: <span className="text-white/60">{items[currentIndex]?.plate ?? '—'}</span></span>
          <span>Done: <span className="text-white/60">{progress.completed}</span> · Left: <span className="text-white/60">{progress.remaining}</span></span>
        </div>
      </div>

      {/* ── Playback Controls ────────────────────────────────────────── */}
      <div>
        <Label>Playback Controls</Label>
        <div className="grid grid-cols-2 gap-1.5">
          <Button tone="primary" onClick={runQueue} disabled={!canRun}>▶ Run Queue</Button>
          {canPause ? (
            <Button tone="warn" onClick={pauseQueue} disabled={!canPause}>⏸ Pause Vehicle</Button>
          ) : (
            <Button tone="warn" onClick={resumeQueue} disabled={!canResume}>⏵ Resume Vehicle</Button>
          )}
          <Button tone="danger" onClick={stopQueue} disabled={!canStop}>■ Stop Queue</Button>
          <Button onClick={skipCurrent} disabled={!canSkip}>⏭ Skip Current</Button>
          <Button onClick={nextVehicle} disabled={!canNext}>⏩ Next Vehicle</Button>
          <Button onClick={resetQueue} disabled={!canReset}>↺ Reset Status</Button>
          <Button tone="danger" onClick={clearQueue} disabled={!canClear}>✕ Clear Queue</Button>
        </div>
        <p className="mt-1.5 text-[9px] text-white/25 font-mono leading-snug">
          Pause freezes the current vehicle in place — motion, gate arm, and timers all stop until Resume.
        </p>
      </div>

      {/* ── Queue Items ───────────────────────────────────────────────── */}
      {hasQueue && (
        <div>
          <Label>Queue Items ({items.length})</Label>
          <div className="max-h-48 overflow-y-auto flex flex-col gap-1 pr-1">
            {items.map((item, i) => (
              <div
                key={item.id}
                className={`flex items-center gap-2 px-2 py-1 rounded-md text-[10px] font-mono
                  ${i === currentIndex ? 'bg-white/8 border border-white/15' : 'bg-white/3'}`}
              >
                <span className="text-white/25 w-6 shrink-0 text-right">{i + 1}.</span>
                <span className="text-white/70 tracking-wider truncate flex-1">{item.plate}</span>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
