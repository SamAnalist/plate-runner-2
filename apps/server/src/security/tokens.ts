import { randomInt, randomBytes, createHash } from 'node:crypto';

/** Crypto-secure 6-digit pairing code (zero-padded), e.g. "004821". */
export function generatePairingCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/**
 * 32 random bytes (256 bits) as hex — used for both displaySecret and
 * controllerToken. Returned to the caller exactly once; only the hash is
 * ever persisted (see hashToken).
 */
export function generateSecureToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * SHA-256 is sufficient here (not bcrypt/scrypt): the input is already a
 * uniformly-random 256-bit value, not a low-entropy user password, so a
 * slow KDF buys no additional protection against brute force — the
 * keyspace itself is already infeasible to search.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
