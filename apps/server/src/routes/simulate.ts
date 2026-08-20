import type { FastifyInstance } from 'fastify';
import { validatePlate, isPlacementAllowedForDirection, REQUEST_SPEED_PRESETS, VEHICLE_TYPES } from '@plate-runner/shared';
import type { CommandService } from '../services/commandService';
import {
  validateDirection,
  validateDetectorPlacement,
  validateVehicleColor,
  validateVehicleType,
  validateGateConfig,
  validateQueueConfig,
  validatePlates,
  validateSpeedPreset,
} from '../services/validation';

/** Endpoint-level default when the caller doesn't specify speedPreset — favors camera readability over cinematic speed. */
const DEFAULT_REQUEST_SPEED_PRESET = 'slow';
/** Endpoint-level default when the caller doesn't specify vehicleType — the original/only vehicle before the SUV type was added. */
const DEFAULT_REQUEST_VEHICLE_TYPE = 'sedan';

/** POST /api/simulate and POST /api/simulate/queue — create run_plate/run_queue commands. Never executes anything itself. */
export async function registerSimulateRoutes(fastify: FastifyInstance, commandService: CommandService): Promise<void> {
  fastify.post('/simulate', async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;

    const plateResult = validatePlate(typeof body.plate === 'string' ? body.plate : '');
    if (!plateResult.valid || !plateResult.normalized) {
      return reply.code(400).send({ ok: false, error: plateResult.error ?? 'invalid plate' });
    }
    if (!validateDirection(body.direction)) return reply.code(400).send({ ok: false, error: 'invalid direction' });
    if (!validateDetectorPlacement(body.detectorPlacement)) return reply.code(400).send({ ok: false, error: 'invalid detectorPlacement' });
    if (!isPlacementAllowedForDirection(body.direction, body.detectorPlacement)) {
      return reply.code(400).send({ ok: false, error: 'detectorPlacement is not valid for the given direction' });
    }
    if (!validateVehicleColor(body.vehicleColor)) return reply.code(400).send({ ok: false, error: 'invalid vehicleColor' });
    if (body.vehicleType !== undefined && !validateVehicleType(body.vehicleType)) {
      return reply.code(400).send({ ok: false, error: `invalid vehicleType — must be one of ${VEHICLE_TYPES.join(', ')}` });
    }
    if (!validateGateConfig(body.gateConfig)) return reply.code(400).send({ ok: false, error: 'invalid gateConfig' });
    if (!validateQueueConfig(body.queueConfig)) return reply.code(400).send({ ok: false, error: 'invalid queueConfig' });
    if (body.speedPreset !== undefined && !validateSpeedPreset(body.speedPreset)) {
      return reply.code(400).send({ ok: false, error: `invalid speedPreset — must be one of ${REQUEST_SPEED_PRESETS.join(', ')}` });
    }

    const command = commandService.createCommand('run_plate', {
      plate: plateResult.normalized,
      direction: body.direction,
      detectorPlacement: body.detectorPlacement,
      vehicleColor: body.vehicleColor,
      vehicleType: body.vehicleType ?? DEFAULT_REQUEST_VEHICLE_TYPE,
      gateConfig: body.gateConfig,
      queueConfig: body.queueConfig,
      speedPreset: body.speedPreset ?? DEFAULT_REQUEST_SPEED_PRESET,
    }, request.ip, { source: 'local_api' });

    return reply.send({ ok: true, commandId: command.id, status: command.status });
  });

  fastify.post('/simulate/queue', async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;

    const platesResult = validatePlates(body.plates);
    if (!platesResult.ok) return reply.code(400).send({ ok: false, error: platesResult.error });
    if (!validateDirection(body.direction)) return reply.code(400).send({ ok: false, error: 'invalid direction' });
    if (!validateDetectorPlacement(body.detectorPlacement)) return reply.code(400).send({ ok: false, error: 'invalid detectorPlacement' });
    if (!isPlacementAllowedForDirection(body.direction, body.detectorPlacement)) {
      return reply.code(400).send({ ok: false, error: 'detectorPlacement is not valid for the given direction' });
    }
    if (!validateVehicleColor(body.vehicleColor)) return reply.code(400).send({ ok: false, error: 'invalid vehicleColor' });
    if (body.vehicleType !== undefined && !validateVehicleType(body.vehicleType)) {
      return reply.code(400).send({ ok: false, error: `invalid vehicleType — must be one of ${VEHICLE_TYPES.join(', ')}` });
    }
    if (!validateGateConfig(body.gateConfig)) return reply.code(400).send({ ok: false, error: 'invalid gateConfig' });
    if (!validateQueueConfig(body.queueConfig)) return reply.code(400).send({ ok: false, error: 'invalid queueConfig' });
    if (body.speedPreset !== undefined && !validateSpeedPreset(body.speedPreset)) {
      return reply.code(400).send({ ok: false, error: `invalid speedPreset — must be one of ${REQUEST_SPEED_PRESETS.join(', ')}` });
    }

    const command = commandService.createCommand('run_queue', {
      plates: platesResult.plates,
      direction: body.direction,
      detectorPlacement: body.detectorPlacement,
      vehicleColor: body.vehicleColor,
      vehicleType: body.vehicleType ?? DEFAULT_REQUEST_VEHICLE_TYPE,
      gateConfig: body.gateConfig,
      queueConfig: body.queueConfig,
      speedPreset: body.speedPreset ?? DEFAULT_REQUEST_SPEED_PRESET,
    }, request.ip, { source: 'local_api' });

    return reply.send({ ok: true, commandId: command.id, status: command.status });
  });
}
