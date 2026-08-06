import type { FastifyInstance } from 'fastify';
import { validatePlate, isPlacementAllowedForDirection } from '@plate-runner/shared';
import type { CommandService } from '../services/commandService';
import {
  validateDirection,
  validateDetectorPlacement,
  validateVehicleColor,
  validateGateConfig,
  validateQueueConfig,
  validatePlates,
} from '../services/validation';

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
    if (!validateGateConfig(body.gateConfig)) return reply.code(400).send({ ok: false, error: 'invalid gateConfig' });
    if (!validateQueueConfig(body.queueConfig)) return reply.code(400).send({ ok: false, error: 'invalid queueConfig' });

    const command = commandService.createCommand('run_plate', {
      plate: plateResult.normalized,
      direction: body.direction,
      detectorPlacement: body.detectorPlacement,
      vehicleColor: body.vehicleColor,
      gateConfig: body.gateConfig,
      queueConfig: body.queueConfig,
    }, request.ip);

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
    if (!validateGateConfig(body.gateConfig)) return reply.code(400).send({ ok: false, error: 'invalid gateConfig' });
    if (!validateQueueConfig(body.queueConfig)) return reply.code(400).send({ ok: false, error: 'invalid queueConfig' });

    const command = commandService.createCommand('run_queue', {
      plates: platesResult.plates,
      direction: body.direction,
      detectorPlacement: body.detectorPlacement,
      vehicleColor: body.vehicleColor,
      gateConfig: body.gateConfig,
      queueConfig: body.queueConfig,
    }, request.ip);

    return reply.send({ ok: true, commandId: command.id, status: command.status });
  });
}
