import type { Direction, DetectorPlacement, VehicleColor, GateConfig } from './simulation';
import type { PlateQueueConfig } from './queue';
import type { PlateList, PlateListId } from './plateList';

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
}

export interface RunQueuePayload {
  plates: string[];
  direction: Direction;
  detectorPlacement: DetectorPlacement;
  vehicleColor: VehicleColor;
  gateConfig: GateConfig;
  queueConfig: PlateQueueConfig;
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
