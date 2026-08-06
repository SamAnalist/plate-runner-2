import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Checks x-api-key, falling back to `Authorization: Bearer <key>`. Replies
 * 401 and short-circuits the request on missing/mismatched key. Never logs
 * the provided key — see logging/requestLogger.ts's custom req serializer.
 */
export function createApiKeyAuth(apiKey: string) {
  return async function apiKeyAuth(request: FastifyRequest, reply: FastifyReply) {
    const headerKey = request.headers['x-api-key'];
    const authHeader = request.headers.authorization;
    const bearerKey = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : undefined;
    const providedKey = (typeof headerKey === 'string' ? headerKey : undefined) ?? bearerKey;

    if (!providedKey || providedKey !== apiKey) {
      return reply.code(401).send({ ok: false, error: 'unauthorized' });
    }
  };
}
