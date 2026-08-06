import type { FastifyReply, FastifyRequest } from 'fastify';
import type { RemoteRepo, DevicePairingRecord } from '../storage/remoteRepo';
import { hashToken } from './tokens';

declare module 'fastify' {
  interface FastifyRequest {
    pairing?: DevicePairingRecord;
  }
}

/**
 * Checks x-controller-token (or Authorization: Bearer) against a hashed
 * device_pairings row. 401 if the token doesn't match any non-revoked
 * pairing, or a distinct 401 { error: 'token_expired' } if it matches but
 * has passed its optional expiresAt (PLATE_RUNNER_PAIRING_TOKEN_TTL_DAYS —
 * undefined/null means the token never expires). If the route has a
 * :displayId param, additionally 403s when the token's pairing is for a
 * *different* display — this is the literal "a controller can only control
 * displays it's paired with" rule. Attaches the resolved pairing to
 * request.pairing and bumps lastUsedAt.
 */
export function createControllerAuth(repo: RemoteRepo) {
  return async function controllerAuth(request: FastifyRequest, reply: FastifyReply) {
    const headerToken = request.headers['x-controller-token'];
    const authHeader = request.headers.authorization;
    const bearerToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : undefined;
    const providedToken = (typeof headerToken === 'string' ? headerToken : undefined) ?? bearerToken;

    if (!providedToken) return reply.code(401).send({ ok: false, error: 'unauthorized' });

    const pairing = repo.getPairingByTokenHash(hashToken(providedToken));
    if (!pairing || pairing.revokedAt) {
      return reply.code(401).send({ ok: false, error: 'unauthorized' });
    }
    if (pairing.expiresAt && new Date(pairing.expiresAt).getTime() <= Date.now()) {
      return reply.code(401).send({ ok: false, error: 'token_expired' });
    }

    const { displayId } = request.params as { displayId?: string };
    if (displayId && pairing.displayId !== displayId) {
      return reply.code(403).send({ ok: false, error: 'this controller is not paired with that display' });
    }

    repo.touchPairingLastUsed(pairing.id, new Date().toISOString());
    request.pairing = pairing;
  };
}
