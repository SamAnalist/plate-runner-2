import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { SIMULATION_COMMAND_STATUSES, type SimulationCommandStatus } from '@plate-runner/shared';
import type { CommandService } from '../services/commandService';

/** GET /api/commands, GET /api/commands/:id, GET /api/history — the commands table doubles as command history; nothing else to sync. */
export async function registerCommandsRoutes(fastify: FastifyInstance, commandService: CommandService): Promise<void> {
  async function listHandler(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as { status?: string; limit?: string };
    if (query.status && !SIMULATION_COMMAND_STATUSES.includes(query.status as SimulationCommandStatus)) {
      return reply.code(400).send({ ok: false, error: `invalid status — must be one of ${SIMULATION_COMMAND_STATUSES.join(', ')}` });
    }
    const limit = query.limit ? Number(query.limit) : undefined;
    const commands = query.status
      ? commandService.listByStatus(query.status as SimulationCommandStatus, limit)
      : commandService.listAll(limit);
    return reply.send({ ok: true, commands });
  }

  fastify.get('/commands', listHandler);
  fastify.get('/history', listHandler);

  fastify.get('/commands/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const command = commandService.getCommand(id);
    if (!command) return reply.code(404).send({ ok: false, error: 'not_found' });
    return reply.send({ ok: true, command });
  });
}
