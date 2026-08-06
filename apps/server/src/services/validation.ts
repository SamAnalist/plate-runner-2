import {
  validatePlate,
  VEHICLE_COLORS,
  DIRECTIONS,
  DETECTOR_PLACEMENTS,
  GATE_MODES,
  GATE_INITIAL_STATES,
  PLATE_QUEUE_MODES,
  MAX_QUEUE_SIZE,
  MAX_PLATE_LIST_NAME_LENGTH,
  isPlacementAllowedForDirection,
  type Direction,
  type DetectorPlacement,
  type VehicleColor,
  type GateConfig,
  type PlateQueueConfig,
  type SetConfigPayload,
} from '@plate-runner/shared';

/**
 * Domain validation shared between all routes that accept simulation
 * config-shaped bodies. Deliberately reuses the exact same shared arrays
 * and validatePlate the frontend uses — the rules can never drift between
 * frontend and backend.
 */

export function validateDirection(v: unknown): v is Direction {
  return typeof v === 'string' && DIRECTIONS.includes(v as Direction);
}

export function validateDetectorPlacement(v: unknown): v is DetectorPlacement {
  return typeof v === 'string' && DETECTOR_PLACEMENTS.includes(v as DetectorPlacement);
}

export function validateVehicleColor(v: unknown): v is VehicleColor {
  return typeof v === 'string' && VEHICLE_COLORS.includes(v as VehicleColor);
}

export function validateGateConfig(v: unknown): v is GateConfig {
  if (typeof v !== 'object' || v === null) return false;
  const g = v as Record<string, unknown>;
  return (
    typeof g.gateMode === 'string' && GATE_MODES.includes(g.gateMode as GateConfig['gateMode']) &&
    typeof g.gateInitialState === 'string' && GATE_INITIAL_STATES.includes(g.gateInitialState as GateConfig['gateInitialState']) &&
    typeof g.stopBeforeOpenMs === 'number' &&
    typeof g.delayAfterOpenMs === 'number'
  );
}

export function validateQueueConfig(v: unknown): v is PlateQueueConfig {
  if (typeof v !== 'object' || v === null) return false;
  const q = v as Record<string, unknown>;
  return (
    typeof q.mode === 'string' && PLATE_QUEUE_MODES.includes(q.mode as PlateQueueConfig['mode']) &&
    typeof q.gapBetweenVehiclesMs === 'number' &&
    typeof q.loop === 'boolean'
  );
}

export type PlatesValidationResult = { ok: true; plates: string[] } | { ok: false; error: string };

export function validatePlates(value: unknown, max: number = MAX_QUEUE_SIZE): PlatesValidationResult {
  if (!Array.isArray(value)) return { ok: false, error: 'plates must be an array' };
  if (value.length === 0) return { ok: false, error: 'plates cannot be empty' };
  if (value.length > max) return { ok: false, error: `too many plates (${value.length}), max is ${max}` };

  const normalized: string[] = [];
  for (const p of value) {
    if (typeof p !== 'string') return { ok: false, error: 'each plate must be a string' };
    const result = validatePlate(p);
    if (!result.valid || !result.normalized) return { ok: false, error: `invalid plate "${p}": ${result.error}` };
    normalized.push(result.normalized);
  }
  return { ok: true, plates: normalized };
}

export type NameValidationResult = { ok: true; name: string } | { ok: false; error: string };

/** Shared cap for display/controller/plate-list names — all capped at the same 80 chars. */
export function validateName(v: unknown, label: string, max: number = MAX_PLATE_LIST_NAME_LENGTH): NameValidationResult {
  if (typeof v !== 'string') return { ok: false, error: `${label} is required` };
  const trimmed = v.trim();
  if (!trimmed) return { ok: false, error: `${label} is required` };
  if (trimmed.length > max) return { ok: false, error: `${label} exceeds ${max} characters` };
  return { ok: true, name: trimmed };
}

export type SetConfigValidationResult = { ok: true; payload: SetConfigPayload } | { ok: false; error: string };

/** Every field is optional — only present fields are validated/applied. */
export function validateSetConfigPayload(v: unknown): SetConfigValidationResult {
  if (typeof v !== 'object' || v === null) return { ok: false, error: 'payload must be an object' };
  const body = v as Record<string, unknown>;
  const payload: SetConfigPayload = {};

  if (body.direction !== undefined) {
    if (!validateDirection(body.direction)) return { ok: false, error: 'invalid direction' };
    payload.direction = body.direction;
  }
  if (body.detectorPlacement !== undefined) {
    if (!validateDetectorPlacement(body.detectorPlacement)) return { ok: false, error: 'invalid detectorPlacement' };
    payload.detectorPlacement = body.detectorPlacement;
  }
  if (payload.direction && payload.detectorPlacement && !isPlacementAllowedForDirection(payload.direction, payload.detectorPlacement)) {
    return { ok: false, error: 'detectorPlacement is not valid for the given direction' };
  }
  if (body.vehicleColor !== undefined) {
    if (!validateVehicleColor(body.vehicleColor)) return { ok: false, error: 'invalid vehicleColor' };
    payload.vehicleColor = body.vehicleColor;
  }
  if (body.gateConfig !== undefined) {
    if (!validateGateConfig(body.gateConfig)) return { ok: false, error: 'invalid gateConfig' };
    payload.gateConfig = body.gateConfig;
  }
  if (body.queueConfig !== undefined) {
    if (!validateQueueConfig(body.queueConfig)) return { ok: false, error: 'invalid queueConfig' };
    payload.queueConfig = body.queueConfig;
  }
  if (Object.keys(payload).length === 0) return { ok: false, error: 'payload must set at least one field' };

  return { ok: true, payload };
}
