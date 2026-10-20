import "server-only";

/**
 * Fixed-window limiter kept in memory. Enough for one web instance; when the
 * app runs on several, this moves to Redis (REDIS_URL is already configured).
 * Each entry keeps its own window, so clearing out old entries never resets a
 * longer limit early, and the clean-up runs at most once a minute.
 */
const windows = new Map<string, { start: number; count: number; windowMs: number }>();
let lastSweep = 0;

export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (windows.size > 10_000 && now - lastSweep > 60_000) {
    lastSweep = now;
    for (const [k, v] of windows) if (now - v.start > v.windowMs) windows.delete(k);
  }
  const entry = windows.get(key);
  if (!entry || now - entry.start > entry.windowMs) {
    windows.set(key, { start: now, count: 1, windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}
