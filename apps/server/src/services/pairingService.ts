import { randomUUID } from 'node:crypto';
import type { PairingSession } from '@plate-runner/shared';
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

export type PairResult =
  | { ok: true; controllerId: string; displayId: string; displayName: string; pairingId: string; controllerToken: string }
  | { ok: false; status: 400 | 404 | 410; error: string };

const CODE_PATTERN = /^\d{6}$/;

export function createPairingService(repo: RemoteRepo, logger: ServiceLogger) {
  function isExpired(session: PairingSession, now: Date): boolean {
    return new Date(session.expiresAt).getTime() <= now.getTime();
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

  function pairController(controllerName: unknown, code: unknown): PairResult {
    const nameResult = validateName(controllerName, 'controllerName');
    if (!nameResult.ok) return { ok: false, status: 400, error: nameResult.error };
    if (typeof code !== 'string' || !CODE_PATTERN.test(code)) {
      return { ok: false, status: 400, error: 'code must be exactly 6 digits' };
    }

    const session = repo.getSessionByCode(code);
    if (!session) return { ok: false, status: 404, error: 'invalid or already-used code' };

    const now = new Date();
    if (isExpired(session, now)) {
      repo.updateSession({ ...session, status: 'expired' });
      return { ok: false, status: 410, error: 'code has expired' };
    }

    const display = repo.getDisplayById(session.displayId);
    if (!display) return { ok: false, status: 404, error: 'display no longer exists' };

    const controllerId = randomUUID();
    const nowIso = now.toISOString();
    repo.insertController({ id: controllerId, name: nameResult.name, createdAt: nowIso, updatedAt: nowIso });

    const controllerToken = generateSecureToken();
    const pairingId = randomUUID();
    repo.insertDevicePairing({
      id: pairingId,
      displayId: session.displayId,
      controllerId,
      tokenHash: hashToken(controllerToken),
      name: nameResult.name,
      createdAt: nowIso,
    });

    repo.updateSession({ ...session, status: 'used', usedAt: nowIso, approvedAt: nowIso });

    logger.info({ displayId: session.displayId, controllerId, pairingId, event: 'pairing_created' }, 'pairing created');

    return {
      ok: true,
      controllerId,
      displayId: session.displayId,
      displayName: display.name,
      pairingId,
      controllerToken,
    };
  }

  return { requestCode, pairController };
}

export type PairingService = ReturnType<typeof createPairingService>;
