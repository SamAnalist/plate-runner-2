import type { FastifyInstance } from 'fastify';
import type { StatusService } from '../services/statusService';

export async function registerStatusRoute(fastify: FastifyInstance, statusService: StatusService): Promise<void> {
  fastify.get('/status', async () => statusService.getStatus());
}
