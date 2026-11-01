// Sliding-window limiter, per serverless instance. Good enough to stop casual abuse;
// for hard global limits put Vercel Firewall rate-limit rules in front of /api/scan.
const WINDOW_MS = 10 * 60_000;
const MAX = Number(process.env.SCAN_RATE_LIMIT ?? 30);
const hits = new Map<string, number[]>();

export function rateLimit(key: string): { ok: boolean; remaining: number; retryAfter: number } {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX) {
    hits.set(key, recent);
    return { ok: false, remaining: 0, retryAfter: Math.ceil((recent[0] + WINDOW_MS - now) / 1000) };
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  return { ok: true, remaining: MAX - recent.length, retryAfter: 0 };
}
