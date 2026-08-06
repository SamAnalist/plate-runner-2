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

function stripSecret(record: { id: string; name: string; status: string; createdAt: string; updatedAt: string; lastSeenAt?: string }): DisplayDevice {
  return {
    id: record.id,
    name: record.name,
    status: record.status as DisplayDevice['status'],
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    lastSeenAt: record.lastSeenAt,
  };
}

export function createDisplayService(repo: RemoteRepo, logger: ServiceLogger) {
  function register(name: unknown): RegisterDisplayResult {
    const nameResult = validateName(name, 'name');
    if (!nameResult.ok) return { ok: false, error: nameResult.error };

    const displaySecret = generateSecureToken();
    const now = new Date().toISOString();
    const record = {
      id: randomUUID(),
      name: nameResult.name,
      secretHash: hashToken(displaySecret),
      status: 'offline' as const,
      createdAt: now,
      updatedAt: now,
    };
    repo.insertDisplay(record);
    logger.info({ displayId: record.id, name: record.name, event: 'display_registered' }, 'display registered');
    return { ok: true, display: stripSecret(record), displaySecret };
  }

  function verifySecret(displayId: string, secret: string | undefined): boolean {
    if (!secret) return false;
    const display = repo.getDisplayById(displayId);
    if (!display) return false;
    return timingSafeEqualStrings(hashToken(secret), display.secretHash);
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

  return { register, verifySecret, heartbeat, getById, listPairings, revokePairing };
}

export type DisplayService = ReturnType<typeof createDisplayService>;
