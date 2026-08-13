import { validatePlate } from '@plate-runner/shared';

const MAX_PLATE_LENGTH = 12;
const MAX_ATTEMPTS_PER_PLATE = 20;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export interface RandomPlateOptions {
  count: number;
  /** Total length of the randomized segment (after the prefix, if any). */
  length: number;
  /** How many of `length` characters should be random uppercase letters — the rest are random digits, positions shuffled together. */
  letterCount: number;
  prefix?: string;
}

/** A-Z0-9 only, uppercased, truncated — matches the app's plate validation (no hyphens/spaces/symbols). */
function sanitizePrefix(prefix: string | undefined): string {
  return (prefix ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function randomLetter(): string {
  return LETTERS[Math.floor(Math.random() * LETTERS.length)];
}

function randomDigit(): string {
  return String(Math.floor(Math.random() * 10));
}

function shuffled<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Builds one random segment: `letterCount` uppercase letters + the rest digits, shuffled together (not grouped by type). */
function randomSegment(length: number, letterCount: number): string {
  const chars = [
    ...Array.from({ length: letterCount }, randomLetter),
    ...Array.from({ length: length - letterCount }, randomDigit),
  ];
  return shuffled(chars).join('');
}

/** Generates up to `count` unique, valid plates combining a sanitized prefix with a random alphanumeric segment. */
export function generateRandomPlates({ count, length, letterCount, prefix }: RandomPlateOptions): string[] {
  const cleanPrefix = sanitizePrefix(prefix).slice(0, MAX_PLATE_LENGTH - 1);
  const clampedLength = Math.min(Math.max(length, 1), MAX_PLATE_LENGTH - cleanPrefix.length);
  const clampedLetterCount = Math.min(Math.max(letterCount, 0), clampedLength);
  const seen = new Set<string>();
  const plates: string[] = [];

  for (let i = 0; i < count && plates.length < count; i++) {
    let candidate: string | null = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_PLATE; attempt++) {
      const tryPlate = `${cleanPrefix}${randomSegment(clampedLength, clampedLetterCount)}`;
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
