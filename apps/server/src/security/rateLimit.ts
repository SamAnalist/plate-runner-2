import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

/**
 * Basic, best-effort per-IP rate limiting — not hardened, just enough to
 * stop accidental local spam (e.g. a misbehaving script in a tight loop).
 * Max is configurable via PLATE_RUNNER_RATE_LIMIT_GENERAL_PER_MIN (default
 * 100) — see docs/SECURITY_NOTES.md.
 */
export async function registerRateLimit(fastify: FastifyInstance, maxPerMinute: number): Promise<void> {
  await fastify.register(rateLimit, {
    max: maxPerMinute,
    timeWindow: '1 minute',
  });
}
