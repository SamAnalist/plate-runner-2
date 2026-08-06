import type { FastifyReply, FastifyRequest } from 'fastify';
import type { DisplayService } from '../services/displayService';

/**
 * Checks x-display-secret (or Authorization: Bearer) against the hashed
 * secret for the :displayId in the route params. Runs in addition to the
 * global API key hook already applied to the whole /api scope — the API
 * key proves "allowed to talk to this backend at all," this proves "is
 * specifically that display." Never logs the secret.
 */
export function createDisplayAuth(displayService: DisplayService) {
  return async function displayAuth(request: FastifyRequest, reply: FastifyReply) {
    const { displayId } = request.params as { displayId?: string };
    if (!displayId) return reply.code(400).send({ ok: false, error: 'missing displayId' });

    const headerSecret = request.headers['x-display-secret'];
    const authHeader = request.headers.authorization;
    const bearerSecret = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : undefined;
    const providedSecret = (typeof headerSecret === 'string' ? headerSecret : undefined) ?? bearerSecret;

    if (!displayService.verifySecret(displayId, providedSecret)) {
      return reply.code(401).send({ ok: false, error: 'unauthorized' });
    }
  };
}
