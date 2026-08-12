import type { Direction, DetectorPlacement, VehicleColor, GateConfig } from './simulation';
import type { PlateQueueConfig } from './queue';

export type PlateListId = string;

export interface PlateListSimulationDefaults {
  direction: Direction;
  detectorPlacement: DetectorPlacement;
  vehicleColor: VehicleColor;
  gateConfig: GateConfig;
  queueConfig: PlateQueueConfig;
  /** Optional — absent on lists saved before the Speed presets feature; leaves the current speed untouched when applied. */
  speedPreset?: 'slow' | 'regular' | 'fast';
}

export interface PlateList {
  id: PlateListId;
  name: string;
  description?: string;
  /** Already-validated, normalized plate strings. */
  plates: string[];
  simulationDefaults: PlateListSimulationDefaults;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp. */
  updatedAt: string;
  version: number;
}

export const MAX_PLATE_LIST_NAME_LENGTH = 80;
export const MAX_PLATE_LIST_DESCRIPTION_LENGTH = 500;
/** Same ceiling as MAX_QUEUE_SIZE, kept as a separate constant for clarity in this domain. */
export const MAX_PLATE_LIST_PLATES = 500;
export const PLATE_LIST_SCHEMA_VERSION = 1;

export interface PlateListExportEnvelope {
  schemaVersion: 1;
  type: 'plate_runner_plate_list';
  data: PlateList;
}

export interface PlateListCollectionExportEnvelope {
  schemaVersion: 1;
  type: 'plate_runner_plate_list_collection';
  data: PlateList[];
}
