import type { FastifyInstance } from 'fastify';
import type { ListService } from '../services/listService';
import type { CommandService } from '../services/commandService';

export async function registerListsRoutes(fastify: FastifyInstance, listService: ListService, commandService: CommandService): Promise<void> {
  fastify.get('/lists', async () => ({ ok: true, lists: listService.listAll() }));

  fastify.post('/lists', async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const result = listService.create(body);
    if (!result.ok) return reply.code(400).send({ ok: false, error: result.error });
    return reply.code(201).send({ ok: true, list: result.list });
  });

  fastify.get('/lists/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const list = listService.getById(id);
    if (!list) return reply.code(404).send({ ok: false, error: 'not_found' });
    return reply.send({ ok: true, list });
  });

  fastify.put('/lists/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as Record<string, unknown>;
    const result = listService.update(id, body);
    if (!result.ok) return reply.code(result.error === 'not_found' ? 404 : 400).send({ ok: false, error: result.error });
    return reply.send({ ok: true, list: result.list });
  });

  fastify.delete('/lists/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = listService.delete(id);
    if (!deleted) return reply.code(404).send({ ok: false, error: 'not_found' });
    return reply.send({ ok: true });
  });

  /** Creates a run_list command with a full PlateList snapshot embedded — avoids a race against the list changing/being deleted before the frontend claims it. */
  fastify.post('/lists/:id/run', async (request, reply) => {
    const { id } = request.params as { id: string };
    const list = listService.getById(id);
    if (!list) return reply.code(404).send({ ok: false, error: 'not_found' });
    const command = commandService.createCommand('run_list', { listId: id, list }, request.ip);
    return reply.send({ ok: true, commandId: command.id, status: command.status });
  });
}
