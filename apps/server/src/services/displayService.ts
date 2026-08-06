import { randomUUID } from 'node:crypto';
import type { DisplayDevice, DevicePairingSummary } from '@plate-runner/shared';
import type { RemoteRepo } from '../storage/remoteRepo';
import { generateSecureToken, hashToken } from '../security/tokens';
import { timingSafeEqualStrings } from '../security/timingSafeCompare';
import { validateName } from './validation';

interface ServiceLogger {
  info: (obj: Record<string, unknown>, msg?: string) => void;
}

export type RegisterDisplayResult =
  | { ok: true; display: DisplayDevice; displaySecret: string }
  | { ok: false; error: string };

export type RevokePairingResult = { ok: true } | { ok: false; error: 'not_found' };

export type VerifySecretResult =
  | { ok: true }
  | { ok: false; error: 'invalid_display_secret' | 'display_revoked' | 'display_secret_expired' };

export type RotateSecretResult =
  | { ok: true; displaySecret: string; secretExpiresAt: string | null }
  | { ok: false; error: 'not_found' };

export type RevokeDisplayResult = { ok: true } | { ok: false; error: 'not_found' };

function stripSecret(record: {
  id: string; name: string; status: string; createdAt: string; updatedAt: string;
  lastSeenAt?: string; secretLastUsedAt?: string; secretExpiresAt?: string; revokedAt?: string;
}): DisplayDevice {
  return {
    id: record.id,
    name: record.name,
    status: record.status as DisplayDevice['status'],
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    lastSeenAt: record.lastSeenAt,
    secretLastUsedAt: record.secretLastUsedAt,
    secretExpiresAt: record.secretExpiresAt,
    revokedAt: record.revokedAt,
  };
}

function computeSecretExpiresAt(ttlDays: number | null, from: Date): string | null {
  return ttlDays != null ? new Date(from.getTime() + ttlDays * 24 * 60 * 60 * 1000).toISOString() : null;
}

export function createDisplayService(repo: RemoteRepo, logger: ServiceLogger, displaySecretTtlDays: number | null = null) {
  function register(name: unknown): RegisterDisplayResult {
    const nameResult = validateName(name, 'name');
    if (!nameResult.ok) return { ok: false, error: nameResult.error };

    const displaySecret = generateSecureToken();
    const now = new Date();
    const nowIso = now.toISOString();
    const record = {
      id: randomUUID(),
      name: nameResult.name,
      secretHash: hashToken(displaySecret),
      status: 'offline' as const,
      createdAt: nowIso,
      updatedAt: nowIso,
      secretExpiresAt: computeSecretExpiresAt(displaySecretTtlDays, now) ?? undefined,
    };
    repo.insertDisplay(record);
    logger.info({ displayId: record.id, name: record.name, event: 'display_registered' }, 'display registered');
    return { ok: true, display: stripSecret(record), displaySecret };
  }

  /** Discriminated result so callers (displayAuth) can return a specific error
   * code without ever touching or logging the secret itself. */
  function verifySecret(displayId: string, secret: string | undefined): VerifySecretResult {
    if (!secret) return { ok: false, error: 'invalid_display_secret' };
    const display = repo.getDisplayById(displayId);
    if (!display) return { ok: false, error: 'invalid_display_secret' };
    if (!timingSafeEqualStrings(hashToken(secret), display.secretHash)) {
      return { ok: false, error: 'invalid_display_secret' };
    }
    if (display.revokedAt) return { ok: false, error: 'display_revoked' };
    if (display.secretExpiresAt && new Date(display.secretExpiresAt).getTime() <= Date.now()) {
      return { ok: false, error: 'display_secret_expired' };
    }
    return { ok: true };
  }

  function touchSecretLastUsed(displayId: string): void {
    repo.touchDisplaySecretLastUsed(displayId, new Date().toISOString());
  }

  function heartbeat(displayId: string): void {
    repo.touchDisplayHeartbeat(displayId, new Date().toISOString());
  }

  function getById(displayId: string): DisplayDevice | null {
    const display = repo.getDisplayById(displayId);
    return display ? stripSecret(display) : null;
  }

  function listPairings(displayId: string): DevicePairingSummary[] {
    return repo.listPairingsForDisplay(displayId);
  }

  function revokePairing(displayId: string, pairingId: string): RevokePairingResult {
    const pairing = repo.getPairingById(pairingId);
    if (!pairing || pairing.displayId !== displayId) return { ok: false, error: 'not_found' };
    repo.revokePairing(pairingId, new Date().toISOString());
    logger.info({ displayId, pairingId, event: 'pairing_revoked' }, 'pairing revoked');
    return { ok: true };
  }

  /** Old secret stops matching immediately — its hash is simply overwritten. Never returns the secret again after this call. */
  function rotateSecret(displayId: string): RotateSecretResult {
    const display = repo.getDisplayById(displayId);
    if (!display) return { ok: false, error: 'not_found' };

    const newSecret = generateSecureToken();
    const now = new Date();
    const secretExpiresAt = computeSecretExpiresAt(displaySecretTtlDays, now);
    repo.rotateDisplaySecret(displayId, {
      secretHash: hashToken(newSecret),
      updatedAt: now.toISOString(),
      secretExpiresAt,
    });
    logger.info({ displayId, event: 'display_secret_rotated' }, 'display secret rotated');
    return { ok: true, displaySecret: newSecret, secretExpiresAt };
  }

  /** Revokes the display AND cascades: every device_pairings row for it is revoked,
   * and any live (unconsumed) pairing session is cancelled — a revoked display can't
   * authenticate at all anymore, so leaving those live would be an ambiguous dangling state. */
  function revokeDisplay(displayId: string): RevokeDisplayResult {
    const display = repo.getDisplayById(displayId);
    if (!display) return { ok: false, error: 'not_found' };

    const now = new Date().toISOString();
    repo.revokeDisplay(displayId, now);
    repo.revokeAllPairingsForDisplay(displayId, now);
    repo.cancelActivePairingSessionsForDisplay(displayId);
    logger.info({ displayId, event: 'display_revoked' }, 'display revoked');
    return { ok: true };
  }

  return {
    register, verifySecret, touchSecretLastUsed, heartbeat, getById,
    listPairings, revokePairing, rotateSecret, revokeDisplay,
  };
}

export type DisplayService = ReturnType<typeof createDisplayService>;
