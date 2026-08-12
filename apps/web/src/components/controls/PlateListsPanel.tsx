import { useMemo, useRef, useState } from 'react';
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
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { FieldError } from '../ui/FieldError';
import { downloadJSON } from '../../lib/downloadJSON';
import { generateRandomPlates } from '../../features/lists/randomPlateGenerator';

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
          className={`px-2.5 py-1.5 rounded text-xs font-mono font-semibold border transition-all ${
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

function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'plate-list';
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
    stopBeforeOpenMs: 3000,
    delayAfterOpenMs: 1400,
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
  const [genCount, setGenCount] = useState(10);
  const [genDigits, setGenDigits] = useState(6);
  const [genPrefix, setGenPrefix] = useState('');

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

        <div className="mt-2 p-2 rounded-md border border-white/10 bg-white/3 flex flex-col gap-1.5">
          <p className="text-[9px] text-white/35 uppercase tracking-widest">Random Plate Generator</p>
          <div className="flex gap-1.5 items-center flex-wrap">
            <label className="flex items-center gap-1 text-[9px] font-mono text-white/40">
              Count
              <input
                type="number" min={1} max={500} value={genCount}
                onChange={e => setGenCount(Number(e.target.value))}
                className="w-14 px-1.5 py-1 rounded bg-white/5 border border-white/15 text-[11px] font-mono text-white/80 outline-none"
              />
            </label>
            <label className="flex items-center gap-1 text-[9px] font-mono text-white/40">
              Digits
              <input
                type="number" min={1} max={11} value={genDigits}
                onChange={e => setGenDigits(Number(e.target.value))}
                className="w-14 px-1.5 py-1 rounded bg-white/5 border border-white/15 text-[11px] font-mono text-white/80 outline-none"
              />
            </label>
            <label className="flex items-center gap-1 text-[9px] font-mono text-white/40">
              Prefix
              <input
                type="text" value={genPrefix} placeholder="GE" maxLength={8}
                onChange={e => setGenPrefix(e.target.value)}
                className="w-16 px-1.5 py-1 rounded bg-white/5 border border-white/15 text-[11px] font-mono text-white/80 outline-none uppercase"
              />
            </label>
            <Button
              tone="primary"
              onClick={() => set('platesRaw', generateRandomPlates({ count: genCount, digitCount: genDigits, prefix: genPrefix }).join('\n'))}
            >
              Generate
            </Button>
          </div>
          <p className="text-[9px] font-mono text-white/25 leading-snug">
            Replaces the Plates box above with {genCount} random plates
            (e.g. {genPrefix ? `${genPrefix.toUpperCase().replace(/[^A-Z0-9]/g, '')}` : 'GE'}
            {Array.from({ length: Math.max(genDigits, 1) }).map(() => '#').join('')}). No hyphens/spaces — plates must be A–Z0–9 only.
          </p>
        </div>
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
          <Button
            variant="ghost"
            tone={form.loop ? 'primary' : 'neutral'}
            className="w-full"
            onClick={() => set('loop', !form.loop)}
          >
            {form.loop ? '↻ Loop: ON' : '↻ Loop: OFF'}
          </Button>
        </div>
      </div>

      {error && <FieldError>{error}</FieldError>}

      <div className="flex gap-2">
        <Button tone="primary" onClick={handleSave}>Save List</Button>
        <Button onClick={onCancel}>Cancel</Button>
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
  onExport,
}: {
  list: PlateList;
  onRun: () => void;
  onLoad: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onExport: () => void;
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
        <Button tone="primary" onClick={onRun}>▶ Run List</Button>
        <Button onClick={onLoad}>Load Into Queue</Button>
        <Button onClick={onEdit}>Edit</Button>
        <Button onClick={onDuplicate}>Duplicate</Button>
        <Button onClick={onExport}>Export</Button>
        <Button tone="danger" onClick={onDelete}>Delete</Button>
      </div>
    </div>
  );
}

// ─── Panel ───────────────────────────────────────────────────────────────

export function PlateListsPanel(props: PlateListsControls) {
  const {
    lists, storageError, lastImportResult,
    createList, updateList, deleteList, duplicateList, resetStorage,
    runList, loadListIntoQueue,
    exportListToJSON, exportAllToJSON, importFromJSON,
  } = props;
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [showImportFormat, setShowImportFormat] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function handleExportList(list: PlateList) {
    const json = exportListToJSON(list.id);
    if (json) downloadJSON(`${slugify(list.name)}.json`, json);
  }

  function handleExportAll() {
    downloadJSON('plate-runner-lists.json', exportAllToJSON());
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') importFromJSON(reader.result);
    };
    reader.readAsText(file);
  }

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

      {editingId === null && (
        <Button tone="primary" onClick={() => setEditingId('new')}>+ New List</Button>
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
            <EmptyState message="No saved lists yet." hint="Click + New List above to save a reusable set of plates." />
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
                  onExport={() => handleExportList(list)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {editingId === null && (
        <div>
          <Label>Import / Export</Label>
          <div className="flex flex-wrap gap-1.5 items-center">
            <Button onClick={handleExportAll} disabled={lists.length === 0}>Export All</Button>
            <Button onClick={() => fileInputRef.current?.click()}>Import JSON</Button>
            <Button variant="ghost" onClick={() => setShowImportFormat(v => !v)}>
              ⓘ Format
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>
          {showImportFormat && (
            <div className="mt-1.5 p-2.5 rounded-md border border-white/10 bg-white/3 text-[10px] font-mono text-white/50 leading-snug">
              <p className="text-white/70 mb-1">Import JSON accepts either shape:</p>
              <p className="text-white/40">1. A single list (from "Export" on one list):</p>
              <pre className="mt-1 mb-2 p-1.5 rounded bg-black/30 text-[9px] text-white/45 overflow-x-auto">{
`{
  "schemaVersion": 1,
  "type": "plate_runner_plate_list",
  "data": { "name": "...", "plates": ["ABC123"], ... }
}`
              }</pre>
              <p className="text-white/40">2. A collection (from "Export All"):</p>
              <pre className="mt-1 p-1.5 rounded bg-black/30 text-[9px] text-white/45 overflow-x-auto">{
`{
  "schemaVersion": 1,
  "type": "plate_runner_plate_list_collection",
  "data": [ { "name": "...", "plates": ["ABC123"], ... }, ... ]
}`
              }</pre>
              <p className="mt-1.5 text-white/30">
                Plates must be A–Z0–9 only (no hyphens/spaces), max 12 characters. Use "Export"/"Export All" to see the exact shape from your own data.
              </p>
            </div>
          )}
          {lastImportResult && (
            <div className="mt-1.5 text-[10px] font-mono">
              <p className="text-emerald-400">Imported {lastImportResult.importedCount} list(s).</p>
              {lastImportResult.errors.length > 0 && (
                <div className="mt-1 max-h-20 overflow-y-auto rounded-md border border-red-500/20 bg-red-500/5 px-2 py-1">
                  {lastImportResult.errors.map((err, i) => (
                    <p key={i} className="text-red-400/80 leading-snug truncate">{err}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
