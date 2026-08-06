import type { FastifyInstance } from 'fastify';
import { SIMULATION_COMMAND_TYPES, type SimulationCommandType } from '@plate-runner/shared';
import type { CommandService } from '../services/commandService';

function statusCodeFor(reason: 'not_found' | 'not_pending' | 'not_claimed'): number {
  return reason === 'not_found' ? 404 : 409;
}

/**
 * Generic command lifecycle API — this is what the frontend's polling
 * listener actually drives: pending -> claim -> execute locally -> complete/fail.
 */
export async function registerSimulationCommandsRoutes(fastify: FastifyInstance, commandService: CommandService): Promise<void> {
  fastify.post('/simulation/commands', async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const type = body.type;
    if (typeof type !== 'string' || !SIMULATION_COMMAND_TYPES.includes(type as SimulationCommandType)) {
      return reply.code(400).send({ ok: false, error: `invalid or missing type — must be one of ${SIMULATION_COMMAND_TYPES.join(', ')}` });
    }
    const command = commandService.createCommand(type as SimulationCommandType, body.payload ?? null, request.ip, { source: 'local_api' });
    return reply.send({ ok: true, commandId: command.id, status: command.status });
  });

  fastify.get('/simulation/commands/pending', async () => {
    return { ok: true, commands: commandService.listPending() };
  });

  fastify.post('/simulation/commands/:id/claim', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = commandService.claimCommand(id);
    if (!result.ok) return reply.code(statusCodeFor(result.reason)).send({ ok: false, error: result.reason });
    return reply.send({ ok: true, command: result.command });
  });

  fastify.post('/simulation/commands/:id/complete', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = commandService.completeCommand(id);
    if (!result.ok) return reply.code(statusCodeFor(result.reason)).send({ ok: false, error: result.reason });
    return reply.send({ ok: true, command: result.command });
  });

  fastify.post('/simulation/commands/:id/fail', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as Record<string, unknown>;
    const error = typeof body.error === 'string' && body.error.trim() ? body.error.trim() : 'unknown_error';
    const result = commandService.failCommand(id, error);
    if (!result.ok) return reply.code(statusCodeFor(result.reason)).send({ ok: false, error: result.reason });
    return reply.send({ ok: true, command: result.command });
  });

  fastify.get('/simulation/commands/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const command = commandService.getCommand(id);
    if (!command) return reply.code(404).send({ ok: false, error: 'not_found' });
    return reply.send({ ok: true, command });
  });
}
