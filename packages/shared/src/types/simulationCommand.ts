import type { Direction, DetectorPlacement, VehicleColor, GateConfig } from './simulation';
import type { PlateQueueConfig } from './queue';
import type { PlateList, PlateListId } from './plateList';
import type { CommandSource } from './remote';

export type SimulationCommandType =
  | 'run_plate'
  | 'run_queue'
  | 'run_list'
  | 'pause'
  | 'resume'
  | 'stop'
  | 'skip_current'
  | 'open_gate'
  | 'set_config';

export const SIMULATION_COMMAND_TYPES: SimulationCommandType[] = [
  'run_plate', 'run_queue', 'run_list',
  'pause', 'resume', 'stop', 'skip_current', 'open_gate', 'set_config',
];

export type SimulationCommandStatus = 'pending' | 'claimed' | 'completed' | 'failed' | 'cancelled';
export const SIMULATION_COMMAND_STATUSES: SimulationCommandStatus[] = [
  'pending', 'claimed', 'completed', 'failed', 'cancelled',
];

export interface SimulationCommand {
  id: string;
  type: SimulationCommandType;
  payload: unknown;
  status: SimulationCommandStatus;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp. */
  updatedAt: string;
  /** ISO timestamp. */
  claimedAt?: string;
  /** ISO timestamp. */
  completedAt?: string;
  error?: string;
  /** Set for remote-controller-created commands — the display this command targets. Undefined/null for local/global commands. */
  displayId?: string;
  /** Where this command came from. Defaults to 'unknown' for any pre-Phase-5 row missing the column. */
  source: CommandSource;
  /** Set for remote-controller-created commands — which controller device created it. */
  createdByControllerId?: string;
}

// ─── Per-type payload shapes ────────────────────────────────────────────
// Constructed by the backend's convenience endpoints (POST /api/simulate,
// /api/simulate/queue, /api/lists/:id/run). The generic
// POST /api/simulation/commands endpoint accepts any of these directly.

export interface RunPlatePayload {
  plate: string;
  direction: Direction;
  detectorPlacement: DetectorPlacement;
  vehicleColor: VehicleColor;
  gateConfig: GateConfig;
  queueConfig: PlateQueueConfig;
  /** Defaults to 'slow' server-side when omitted from the request — see REQUEST_SPEED_PRESETS. */
  speedPreset: 'slow' | 'regular' | 'fast';
}

export interface RunQueuePayload {
  plates: string[];
  direction: Direction;
  detectorPlacement: DetectorPlacement;
  vehicleColor: VehicleColor;
  gateConfig: GateConfig;
  queueConfig: PlateQueueConfig;
  /** Defaults to 'slow' server-side when omitted from the request — see REQUEST_SPEED_PRESETS. */
  speedPreset: 'slow' | 'regular' | 'fast';
}

/**
 * Embeds a full PlateList snapshot (not just an id) so the frontend never
 * has to race a separate lookup against the list possibly changing/being
 * deleted between command creation and the frontend claiming it.
 */
export interface RunListPayload {
  listId: PlateListId;
  list: PlateList;
}

/**
 * Partial simulation config change, applied directly to the display's local
 * SimulationConfig by the command listener (see useApiCommandListener /
 * useDisplayCommandListener's onSetConfig). All fields optional — only the
 * ones present are changed.
 */
export interface SetConfigPayload {
  direction?: Direction;
  detectorPlacement?: DetectorPlacement;
  vehicleColor?: VehicleColor;
  gateConfig?: GateConfig;
  queueConfig?: PlateQueueConfig;
  speedPreset?: 'slow' | 'regular' | 'fast';
}
