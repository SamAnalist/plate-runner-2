import { timingSafeEqual } from 'node:crypto';

/**
 * Constant-time string comparison for secrets (API key, hashed-secret
 * comparisons). A length mismatch short-circuits (an accepted, standard
 * tradeoff — length isn't the secret), otherwise compares byte-for-byte via
 * crypto.timingSafeEqual so a mismatch position never leaks through timing.
 */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
