import type { ValidationResult } from '../types/simulation';

const PLATE_REGEX = /^[A-Z0-9]+$/;
const MAX_LENGTH = 12;

export function validatePlate(input: string): ValidationResult {
  if (!input || input.trim().length === 0) {
    return { valid: false, error: 'Plate cannot be empty' };
  }

  const normalized = input.trim().toUpperCase();

  if (normalized.length > MAX_LENGTH) {
    return {
      valid: false,
      error: `Plate cannot exceed ${MAX_LENGTH} characters (got ${normalized.length})`,
    };
  }

  if (!PLATE_REGEX.test(normalized)) {
    return {
      valid: false,
      error: 'Only A–Z and 0–9 are allowed',
    };
  }

  return { valid: true, normalized };
}
