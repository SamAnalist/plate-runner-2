import { validatePlate } from '@plate-runner/shared';

const MAX_PLATE_LENGTH = 12;
const MAX_ATTEMPTS_PER_PLATE = 20;

export interface RandomPlateOptions {
  count: number;
  digitCount: number;
  prefix?: string;
}

/** A-Z0-9 only, uppercased, truncated — matches the app's plate validation (no hyphens/spaces/symbols). */
function sanitizePrefix(prefix: string | undefined): string {
  return (prefix ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function randomDigits(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) out += Math.floor(Math.random() * 10);
  return out;
}

/** Generates up to `count` unique, valid plates combining a sanitized prefix with random digits. */
export function generateRandomPlates({ count, digitCount, prefix }: RandomPlateOptions): string[] {
  const cleanPrefix = sanitizePrefix(prefix).slice(0, MAX_PLATE_LENGTH - 1);
  const clampedDigitCount = Math.min(Math.max(digitCount, 1), MAX_PLATE_LENGTH - cleanPrefix.length);
  const seen = new Set<string>();
  const plates: string[] = [];

  for (let i = 0; i < count && plates.length < count; i++) {
    let candidate: string | null = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_PLATE; attempt++) {
      const tryPlate = `${cleanPrefix}${randomDigits(clampedDigitCount)}`;
      if (seen.has(tryPlate)) continue;
      if (!validatePlate(tryPlate).valid) continue;
      candidate = tryPlate;
      break;
    }
    if (candidate) {
      seen.add(candidate);
      plates.push(candidate);
    }
  }

  return plates;
}
