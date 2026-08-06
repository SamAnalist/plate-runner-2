import type { FastifyInstance } from 'fastify';
import { validatePlate, isPlacementAllowedForDirection, type SimulationCommandType } from '@plate-runner/shared';
import type { CommandService } from '../services/commandService';
import { createControllerAuth } from '../security/controllerAuth';
import type { RemoteRepo } from '../storage/remoteRepo';
import {
  validateDirection,
  validateDetectorPlacement,
  validateVehicleColor,
  validateGateConfig,
  validateQueueConfig,
  validatePlates,
  validateSetConfigPayload,
} from '../services/validation';

const CONTROL_TYPES: { path: string; type: SimulationCommandType }[] = [
  { path: '/pause', type: 'pause' },
  { path: '/resume', type: 'resume' },
  { path: '/stop', type: 'stop' },
  { path: '/skip-current', type: 'skip_current' },
  { path: '/open-gate', type: 'open_gate' },
];

/**
 * Controller-token-authenticated remote command routes. Every route creates
 * a SimulationCommand scoped to :displayId (source: 'remote_controller') —
 * these routes never execute anything themselves, same principle as the
 * local /api/simulate* routes. controllerAuth already verified the token
 * belongs to a non-revoked pairing for exactly this displayId.
 */
export async function registerRemoteRoutes(
  fastify: FastifyInstance,
  commandService: CommandService,
  remoteRepo: RemoteRepo,
  remoteRateLimitPerMinute: number,
): Promise<void> {
  // Stricter than the general limit — remote command creation is a more sensitive action.
  // Configurable via PLATE_RUNNER_RATE_LIMIT_REMOTE_PER_MIN (default 30).
  const REMOTE_RATE_LIMIT = { config: { rateLimit: { max: remoteRateLimitPerMinute, timeWindow: '1 minute' } } };

  await fastify.register(async (scope) => {
    scope.addHook('preHandler', createControllerAuth(remoteRepo));

    scope.post('/remote/displays/:displayId/simulate', REMOTE_RATE_LIMIT, async (request, reply) => {
      const { displayId } = request.params as { displayId: string };
      const body = (request.body ?? {}) as Record<string, unknown>;

      const plateResult = validatePlate(typeof body.plate === 'string' ? body.plate : '');
      if (!plateResult.valid || !plateResult.normalized) return reply.code(400).send({ ok: false, error: plateResult.error ?? 'invalid plate' });
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
      }, request.ip, { displayId, source: 'remote_controller', createdByControllerId: request.pairing!.controllerId });

      request.log.info({ displayId, controllerId: request.pairing!.controllerId, type: 'run_plate', event: 'remote_command_sent' }, 'remote command sent');
      return reply.send({ ok: true, commandId: command.id, status: command.status });
    });

    scope.post('/remote/displays/:displayId/simulate/queue', REMOTE_RATE_LIMIT, async (request, reply) => {
      const { displayId } = request.params as { displayId: string };
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
      }, request.ip, { displayId, source: 'remote_controller', createdByControllerId: request.pairing!.controllerId });

      request.log.info({ displayId, controllerId: request.pairing!.controllerId, type: 'run_queue', event: 'remote_command_sent' }, 'remote command sent');
      return reply.send({ ok: true, commandId: command.id, status: command.status });
    });

    scope.post('/remote/displays/:displayId/set-config', REMOTE_RATE_LIMIT, async (request, reply) => {
      const { displayId } = request.params as { displayId: string };
      const body = (request.body ?? {}) as Record<string, unknown>;
      const result = validateSetConfigPayload(body);
      if (!result.ok) return reply.code(400).send({ ok: false, error: result.error });

      const command = commandService.createCommand('set_config', result.payload, request.ip, {
        displayId, source: 'remote_controller', createdByControllerId: request.pairing!.controllerId,
      });
      request.log.info({ displayId, controllerId: request.pairing!.controllerId, type: 'set_config', event: 'remote_command_sent' }, 'remote command sent');
      return reply.send({ ok: true, commandId: command.id, status: command.status });
    });

    for (const { path, type } of CONTROL_TYPES) {
      scope.post(`/remote/displays/:displayId${path}`, REMOTE_RATE_LIMIT, async (request, reply) => {
        const { displayId } = request.params as { displayId: string };
        const command = commandService.createCommand(type, {}, request.ip, {
          displayId, source: 'remote_controller', createdByControllerId: request.pairing!.controllerId,
        });
        request.log.info({ displayId, controllerId: request.pairing!.controllerId, type, event: 'remote_command_sent' }, 'remote command sent');
        return reply.send({ ok: true, commandId: command.id });
      });
    }
  });
}
