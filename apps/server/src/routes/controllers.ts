import type { FastifyInstance } from 'fastify';
import type { PairingService } from '../services/pairingService';

/** POST /api/controllers/pair — exchanges a 6-digit pairing code for a long-lived controller token. Rate-limited tighter than the general API. */
export async function registerControllersRoutes(fastify: FastifyInstance, pairingService: PairingService): Promise<void> {
  fastify.post('/controllers/pair', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const result = pairingService.pairController(body.controllerName, body.code);
    if (!result.ok) return reply.code(result.status).send({ ok: false, error: result.error });
    return reply.send({
      ok: true,
      controllerId: result.controllerId,
      displayId: result.displayId,
      displayName: result.displayName,
      pairingId: result.pairingId,
      controllerToken: result.controllerToken,
    });
  });
}
