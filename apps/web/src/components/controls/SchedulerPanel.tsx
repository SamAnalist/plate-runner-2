import { useState } from 'react';
import {
  MIN_INTERVAL_MS,
  MAX_INTERVAL_MS,
  type PlateList,
  type ScheduleRunMode,
  type SchedulePlateOrder,
  type ScheduledPlateListRun,
} from '@plate-runner/shared';
import type { LocalSchedulerControls, ScheduleDraft } from '../../features/scheduler/useLocalScheduler';

// ─── Local primitives (mirrors PlateListsPanel's pattern) ──────────────────

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

function MiniToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2 py-1 rounded text-[10px] font-mono font-semibold border transition-all ${
            value === opt.value
              ? 'bg-blue-600/80 border-blue-500/70 text-white'
              : 'bg-white/5 border-white/12 text-white/50 hover:text-white/80'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

// ─── Form state ──────────────────────────────────────────────────────────

interface ScheduleFormState {
  name: string;
  description: string;
  plateListId: string;
  enabled: boolean;
  runMode: ScheduleRunMode;
  plateOrder: SchedulePlateOrder;
  startAtLocal: string;   // datetime-local input value
  dailyTime: string;      // HH:mm
  intervalValue: number;  // paired with intervalUnit
  intervalUnit: 'seconds' | 'minutes' | 'hours';
  runWindowEnabled: boolean;
  runWindowStart: string; // HH:mm
  runWindowEnd: string;   // HH:mm
  maxRunsEnabled: boolean;
  maxRuns: number;
}

function emptyForm(firstListId: string): ScheduleFormState {
  return {
    name: '',
    description: '',
    plateListId: firstListId,
    enabled: true,
    runMode: 'repeat_interval',
    plateOrder: 'sequential',
    startAtLocal: '',
    dailyTime: '09:00',
    intervalValue: 30,
    intervalUnit: 'seconds',
    runWindowEnabled: false,
    runWindowStart: '09:00',
    runWindowEnd: '17:00',
    maxRunsEnabled: false,
    maxRuns: 5,
  };
}

function isoToLocalInput(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(local: string): string | undefined {
  if (!local) return undefined;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function formFromSchedule(s: ScheduledPlateListRun): ScheduleFormState {
  const intervalMs = s.intervalMs ?? 30_000;
  const [value, unit] = intervalMs % 3_600_000 === 0
    ? [intervalMs / 3_600_000, 'hours' as const]
    : intervalMs % 60_000 === 0
    ? [intervalMs / 60_000, 'minutes' as const]
    : [Math.round(intervalMs / 1000), 'seconds' as const];
  return {
    name: s.name,
    description: s.description ?? '',
    plateListId: s.plateListId,
    enabled: s.status === 'enabled',
    runMode: s.runMode,
    plateOrder: s.plateOrder,
    startAtLocal: isoToLocalInput(s.startAt),
    dailyTime: s.dailyTime ?? '09:00',
    intervalValue: value,
    intervalUnit: unit,
    runWindowEnabled: s.runWindow?.enabled ?? false,
    runWindowStart: s.runWindow?.startTime ?? '09:00',
    runWindowEnd: s.runWindow?.endTime ?? '17:00',
    maxRunsEnabled: s.maxRuns != null,
    maxRuns: s.maxRuns ?? 5,
  };
}

const UNIT_TO_MS: Record<ScheduleFormState['intervalUnit'], number> = {
  seconds: 1000,
  minutes: 60_000,
  hours: 3_600_000,
};

function draftFromForm(form: ScheduleFormState): ScheduleDraft {
  return {
    name: form.name,
    description: form.description || undefined,
    plateListId: form.plateListId,
    status: form.enabled ? 'enabled' : 'disabled',
    runMode: form.runMode,
    plateOrder: form.plateOrder,
    startAt: form.runMode === 'once_at_time' ? localInputToIso(form.startAtLocal) : undefined,
    dailyTime: form.runMode === 'daily_at_time' ? form.dailyTime : undefined,
    intervalMs: form.runMode === 'repeat_interval' ? form.intervalValue * UNIT_TO_MS[form.intervalUnit] : undefined,
    runWindow: form.runMode === 'repeat_interval' && form.runWindowEnabled
      ? { enabled: true, startTime: form.runWindowStart, endTime: form.runWindowEnd }
      : undefined,
    maxRuns: form.maxRunsEnabled ? form.maxRuns : undefined,
  };
}

// ─── Form ────────────────────────────────────────────────────────────────

function ScheduleForm({
  initial,
  lists,
  onSave,
  onCancel,
}: {
  initial: ScheduleFormState;
  lists: PlateList[];
  onSave: (draft: ScheduleDraft) => { ok: boolean; error?: string };
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ScheduleFormState>(key: K, value: ScheduleFormState[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handleSave() {
    const result = onSave(draftFromForm(form));
    if (!result.ok) {
      setError(result.error ?? 'Could not save schedule.');
      return;
    }
    setError(null);
  }

  return (
    <div className="flex flex-col gap-3 p-2.5 rounded-md border border-white/12 bg-white/3">
      <div>
        <Label>Name</Label>
        <input
          type="text"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          maxLength={80}
          placeholder="Nightly gate test"
          className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/15 text-xs font-mono text-white/85 outline-none focus:border-blue-500/50"
        />
      </div>

      <div>
        <Label>Description</Label>
        <textarea
          value={form.description}
          onChange={e => set('description', e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Optional notes"
          className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/15 text-[11px] font-mono text-white/70 outline-none resize-y focus:border-blue-500/50"
        />
      </div>

      <div>
        <Label>Plate List</Label>
        {lists.length === 0 ? (
          <p className="text-[10px] font-mono text-red-400/80">No saved plate lists yet — create one first.</p>
        ) : (
          <select
            value={form.plateListId}
            onChange={e => set('plateListId', e.target.value)}
            className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/15 text-[11px] font-mono text-white/80 outline-none focus:border-blue-500/50"
          >
            {lists.map(l => (
              <option key={l.id} value={l.id} className="bg-[#0f1117]">{l.name} ({l.plates.length} plates)</option>
            ))}
          </select>
        )}
      </div>

      <div>
        <Label>Status</Label>
        <MiniToggle<'enabled' | 'disabled'>
          options={[{ value: 'enabled', label: 'Enabled' }, { value: 'disabled', label: 'Disabled' }]}
          value={form.enabled ? 'enabled' : 'disabled'}
          onChange={v => set('enabled', v === 'enabled')}
        />
      </div>

      <div>
        <Label>Run Mode</Label>
        <MiniToggle<ScheduleRunMode>
          options={[
            { value: 'once_at_time', label: 'Once at time' },
            { value: 'repeat_interval', label: 'Repeat interval' },
            { value: 'daily_at_time', label: 'Daily at time' },
          ]}
          value={form.runMode}
          onChange={v => set('runMode', v)}
        />
      </div>

      {form.runMode === 'once_at_time' && (
        <div>
          <Label>Start At</Label>
          <input
            type="datetime-local"
            value={form.startAtLocal}
            onChange={e => set('startAtLocal', e.target.value)}
            className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/15 text-[11px] font-mono text-white/80 outline-none focus:border-blue-500/50"
          />
        </div>
      )}

      {form.runMode === 'repeat_interval' && (
        <>
          <div>
            <Label>Interval</Label>
            <div className="flex gap-1.5 items-center">
              <input
                type="number"
                min={1}
                value={form.intervalValue}
                onChange={e => set('intervalValue', Number(e.target.value))}
                className="w-20 px-2 py-1.5 rounded bg-white/5 border border-white/15 text-[11px] font-mono text-white/80 outline-none focus:border-blue-500/50"
              />
              <MiniToggle<ScheduleFormState['intervalUnit']>
                options={[{ value: 'seconds', label: 'sec' }, { value: 'minutes', label: 'min' }, { value: 'hours', label: 'hr' }]}
                value={form.intervalUnit}
                onChange={v => set('intervalUnit', v)}
              />
            </div>
            <p className="mt-1 text-[9px] text-white/25 font-mono">
              Min {MIN_INTERVAL_MS / 1000}s, max {MAX_INTERVAL_MS / 3_600_000}h.
            </p>
          </div>

          <div>
            <button
              onClick={() => set('runWindowEnabled', !form.runWindowEnabled)}
              className={`w-full py-1.5 rounded text-xs font-mono font-semibold border transition-all ${
                form.runWindowEnabled ? 'bg-cyan-600/25 border-cyan-500/45 text-cyan-300' : 'bg-white/5 border-white/12 text-white/45 hover:text-white/70'}`}
            >
              {form.runWindowEnabled ? '⏱ Run Window: ON' : '⏱ Run Window: OFF'}
            </button>
            {form.runWindowEnabled && (
              <div className="mt-2 flex gap-2 items-center">
                <input type="time" value={form.runWindowStart} onChange={e => set('runWindowStart', e.target.value)}
                  className="px-2 py-1.5 rounded bg-white/5 border border-white/15 text-[11px] font-mono text-white/80 outline-none" />
                <span className="text-white/30 text-[10px]">to</span>
                <input type="time" value={form.runWindowEnd} onChange={e => set('runWindowEnd', e.target.value)}
                  className="px-2 py-1.5 rounded bg-white/5 border border-white/15 text-[11px] font-mono text-white/80 outline-none" />
              </div>
            )}
          </div>
        </>
      )}

      {form.runMode === 'daily_at_time' && (
        <div>
          <Label>Daily Time</Label>
          <input
            type="time"
            value={form.dailyTime}
            onChange={e => set('dailyTime', e.target.value)}
            className="px-2 py-1.5 rounded bg-white/5 border border-white/15 text-[11px] font-mono text-white/80 outline-none focus:border-blue-500/50"
          />
        </div>
      )}

      <div>
        <Label>Plate Order</Label>
        <MiniToggle<SchedulePlateOrder>
          options={[{ value: 'sequential', label: 'Sequential' }, { value: 'shuffle', label: 'Shuffle' }]}
          value={form.plateOrder}
          onChange={v => set('plateOrder', v)}
        />
      </div>

      <div>
        <button
          onClick={() => set('maxRunsEnabled', !form.maxRunsEnabled)}
          className={`w-full py-1.5 rounded text-xs font-mono font-semibold border transition-all ${
            form.maxRunsEnabled ? 'bg-cyan-600/25 border-cyan-500/45 text-cyan-300' : 'bg-white/5 border-white/12 text-white/45 hover:text-white/70'}`}
        >
          {form.maxRunsEnabled ? `Max Runs: ${form.maxRuns}` : 'Max Runs: unlimited'}
        </button>
        {form.maxRunsEnabled && (
          <input
            type="number"
            min={1}
            value={form.maxRuns}
            onChange={e => set('maxRuns', Number(e.target.value))}
            className="mt-2 w-24 px-2 py-1.5 rounded bg-white/5 border border-white/15 text-[11px] font-mono text-white/80 outline-none"
          />
        )}
      </div>

      {error && <p className="text-[10px] text-red-400 font-mono">{error}</p>}

      <div className="flex gap-2">
        <SmallButton tone="primary" onClick={handleSave} disabled={lists.length === 0}>Save Schedule</SmallButton>
        <SmallButton onClick={onCancel}>Cancel</SmallButton>
      </div>
    </div>
  );
}

// ─── Schedule card ───────────────────────────────────────────────────────

function ScheduleCard({
  schedule,
  listName,
  listMissing,
  queueActive,
  onRunNow,
  onEnable,
  onDisable,
  onEdit,
  onDuplicate,
  onDelete,
  onResetRunCount,
}: {
  schedule: ScheduledPlateListRun;
  listName: string;
  listMissing: boolean;
  queueActive: boolean;
  onRunNow: () => void;
  onEnable: () => void;
  onDisable: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onResetRunCount: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 p-2.5 rounded-md border border-white/12 bg-white/3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-mono font-bold text-white/85 truncate">{schedule.name}</p>
          <p className="text-[10px] font-mono text-white/40 truncate">
            {listMissing ? <span className="text-red-400">⚠ Missing list</span> : listName}
          </p>
        </div>
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border shrink-0 ${
          schedule.status === 'enabled'
            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
            : 'bg-white/8 text-white/40 border-white/15'}`}>
          {schedule.status}
        </span>
      </div>
      <p className="text-[9px] font-mono text-white/30">
        {schedule.runMode} · {schedule.plateOrder} · runs: {schedule.runCount}{schedule.maxRuns != null ? `/${schedule.maxRuns}` : ''}
      </p>
      <p className="text-[9px] font-mono text-white/20">
        next: {formatDate(schedule.nextRunAt)} · last: {formatDate(schedule.lastRunAt)}
      </p>
      <div className="flex flex-wrap gap-1.5 mt-1">
        <SmallButton
          tone="primary"
          onClick={onRunNow}
          disabled={queueActive || listMissing}
        >
          ▶ Run Now
        </SmallButton>
        {schedule.status === 'enabled' ? (
          <SmallButton onClick={onDisable}>Disable</SmallButton>
        ) : (
          <SmallButton onClick={onEnable}>Enable</SmallButton>
        )}
        <SmallButton onClick={onEdit}>Edit</SmallButton>
        <SmallButton onClick={onDuplicate}>Duplicate</SmallButton>
        <SmallButton onClick={onResetRunCount}>Reset Count</SmallButton>
        <SmallButton tone="danger" onClick={onDelete}>Delete</SmallButton>
      </div>
      {queueActive && (
        <p className="text-[9px] font-mono text-yellow-400/70">Queue is currently running</p>
      )}
    </div>
  );
}

// ─── Panel ───────────────────────────────────────────────────────────────

export function SchedulerPanel({
  scheduler,
  lists,
  queueActive,
}: {
  scheduler: LocalSchedulerControls;
  lists: PlateList[];
  queueActive: boolean;
}) {
  const { schedules, storageError, createSchedule, updateSchedule, deleteSchedule, duplicateSchedule, enableSchedule, disableSchedule, resetRunCount, runNow, resetStorage } = scheduler;
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);

  const editingSchedule = editingId && editingId !== 'new' ? schedules.find(s => s.id === editingId) ?? null : null;

  function handleDelete(id: string, name: string) {
    if (window.confirm(`Delete schedule "${name}"? This cannot be undone.`)) {
      deleteSchedule(id);
    }
  }

  function handleResetStorage() {
    if (window.confirm('Reset scheduler storage? All schedules will be permanently deleted.')) {
      resetStorage();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {storageError && (
        <div className="p-2 rounded border border-red-500/30 bg-red-500/10">
          <p className="text-[10px] font-mono text-red-400 leading-snug">{storageError}</p>
          <div className="mt-1.5">
            <SmallButton tone="danger" onClick={handleResetStorage}>Reset Storage</SmallButton>
          </div>
        </div>
      )}

      {editingId === null && (
        <SmallButton tone="primary" onClick={() => setEditingId('new')} disabled={lists.length === 0}>
          + New Schedule
        </SmallButton>
      )}
      {lists.length === 0 && editingId === null && (
        <p className="text-[10px] font-mono text-white/25">Create a Plate List first to schedule it.</p>
      )}

      {editingId === 'new' && (
        <ScheduleForm
          initial={emptyForm(lists[0]?.id ?? '')}
          lists={lists}
          onCancel={() => setEditingId(null)}
          onSave={draft => {
            const result = createSchedule(draft);
            if (result.ok) setEditingId(null);
            return result;
          }}
        />
      )}

      {editingSchedule && (
        <ScheduleForm
          initial={formFromSchedule(editingSchedule)}
          lists={lists}
          onCancel={() => setEditingId(null)}
          onSave={draft => {
            const result = updateSchedule(editingSchedule.id, draft);
            if (result.ok) setEditingId(null);
            return result;
          }}
        />
      )}

      {editingId === null && (
        <div>
          <Label>Schedules ({schedules.length})</Label>
          {schedules.length === 0 ? (
            <p className="text-[10px] font-mono text-white/25">No schedules yet.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
              {schedules.map(schedule => {
                const list = lists.find(l => l.id === schedule.plateListId);
                return (
                  <ScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    listName={list?.name ?? ''}
                    listMissing={!list}
                    queueActive={queueActive}
                    onRunNow={() => runNow(schedule.id)}
                    onEnable={() => enableSchedule(schedule.id)}
                    onDisable={() => disableSchedule(schedule.id)}
                    onEdit={() => setEditingId(schedule.id)}
                    onDuplicate={() => duplicateSchedule(schedule.id)}
                    onDelete={() => handleDelete(schedule.id, schedule.name)}
                    onResetRunCount={() => resetRunCount(schedule.id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
