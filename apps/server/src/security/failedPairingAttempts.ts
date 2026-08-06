const MAX_FAILURES = 5;
const WINDOW_MS = 5 * 60 * 1000;

/**
 * In-memory sliding-window guard against pairing-code brute force — stacks
 * with (doesn't replace) the route-level @fastify/rate-limit tier already
 * on POST /api/controllers/pair. Resets on server restart; acceptable for
 * a local/LAN threat model, documented as a known limitation.
 */
export function createFailedAttemptsTracker(maxFailures = MAX_FAILURES, windowMs = WINDOW_MS) {
  const failuresByIp = new Map<string, number[]>();

  function prune(ip: string, now: number): number[] {
    const timestamps = (failuresByIp.get(ip) ?? []).filter(t => now - t < windowMs);
    if (timestamps.length > 0) failuresByIp.set(ip, timestamps);
    else failuresByIp.delete(ip);
    return timestamps;
  }

  return {
    isBlocked(ip: string): boolean {
      return prune(ip, Date.now()).length >= maxFailures;
    },
    recordFailure(ip: string): void {
      const now = Date.now();
      const timestamps = prune(ip, now);
      timestamps.push(now);
      failuresByIp.set(ip, timestamps);
    },
  };
}

export type FailedAttemptsTracker = ReturnType<typeof createFailedAttemptsTracker>;
