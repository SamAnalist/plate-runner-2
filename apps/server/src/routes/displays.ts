import type { FastifyInstance } from 'fastify';
import type { DisplayService } from '../services/displayService';
import type { PairingService } from '../services/pairingService';
import type { CommandService } from '../services/commandService';
import { createDisplayAuth } from '../security/displayAuth';

function statusCodeForClaim(reason: 'not_found' | 'not_pending' | 'not_claimed'): number {
  return reason === 'not_found' ? 404 : 409;
}

/**
 * POST /api/displays/register — API-key only (no displaySecret needed yet,
 * this route is how a display gets one). Everything else here requires
 * both the global API key (applied at the /api scope) and the display's
 * own secret for the :displayId in the URL.
 */
export async function registerDisplaysRoutes(
  fastify: FastifyInstance,
  displayService: DisplayService,
  pairingService: PairingService,
  commandService: CommandService,
  pairingRateLimitPerMinute: number,
): Promise<void> {
  fastify.post('/displays/register', {
    config: { rateLimit: { max: pairingRateLimitPerMinute, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const result = displayService.register(body.name);
    if (!result.ok) return reply.code(400).send({ ok: false, error: result.error });
    return reply.code(201).send({ ok: true, displayId: result.display.id, displaySecret: result.displaySecret });
  });

  await fastify.register(async (scope) => {
    scope.addHook('preHandler', createDisplayAuth(displayService));

    scope.get('/displays/:displayId', async (request, reply) => {
      const { displayId } = request.params as { displayId: string };
      const display = displayService.getById(displayId);
      if (!display) return reply.code(404).send({ ok: false, error: 'not_found' });
      return { ok: true, display };
    });

    scope.post('/displays/:displayId/heartbeat', async (request) => {
      const { displayId } = request.params as { displayId: string };
      displayService.heartbeat(displayId);
      return { ok: true };
    });

    // ── Display Secret Lifecycle Hardening ──────────────────────────────
    scope.post('/displays/:displayId/rotate-secret', async (request, reply) => {
      const { displayId } = request.params as { displayId: string };
      const result = displayService.rotateSecret(displayId);
      if (!result.ok) return reply.code(404).send({ ok: false, error: result.error });
      return reply.send({
        ok: true,
        displayId,
        displaySecret: result.displaySecret,
        secretExpiresAt: result.secretExpiresAt,
      });
    });

    scope.post('/displays/:displayId/revoke', async (request, reply) => {
      const { displayId } = request.params as { displayId: string };
      const result = displayService.revokeDisplay(displayId);
      if (!result.ok) return reply.code(404).send({ ok: false, error: result.error });
      return reply.send({ ok: true });
    });

    scope.post('/displays/:displayId/pairing-code', {
      config: { rateLimit: { max: pairingRateLimitPerMinute, timeWindow: '1 minute' } },
    }, async (request, reply) => {
      const { displayId } = request.params as { displayId: string };
      const result = pairingService.requestCode(displayId);
      if (!result.ok) return reply.code(404).send({ ok: false, error: result.error });
      return reply.send({
        ok: true,
        pairingSessionId: result.session.id,
        code: result.session.code,
        expiresAt: result.session.expiresAt,
      });
    });

    scope.get('/displays/:displayId/pairings', async (request) => {
      const { displayId } = request.params as { displayId: string };
      return { ok: true, pairings: displayService.listPairings(displayId) };
    });

    scope.post('/displays/:displayId/pairings/:pairingId/revoke', async (request, reply) => {
      const { displayId, pairingId } = request.params as { displayId: string; pairingId: string };
      const result = displayService.revokePairing(displayId, pairingId);
      if (!result.ok) return reply.code(404).send({ ok: false, error: result.error });
      return reply.send({ ok: true });
    });

    // ── Manual pairing approval (Macro Phase 5.1) ──────────────────────
    scope.get('/displays/:displayId/pairing-requests', async (request) => {
      const { displayId } = request.params as { displayId: string };
      return { ok: true, requests: pairingService.listPendingRequestsForDisplay(displayId) };
    });

    scope.post('/displays/:displayId/pairing-requests/:id/approve', async (request, reply) => {
      const { displayId, id } = request.params as { displayId: string; id: string };
      const result = pairingService.approveRequest(displayId, id);
      if (!result.ok) return reply.code(result.status).send({ ok: false, error: result.error });
      return reply.send({ ok: true, status: result.status });
    });

    scope.post('/displays/:displayId/pairing-requests/:id/reject', async (request, reply) => {
      const { displayId, id } = request.params as { displayId: string; id: string };
      const result = pairingService.rejectRequest(displayId, id);
      if (!result.ok) return reply.code(result.status).send({ ok: false, error: result.error });
      return reply.send({ ok: true, status: result.status });
    });

    // ── Display's own command listener — scoped to this displayId only ──
    scope.get('/displays/:displayId/commands/pending', async (request) => {
      const { displayId } = request.params as { displayId: string };
      return { ok: true, commands: commandService.listPending(displayId) };
    });

    scope.post('/displays/:displayId/commands/:id/claim', async (request, reply) => {
      const { displayId, id } = request.params as { displayId: string; id: string };
      const existing = commandService.getCommand(id);
      if (!existing) return reply.code(404).send({ ok: false, error: 'not_found' });
      if (existing.displayId !== displayId) return reply.code(403).send({ ok: false, error: 'command belongs to a different display' });
      const result = commandService.claimCommand(id);
      if (!result.ok) return reply.code(statusCodeForClaim(result.reason)).send({ ok: false, error: result.reason });
      return reply.send({ ok: true, command: result.command });
    });

    scope.post('/displays/:displayId/commands/:id/complete', async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = commandService.completeCommand(id);
      if (!result.ok) return reply.code(statusCodeForClaim(result.reason)).send({ ok: false, error: result.reason });
      return reply.send({ ok: true, command: result.command });
    });

    scope.post('/displays/:displayId/commands/:id/fail', async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as Record<string, unknown>;
      const error = typeof body.error === 'string' && body.error.trim() ? body.error.trim() : 'unknown_error';
      const result = commandService.failCommand(id, error);
      if (!result.ok) return reply.code(statusCodeForClaim(result.reason)).send({ ok: false, error: result.reason });
      return reply.send({ ok: true, command: result.command });
    });
  });
}
