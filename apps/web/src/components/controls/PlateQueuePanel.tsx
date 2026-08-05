import { useMemo, useState } from 'react';
import type { PlateQueueItemStatus, PlateQueueMode } from '@plate-runner/shared';
import type { PlateQueueControls } from '../../features/queue/usePlateQueue';
import { parsePlateQueueInput } from '../../features/queue/plateQueueParser';

// ─── Shared bits (mirrors ControlPanel's local primitives) ─────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] text-white/35 uppercase tracking-[0.16em] mb-1.5">{children}</p>
  );
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
  tone?: 'neutral' | 'primary' | 'danger' | 'warn';
}) {
  const toneClasses: Record<string, string> = {
    neutral: 'border-white/12 text-white/55 hover:text-white/85 hover:border-white/25 bg-white/5',
    primary: 'border-blue-500/60 text-blue-300 hover:bg-blue-600/20 bg-blue-600/10',
    danger:  'border-red-500/40 text-red-400 hover:bg-red-500/15 bg-white/5',
    warn:    'border-yellow-400/50 text-yellow-300 hover:bg-yellow-500/15 bg-white/5',
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

const STATUS_BADGE: Record<PlateQueueItemStatus, string> = {
  pending:            'bg-white/8 text-white/40 border-white/12',
  running:            'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse',
  waiting_for_signal: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/40 animate-pulse',
  completed:          'bg-blue-500/15 text-blue-300 border-blue-500/30',
  skipped:            'bg-white/8 text-white/35 border-white/15 line-through',
  failed:             'bg-red-500/15 text-red-400 border-red-500/35',
};

function StatusBadge({ status }: { status: PlateQueueItemStatus }) {
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border shrink-0 ${STATUS_BADGE[status]}`}>
      {status}
    </span>
  );
}

// ─── Panel ───────────────────────────────────────────────────────────────

export function PlateQueuePanel(props: PlateQueueControls) {
  const {
    items, currentIndex, queueStatus, queueConfig, progress, loadError,
    loadQueue, setQueueConfig,
    runQueue, pauseQueue, resumeQueue, stopQueue, skipCurrent, nextVehicle, clearQueue, resetQueue,
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
  const canSkip    = isRunning || isWaitingSignal || isWaitingNext;
  const canNext    = isWaitingNext;
  const canClear   = hasQueue && !isRunning && !isWaitingSignal;
  const canReset   = hasQueue && !isRunning && !isWaitingSignal;

  return (
    <div className="flex flex-col gap-4">

      {/* ── Input ─────────────────────────────────────────────────────── */}
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
          <SmallButton tone="primary" onClick={() => loadQueue(raw)} disabled={preview.total === 0}>
            Apply Queue
          </SmallButton>
        </div>
        {loadError && (
          <p className="mt-1 text-[10px] text-red-400 font-mono leading-snug">{loadError}</p>
        )}
        {preview.invalid.length > 0 && (
          <div className="mt-1.5 max-h-16 overflow-y-auto rounded border border-red-500/20 bg-red-500/5 px-2 py-1">
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
                  className={`px-2 py-1 rounded text-[10px] font-mono font-semibold border transition-all ${
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
              type="range" min={0} max={5000} step={100}
              value={queueConfig.gapBetweenVehiclesMs}
              onChange={e => setQueueConfig({ ...queueConfig, gapBetweenVehiclesMs: Number(e.target.value) })}
              className="w-full accent-blue-500 h-1 rounded cursor-pointer"
            />
          </div>

          <button
            onClick={() => setQueueConfig({ ...queueConfig, loop: !queueConfig.loop })}
            className={`w-full py-1.5 rounded text-xs font-mono font-semibold border transition-all ${
              queueConfig.loop
                ? 'bg-cyan-600/25 border-cyan-500/45 text-cyan-300'
                : 'bg-white/5 border-white/12 text-white/45 hover:text-white/70'}`}
          >
            {queueConfig.loop ? '↻ Loop: ON' : '↻ Loop: OFF'}
          </button>
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
          <SmallButton tone="primary" onClick={runQueue} disabled={!canRun}>▶ Run Queue</SmallButton>
          {canPause ? (
            <SmallButton tone="warn" onClick={pauseQueue} disabled={!canPause}>⏸ Pause</SmallButton>
          ) : (
            <SmallButton tone="warn" onClick={resumeQueue} disabled={!canResume}>⏵ Resume</SmallButton>
          )}
          <SmallButton tone="danger" onClick={stopQueue} disabled={!canStop}>■ Stop Queue</SmallButton>
          <SmallButton onClick={skipCurrent} disabled={!canSkip}>⏭ Skip Current</SmallButton>
          <SmallButton onClick={nextVehicle} disabled={!canNext}>⏩ Next Vehicle</SmallButton>
          <SmallButton onClick={resetQueue} disabled={!canReset}>↺ Reset Status</SmallButton>
          <SmallButton tone="danger" onClick={clearQueue} disabled={!canClear}>✕ Clear Queue</SmallButton>
        </div>
      </div>

      {/* ── Queue Items ───────────────────────────────────────────────── */}
      {hasQueue && (
        <div>
          <Label>Queue Items ({items.length})</Label>
          <div className="max-h-48 overflow-y-auto flex flex-col gap-1 pr-1">
            {items.map((item, i) => (
              <div
                key={item.id}
                className={`flex items-center gap-2 px-2 py-1 rounded text-[10px] font-mono
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
