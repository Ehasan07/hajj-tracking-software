import "server-only";

/**
 * Fixed-window limiter kept in memory. Enough for one web instance; when the
 * app runs on several, this moves to Redis (REDIS_URL is already configured).
 */
const windows = new Map<string, { start: number; count: number }>();

export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = windows.get(key);
  if (!entry || now - entry.start > windowMs) {
    windows.set(key, { start: now, count: 1 });
    if (windows.size > 10_000) {
      for (const [k, v] of windows) if (now - v.start > windowMs) windows.delete(k);
    }
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}
