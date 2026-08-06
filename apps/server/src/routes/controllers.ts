import type { FastifyInstance } from 'fastify';
import type { PairingService } from '../services/pairingService';
import type { FailedAttemptsTracker } from '../security/failedPairingAttempts';

/**
 * Controller-side pairing routes — request a pairing (creates an
 * approval_pending request, no token yet), poll its status, and finalize
 * once the display approves (the only place a plaintext controllerToken is
 * ever returned). Rate-limited tighter than the general API; pairing
 * additionally has a failed-attempt guard on top of that (see
 * security/failedPairingAttempts.ts).
 */
export async function registerControllersRoutes(
  fastify: FastifyInstance,
  pairingService: PairingService,
  failedAttempts: FailedAttemptsTracker,
): Promise<void> {
  fastify.post('/controllers/pair', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    if (failedAttempts.isBlocked(request.ip)) {
      return reply.code(429).send({ ok: false, error: 'too_many_failed_attempts' });
    }

    const body = (request.body ?? {}) as Record<string, unknown>;
    const result = pairingService.createPairingRequest(body.controllerName, body.code);
    if (!result.ok) {
      failedAttempts.recordFailure(request.ip);
      request.log.info({ ip: request.ip, reason: result.error, event: 'failed_pairing_attempt' }, 'failed pairing attempt');
      return reply.code(result.status).send({ ok: false, error: result.error });
    }
    return reply.send({
      ok: true,
      pairingRequestId: result.pairingRequestId,
      status: 'approval_pending',
      displayId: result.displayId,
      displayName: result.displayName,
      expiresAt: result.expiresAt,
    });
  });

  fastify.get('/controllers/pairing-requests/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = pairingService.getRequestStatus(id);
    if (!result.ok) return reply.code(result.status).send({ ok: false, error: result.error });
    return reply.send({ ok: true, status: result.status, displayId: result.displayId, displayName: result.displayName });
  });

  fastify.post('/controllers/pairing-requests/:id/finalize', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = pairingService.finalizePairing(id);
    if (!result.ok) return reply.code(result.status).send({ ok: false, error: result.error });
    return reply.send({
      ok: true,
      controllerId: result.controllerId,
      displayId: result.displayId,
      pairingId: result.pairingId,
      controllerToken: result.controllerToken,
    });
  });
}
