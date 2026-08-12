/**
 * Pure sanitizers applied to every incoming tracking payload before it
 * touches the database (§42). No trust is placed in client-sent booleans
 * like "completed" — only raw measurements go through these clamps, and
 * completion is always recomputed server-side from the clamped values.
 */

export function clampPercent(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** Watched/scroll seconds can never be negative and can't meaningfully exceed the video's own duration (+5% tolerance for timing jitter). */
export function clampWatchedSeconds(value: unknown, durationSeconds: number | null): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  const cap = durationSeconds && durationSeconds > 0 ? durationSeconds * 1.05 : Number.POSITIVE_INFINITY;
  return Math.min(n, cap);
}

/**
 * Cumulative time-spent must never regress and can't jump by more than
 * `maxDeltaSeconds` in a single update — defeats a spoofed heartbeat that
 * claims hours of reading time in one request.
 */
export function clampTimeSpent(previousSeconds: number, incomingSeconds: unknown, maxDeltaSeconds = 120): number {
  const n = typeof incomingSeconds === "number" ? incomingSeconds : Number(incomingSeconds);
  if (!Number.isFinite(n) || n < 0) return previousSeconds;
  if (n <= previousSeconds) return previousSeconds;
  return Math.min(n, previousSeconds + maxDeltaSeconds);
}

/** Monotonic high-water mark — rewatching or seeking backward never reduces credited progress, but also never inflates it beyond what was actually reachable. */
export function monotonicMax(previous: number, incoming: number): number {
  return Math.max(previous, incoming);
}
