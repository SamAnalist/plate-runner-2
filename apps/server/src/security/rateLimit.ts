import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

/**
 * Basic, best-effort per-IP rate limiting — not hardened, just enough to
 * stop accidental local spam (e.g. a misbehaving script in a tight loop).
 * See docs/SECURITY_NOTES.md.
 */
export async function registerRateLimit(fastify: FastifyInstance): Promise<void> {
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });
}
