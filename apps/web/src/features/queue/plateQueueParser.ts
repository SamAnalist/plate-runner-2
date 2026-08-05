import { validatePlate } from '@plate-runner/shared';

export interface PlateQueueParseResult {
  valid: string[];
  invalid: Array<{ raw: string; reason: string }>;
  total: number;
}

/**
 * Splits pasted text into individual plate tokens on any run of comma,
 * space, tab, or newline, then validates each token with the shared
 * plate validator. Duplicates are kept (not deduped).
 */
export function parsePlateQueueInput(input: string): PlateQueueParseResult {
  const tokens = input
    .split(/[,\s]+/)
    .map(t => t.trim())
    .filter(Boolean);

  const valid: string[] = [];
  const invalid: Array<{ raw: string; reason: string }> = [];

  for (const raw of tokens) {
    const result = validatePlate(raw);
    if (result.valid && result.normalized) {
      valid.push(result.normalized);
    } else {
      invalid.push({ raw, reason: result.error ?? 'Invalid plate' });
    }
  }

  return { valid, invalid, total: tokens.length };
}
