import { randomUUID } from 'node:crypto';
import {
  MAX_PLATE_LIST_NAME_LENGTH,
  MAX_PLATE_LIST_DESCRIPTION_LENGTH,
  isPlacementAllowedForDirection,
  type PlateList,
} from '@plate-runner/shared';
import type { ListsRepo } from '../storage/listsRepo';
import {
  validateDirection,
  validateDetectorPlacement,
  validateVehicleColor,
  validateVehicleType,
  validateGateConfig,
  validateQueueConfig,
  validatePlates,
} from './validation';

type DraftFields = Pick<PlateList, 'name' | 'description' | 'plates' | 'simulationDefaults'>;
type DraftValidationResult = { ok: true; fields: DraftFields } | { ok: false; error: string };

function validateDraft(draft: Record<string, unknown>): DraftValidationResult {
  const name = typeof draft.name === 'string' ? draft.name.trim() : '';
  if (!name) return { ok: false, error: 'name is required' };
  if (name.length > MAX_PLATE_LIST_NAME_LENGTH) return { ok: false, error: `name exceeds ${MAX_PLATE_LIST_NAME_LENGTH} characters` };

  const description = typeof draft.description === 'string' ? draft.description : undefined;
  if (description && description.length > MAX_PLATE_LIST_DESCRIPTION_LENGTH) {
    return { ok: false, error: `description exceeds ${MAX_PLATE_LIST_DESCRIPTION_LENGTH} characters` };
  }

  const platesResult = validatePlates(draft.plates);
  if (!platesResult.ok) return { ok: false, error: platesResult.error };

  const sd = draft.simulationDefaults as Record<string, unknown> | undefined;
  if (typeof sd !== 'object' || sd === null) return { ok: false, error: 'simulationDefaults is required' };
  if (!validateDirection(sd.direction)) return { ok: false, error: 'invalid simulationDefaults.direction' };
  if (!validateDetectorPlacement(sd.detectorPlacement)) return { ok: false, error: 'invalid simulationDefaults.detectorPlacement' };
  if (!isPlacementAllowedForDirection(sd.direction, sd.detectorPlacement)) {
    return { ok: false, error: 'simulationDefaults.detectorPlacement is not valid for the given direction' };
  }
  if (!validateVehicleColor(sd.vehicleColor)) return { ok: false, error: 'invalid simulationDefaults.vehicleColor' };
  if (sd.vehicleType !== undefined && !validateVehicleType(sd.vehicleType)) {
    return { ok: false, error: 'invalid simulationDefaults.vehicleType' };
  }
  if (!validateGateConfig(sd.gateConfig)) return { ok: false, error: 'invalid simulationDefaults.gateConfig' };
  if (!validateQueueConfig(sd.queueConfig)) return { ok: false, error: 'invalid simulationDefaults.queueConfig' };

  return {
    ok: true,
    fields: {
      name,
      description,
      plates: platesResult.plates,
      simulationDefaults: {
        direction: sd.direction,
        detectorPlacement: sd.detectorPlacement,
        vehicleColor: sd.vehicleColor,
        vehicleType: sd.vehicleType,
        gateConfig: sd.gateConfig,
        queueConfig: sd.queueConfig,
      } as PlateList['simulationDefaults'],
    },
  };
}

export type ListMutationResult = { ok: true; list: PlateList } | { ok: false; error: string };

export function createListService(repo: ListsRepo) {
  return {
    listAll(): PlateList[] {
      return repo.listAll();
    },
    getById(id: string): PlateList | null {
      return repo.getById(id);
    },
    create(draft: Record<string, unknown>): ListMutationResult {
      const validated = validateDraft(draft);
      if (!validated.ok) return validated;
      const timestamp = new Date().toISOString();
      const list: PlateList = { id: randomUUID(), ...validated.fields, createdAt: timestamp, updatedAt: timestamp, version: 1 };
      repo.upsert(list);
      return { ok: true, list };
    },
    update(id: string, draft: Record<string, unknown>): ListMutationResult {
      const existing = repo.getById(id);
      if (!existing) return { ok: false, error: 'not_found' };
      const validated = validateDraft(draft);
      if (!validated.ok) return validated;
      const list: PlateList = { ...existing, ...validated.fields, updatedAt: new Date().toISOString() };
      repo.upsert(list);
      return { ok: true, list };
    },
    delete(id: string): boolean {
      if (!repo.getById(id)) return false;
      repo.delete(id);
      return true;
    },
  };
}

export type ListService = ReturnType<typeof createListService>;
