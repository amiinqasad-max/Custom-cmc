import "server-only";

/**
 * Best-effort in-memory rate limiter for /api/track/*. Per-instance only
 * (resets on redeploy, not shared across serverless instances) — a
 * pragmatic default that stops a single runaway client without adding an
 * external dependency (Redis/Upstash) as a hard requirement. Swap in a
 * shared store (Upstash Redis, etc.) behind this same function signature if
 * you deploy across many instances and need a global limit.
 */
const buckets = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 120;

export async function checkRateLimit(key: string, limitPerMinute = DEFAULT_LIMIT): Promise<boolean> {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return true;
  }

  bucket.count += 1;
  if (bucket.count > limitPerMinute) return false;
  return true;
}

// Periodically drop stale buckets so this doesn't grow unbounded on a
// long-lived server process.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now - bucket.windowStart > WINDOW_MS * 5) buckets.delete(key);
    }
  }, WINDOW_MS * 5).unref?.();
}
