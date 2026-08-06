import { randomUUID } from 'node:crypto';
import type { PairingSession, PairingRequestSummary } from '@plate-runner/shared';
import type { RemoteRepo } from '../storage/remoteRepo';
import { generatePairingCode, generateSecureToken, hashToken } from '../security/tokens';
import { validateName } from './validation';

const CODE_TTL_MS = 5 * 60 * 1000;

interface ServiceLogger {
  info: (obj: Record<string, unknown>, msg?: string) => void;
}

export type RequestCodeResult =
  | { ok: true; session: PairingSession }
  | { ok: false; error: 'display_not_found' };

export type CreateRequestResult =
  | { ok: true; pairingRequestId: string; displayId: string; displayName: string; expiresAt: string }
  | { ok: false; status: 400 | 404 | 410; error: string };

export type RequestStatusResult =
  | { ok: true; status: PairingSession['status']; displayId: string; displayName: string }
  | { ok: false; status: 404; error: 'not_found' };

export type ApprovalActionResult =
  | { ok: true; status: 'approved' | 'rejected' }
  | { ok: false; status: 404 | 409 | 410; error: string };

export type FinalizeResult =
  | { ok: true; controllerId: string; displayId: string; pairingId: string; controllerToken: string }
  | { ok: false; status: 404 | 409; error: string };

const CODE_PATTERN = /^\d{6}$/;
const RESOLVABLE_STATUSES: PairingSession['status'][] = ['pending', 'approval_pending', 'approved'];

export function createPairingService(repo: RemoteRepo, logger: ServiceLogger) {
  /** Lazily expires a session past its expiresAt if it's still in a non-terminal state. Same TTL covers the code AND any approval_pending/approved request built on top of it. */
  function resolveSession(session: PairingSession, now: Date): PairingSession {
    if (RESOLVABLE_STATUSES.includes(session.status) && new Date(session.expiresAt).getTime() <= now.getTime()) {
      const expired: PairingSession = { ...session, status: 'expired' };
      repo.updateSession(expired);
      return expired;
    }
    return session;
  }

  function requestCode(displayId: string): RequestCodeResult {
    const display = repo.getDisplayById(displayId);
    if (!display) return { ok: false, error: 'display_not_found' };

    // Only one pending code per display — requesting a new one cancels/expires the prior one.
    repo.expirePendingForDisplay(displayId);

    const now = new Date();
    const session: PairingSession = {
      id: randomUUID(),
      displayId,
      code: generatePairingCode(),
      status: 'pending',
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + CODE_TTL_MS).toISOString(),
    };
    repo.insertPairingSession(session);
    logger.info({ displayId, pairingSessionId: session.id, event: 'pairing_code_generated' }, 'pairing code generated');
    return { ok: true, session };
  }

  /** Controller claims a code — creates an approval_pending request. No token, no controller device yet. */
  function createPairingRequest(controllerName: unknown, code: unknown): CreateRequestResult {
    const nameResult = validateName(controllerName, 'controllerName');
    if (!nameResult.ok) return { ok: false, status: 400, error: nameResult.error };
    if (typeof code !== 'string' || !CODE_PATTERN.test(code)) {
      return { ok: false, status: 400, error: 'code must be exactly 6 digits' };
    }

    const found = repo.getSessionByCode(code);
    if (!found) return { ok: false, status: 404, error: 'invalid or already-used code' };

    const now = new Date();
    const session = resolveSession(found, now);
    if (session.status === 'expired') return { ok: false, status: 410, error: 'code has expired' };

    const display = repo.getDisplayById(session.displayId);
    if (!display) return { ok: false, status: 404, error: 'display no longer exists' };

    const updated: PairingSession = { ...session, status: 'approval_pending', controllerName: nameResult.name };
    repo.updateSession(updated);
    logger.info({ displayId: session.displayId, pairingRequestId: session.id, event: 'pairing_request_created' }, 'pairing request created');

    return {
      ok: true,
      pairingRequestId: session.id,
      displayId: session.displayId,
      displayName: display.name,
      expiresAt: session.expiresAt,
    };
  }

  /** Controller polling — never returns a token or controllerId; those only exist post-finalize. */
  function getRequestStatus(id: string): RequestStatusResult {
    const found = repo.getSessionById(id);
    if (!found) return { ok: false, status: 404, error: 'not_found' };
    const session = resolveSession(found, new Date());
    const display = repo.getDisplayById(session.displayId);
    if (!display) return { ok: false, status: 404, error: 'not_found' };
    return { ok: true, status: session.status, displayId: session.displayId, displayName: display.name };
  }

  function approveRequest(displayId: string, id: string): ApprovalActionResult {
    const found = repo.getSessionById(id);
    if (!found || found.displayId !== displayId) return { ok: false, status: 404, error: 'not_found' };
    const session = resolveSession(found, new Date());
    if (session.status === 'expired') return { ok: false, status: 410, error: 'request has expired' };
    if (session.status !== 'approval_pending') return { ok: false, status: 409, error: 'not_approval_pending' };

    const updated: PairingSession = { ...session, status: 'approved', approvedAt: new Date().toISOString() };
    repo.updateSession(updated);
    logger.info({ displayId, pairingRequestId: id, event: 'pairing_approved' }, 'pairing request approved');
    return { ok: true, status: 'approved' };
  }

  function rejectRequest(displayId: string, id: string): ApprovalActionResult {
    const found = repo.getSessionById(id);
    if (!found || found.displayId !== displayId) return { ok: false, status: 404, error: 'not_found' };
    const session = resolveSession(found, new Date());
    if (session.status === 'expired') return { ok: false, status: 410, error: 'request has expired' };
    if (session.status !== 'approval_pending') return { ok: false, status: 409, error: 'not_approval_pending' };

    const updated: PairingSession = { ...session, status: 'rejected' };
    repo.updateSession(updated);
    logger.info({ displayId, pairingRequestId: id, event: 'pairing_rejected' }, 'pairing request rejected');
    return { ok: true, status: 'rejected' };
  }

  /** The only place a plaintext controllerToken is ever produced or returned. Second call on the same request 409s. */
  function finalizePairing(id: string): FinalizeResult {
    const found = repo.getSessionById(id);
    if (!found) return { ok: false, status: 404, error: 'not_found' };
    const session = resolveSession(found, new Date());

    if (session.status === 'used') return { ok: false, status: 409, error: 'token_already_issued' };
    if (session.status !== 'approved') return { ok: false, status: 409, error: 'not_approved' };

    const display = repo.getDisplayById(session.displayId);
    if (!display) return { ok: false, status: 404, error: 'not_found' };

    const controllerId = randomUUID();
    const nowIso = new Date().toISOString();
    repo.insertController({ id: controllerId, name: session.controllerName ?? 'Controller', createdAt: nowIso, updatedAt: nowIso });

    const controllerToken = generateSecureToken();
    const pairingId = randomUUID();
    repo.insertDevicePairing({
      id: pairingId,
      displayId: session.displayId,
      controllerId,
      tokenHash: hashToken(controllerToken),
      name: session.controllerName,
      createdAt: nowIso,
    });

    repo.updateSession({ ...session, status: 'used', usedAt: nowIso });
    logger.info({ displayId: session.displayId, controllerId, pairingId, event: 'pairing_finalized' }, 'pairing finalized');

    return { ok: true, controllerId, displayId: session.displayId, pairingId, controllerToken };
  }

  function listPendingRequestsForDisplay(displayId: string): PairingRequestSummary[] {
    const now = new Date();
    return repo.listApprovalPendingForDisplay(displayId)
      .map(session => resolveSession(session, now))
      .filter(session => session.status === 'approval_pending')
      .map(session => ({
        pairingRequestId: session.id,
        controllerName: session.controllerName ?? 'Unknown',
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        status: session.status,
      }));
  }

  return {
    requestCode,
    createPairingRequest,
    getRequestStatus,
    approveRequest,
    rejectRequest,
    finalizePairing,
    listPendingRequestsForDisplay,
  };
}

export type PairingService = ReturnType<typeof createPairingService>;
