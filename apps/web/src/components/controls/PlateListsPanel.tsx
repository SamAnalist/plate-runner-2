import { useMemo, useState } from 'react';
import {
  DEFAULT_QUEUE_CONFIG,
  getPlacementsForDirection,
  type Direction,
  type DetectorPlacement,
  type GateMode,
  type GateInitialState,
  type PlateList,
  type PlateListSimulationDefaults,
  type PlateQueueMode,
  type VehicleColor,
} from '@plate-runner/shared';
import type { PlateListsControls, PlateListDraft } from '../../features/lists/usePlateLists';
import { parsePlateQueueInput } from '../../features/queue/plateQueueParser';

// ─── Local primitives (mirrors PlateQueuePanel's pattern) ──────────────────

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

const VEHICLE_COLOR_HEX: Record<VehicleColor, string> = {
  blue: '#2563eb',
  red:  '#dc2626',
  gray: '#6b7280',
};

// ─── Form state ──────────────────────────────────────────────────────────

interface ListFormState {
  name: string;
  description: string;
  platesRaw: string;
  direction: Direction;
  detectorPlacement: DetectorPlacement;
  vehicleColor: VehicleColor;
  gateMode: GateMode;
  gateInitialState: GateInitialState;
  stopBeforeOpenMs: number;
  delayAfterOpenMs: number;
  queueMode: PlateQueueMode;
  gapBetweenVehiclesMs: number;
  loop: boolean;
}

function emptyForm(): ListFormState {
  return {
    name: '',
    description: '',
    platesRaw: '',
    direction: 'incoming',
    detectorPlacement: 'center_front',
    vehicleColor: 'blue',
    gateMode: 'auto_open',
    gateInitialState: 'closed',
    stopBeforeOpenMs: 2000,
    delayAfterOpenMs: 400,
    queueMode: DEFAULT_QUEUE_CONFIG.mode,
    gapBetweenVehiclesMs: DEFAULT_QUEUE_CONFIG.gapBetweenVehiclesMs,
    loop: DEFAULT_QUEUE_CONFIG.loop,
  };
}

function formFromList(list: PlateList): ListFormState {
  const d = list.simulationDefaults;
  return {
    name: list.name,
    description: list.description ?? '',
    platesRaw: list.plates.join('\n'),
    direction: d.direction,
    detectorPlacement: d.detectorPlacement,
    vehicleColor: d.vehicleColor,
    gateMode: d.gateConfig.gateMode,
    gateInitialState: d.gateConfig.gateInitialState,
    stopBeforeOpenMs: d.gateConfig.stopBeforeOpenMs,
    delayAfterOpenMs: d.gateConfig.delayAfterOpenMs,
    queueMode: d.queueConfig.mode,
    gapBetweenVehiclesMs: d.queueConfig.gapBetweenVehiclesMs,
    loop: d.queueConfig.loop,
  };
}

function draftFromForm(form: ListFormState, validPlates: string[]): PlateListDraft {
  const simulationDefaults: PlateListSimulationDefaults = {
    direction: form.direction,
    detectorPlacement: form.detectorPlacement,
    vehicleColor: form.vehicleColor,
    gateConfig: {
      gateMode: form.gateMode,
      gateInitialState: form.gateInitialState,
      stopBeforeOpenMs: form.stopBeforeOpenMs,
      delayAfterOpenMs: form.delayAfterOpenMs,
    },
    queueConfig: {
      mode: form.queueMode,
      gapBetweenVehiclesMs: form.gapBetweenVehiclesMs,
      loop: form.loop,
    },
  };
  return {
    name: form.name,
    description: form.description || undefined,
    plates: validPlates,
    simulationDefaults,
  };
}

// ─── List form ───────────────────────────────────────────────────────────

function ListForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: ListFormState;
  onSave: (draft: PlateListDraft) => { ok: boolean; error?: string };
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ListFormState>(key: K, value: ListFormState[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  const preview = useMemo(() => parsePlateQueueInput(form.platesRaw), [form.platesRaw]);
  const placements = getPlacementsForDirection(form.direction);

  function handleDirectionChange(direction: Direction) {
    const stillValid = placements.includes(form.detectorPlacement) && getPlacementsForDirection(direction).includes(form.detectorPlacement);
    set('direction', direction);
    if (!stillValid) {
      set('detectorPlacement', getPlacementsForDirection(direction)[0]);
    }
  }

  function handleSave() {
    const result = onSave(draftFromForm(form, preview.valid));
    if (!result.ok) {
      setError(result.error ?? 'Could not save list.');
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
          placeholder="Morning shift plates"
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
          placeholder="Optional notes about this list"
          className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/15 text-[11px] font-mono text-white/70 outline-none resize-y focus:border-blue-500/50"
        />
      </div>

      <div>
        <Label>Plates</Label>
        <textarea
          value={form.platesRaw}
          onChange={e => set('platesRaw', e.target.value)}
          rows={4}
          placeholder={'ABC123\nXYZ999'}
          spellCheck={false}
          className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/15 text-[11px] font-mono text-white/80 tracking-wide outline-none resize-y focus:border-blue-500/50"
        />
        <p className="mt-1 text-[10px] font-mono text-white/35">
          total <span className="text-white/60">{preview.total}</span>
          {' · '}valid <span className="text-emerald-400">{preview.valid.length}</span>
          {' · '}invalid <span className="text-red-400">{preview.invalid.length}</span>
        </p>
      </div>

      <div>
        <Label>Direction</Label>
        <MiniToggle<Direction>
          options={[{ value: 'incoming', label: 'Incoming' }, { value: 'away', label: 'Away' }]}
          value={form.direction}
          onChange={handleDirectionChange}
        />
      </div>

      <div>
        <Label>Detector Placement</Label>
        <div className="grid grid-cols-3 gap-1">
          {placements.map(p => (
            <button
              key={p}
              onClick={() => set('detectorPlacement', p)}
              className={`py-1.5 rounded text-[9px] font-mono font-semibold border transition-all ${
                form.detectorPlacement === p
                  ? 'bg-blue-600/80 border-blue-500/70 text-white'
                  : 'bg-white/5 border-white/12 text-white/45 hover:text-white/75'}`}
            >
              {p.replace('_', '\n')}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Vehicle Color</Label>
        <div className="flex gap-2">
          {(Object.keys(VEHICLE_COLOR_HEX) as VehicleColor[]).map(color => (
            <button
              key={color}
              title={color}
              onClick={() => set('vehicleColor', color)}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                form.vehicleColor === color ? 'border-white/80 scale-110' : 'border-white/20 hover:border-white/50'}`}
              style={{ backgroundColor: VEHICLE_COLOR_HEX[color] }}
            />
          ))}
        </div>
      </div>

      <div>
        <Label>Gate</Label>
        <div className="flex flex-col gap-2">
          <MiniToggle<GateMode>
            options={[{ value: 'hidden', label: 'Hidden' }, { value: 'auto_open', label: 'Auto Open' }, { value: 'wait_for_signal', label: 'Wait Signal' }]}
            value={form.gateMode}
            onChange={v => set('gateMode', v)}
          />
          {form.gateMode !== 'hidden' && (
            <MiniToggle<GateInitialState>
              options={[{ value: 'closed', label: 'Closed' }, { value: 'open', label: 'Open' }]}
              value={form.gateInitialState}
              onChange={v => set('gateInitialState', v)}
            />
          )}
          {form.gateMode === 'auto_open' && form.gateInitialState === 'closed' && (
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-white/40 font-mono">Stop before opening</span>
                <span className="text-[10px] font-mono text-blue-400 font-bold">{form.stopBeforeOpenMs}ms</span>
              </div>
              <input type="range" min={200} max={8000} step={200} value={form.stopBeforeOpenMs}
                onChange={e => set('stopBeforeOpenMs', Number(e.target.value))}
                className="w-full accent-blue-500 h-1 rounded cursor-pointer" />
            </div>
          )}
        </div>
      </div>

      <div>
        <Label>Queue Settings</Label>
        <div className="flex flex-col gap-2">
          <MiniToggle<PlateQueueMode>
            options={[{ value: 'run_all', label: 'Run All' }, { value: 'manual_next', label: 'Manual Next' }]}
            value={form.queueMode}
            onChange={v => set('queueMode', v)}
          />
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-white/40 font-mono">Gap between vehicles</span>
              <span className="text-[10px] font-mono text-blue-400 font-bold">{form.gapBetweenVehiclesMs}ms</span>
            </div>
            <input type="range" min={0} max={5000} step={100} value={form.gapBetweenVehiclesMs}
              onChange={e => set('gapBetweenVehiclesMs', Number(e.target.value))}
              className="w-full accent-blue-500 h-1 rounded cursor-pointer" />
          </div>
          <button
            onClick={() => set('loop', !form.loop)}
            className={`w-full py-1.5 rounded text-xs font-mono font-semibold border transition-all ${
              form.loop ? 'bg-cyan-600/25 border-cyan-500/45 text-cyan-300' : 'bg-white/5 border-white/12 text-white/45 hover:text-white/70'}`}
          >
            {form.loop ? '↻ Loop: ON' : '↻ Loop: OFF'}
          </button>
        </div>
      </div>

      {error && <p className="text-[10px] text-red-400 font-mono">{error}</p>}

      <div className="flex gap-2">
        <SmallButton tone="primary" onClick={handleSave}>Save List</SmallButton>
        <SmallButton onClick={onCancel}>Cancel</SmallButton>
      </div>
    </div>
  );
}

// ─── List card ───────────────────────────────────────────────────────────

function ListCard({
  list,
  onRun,
  onLoad,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  list: PlateList;
  onRun: () => void;
  onLoad: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const d = list.simulationDefaults;
  return (
    <div className="flex flex-col gap-1.5 p-2.5 rounded-md border border-white/12 bg-white/3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-mono font-bold text-white/85 truncate">{list.name}</p>
          {list.description && (
            <p className="text-[10px] font-mono text-white/40 truncate">{list.description}</p>
          )}
        </div>
        <span
          className="w-3 h-3 rounded-full border border-white/20 shrink-0 mt-0.5"
          style={{ backgroundColor: VEHICLE_COLOR_HEX[d.vehicleColor] }}
          title={d.vehicleColor}
        />
      </div>
      <p className="text-[9px] font-mono text-white/30">
        {list.plates.length} plates · {d.direction} · {d.detectorPlacement} · {d.gateConfig.gateMode} · {d.queueConfig.mode}
      </p>
      <p className="text-[9px] font-mono text-white/20">
        updated {new Date(list.updatedAt).toLocaleString()}
      </p>
      <div className="flex flex-wrap gap-1.5 mt-1">
        <SmallButton tone="primary" onClick={onRun}>▶ Run List</SmallButton>
        <SmallButton onClick={onLoad}>Load Into Queue</SmallButton>
        <SmallButton onClick={onEdit}>Edit</SmallButton>
        <SmallButton onClick={onDuplicate}>Duplicate</SmallButton>
        <SmallButton tone="danger" onClick={onDelete}>Delete</SmallButton>
      </div>
    </div>
  );
}

// ─── Panel ───────────────────────────────────────────────────────────────

export function PlateListsPanel(props: PlateListsControls) {
  const { lists, storageError, createList, updateList, deleteList, duplicateList, resetStorage, runList, loadListIntoQueue } = props;
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);

  const editingList = editingId && editingId !== 'new' ? lists.find(l => l.id === editingId) ?? null : null;

  function handleDelete(id: string, name: string) {
    if (window.confirm(`Delete plate list "${name}"? This cannot be undone.`)) {
      deleteList(id);
    }
  }

  function handleResetStorage() {
    if (window.confirm('Reset plate list storage? All saved lists will be permanently deleted.')) {
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
        <SmallButton tone="primary" onClick={() => setEditingId('new')}>+ New List</SmallButton>
      )}

      {editingId === 'new' && (
        <ListForm
          initial={emptyForm()}
          onCancel={() => setEditingId(null)}
          onSave={draft => {
            const result = createList(draft);
            if (result.ok) setEditingId(null);
            return result;
          }}
        />
      )}

      {editingList && (
        <ListForm
          initial={formFromList(editingList)}
          onCancel={() => setEditingId(null)}
          onSave={draft => {
            const result = updateList(editingList.id, draft);
            if (result.ok) setEditingId(null);
            return result;
          }}
        />
      )}

      {editingId === null && (
        <div>
          <Label>Saved Lists ({lists.length})</Label>
          {lists.length === 0 ? (
            <p className="text-[10px] font-mono text-white/25">No saved lists yet.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
              {lists.map(list => (
                <ListCard
                  key={list.id}
                  list={list}
                  onRun={() => runList(list.id)}
                  onLoad={() => loadListIntoQueue(list.id)}
                  onEdit={() => setEditingId(list.id)}
                  onDuplicate={() => duplicateList(list.id)}
                  onDelete={() => handleDelete(list.id, list.name)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
