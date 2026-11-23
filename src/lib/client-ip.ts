// The client IP is used to key the rate limiter and the per-person trends counter, so it must
// come from a hop we trust — never from the raw, caller-supplied part of the request.
//
// A caller can put anything in X-Forwarded-For, and the LEFTMOST entry is exactly the part they
// supply. Keying on it lets one actor pose as countless clients: rotate the header to slip past
// the rate limit (F-2), and produce a fresh `who = sha256(day|ip|token)` each time to inflate the
// trends HyperLogLog people-count (F-3). So we derive the IP as follows:
//
//   1. Prefer `x-real-ip`. On Vercel (and most managed proxies) the platform sets this to the real
//      client address and strips any client-supplied copy, so it cannot be forged.
//   2. Otherwise read `x-forwarded-for` from the RIGHT, skipping the known number of trusted
//      proxies in front of the app (`TRUSTED_PROXY_COUNT`, default 1). Each trusted proxy appends
//      the address it received the request from, so the entry N-from-the-right is what our
//      outermost trusted proxy actually observed — not the caller's forged left value. The index
//      is clamped so a short or forged header can never select a left (caller-supplied) entry.
//   3. Fall back to "anon" when nothing trustworthy is present.
//
// This removes the trivial header-spoof bypass but does NOT replace a platform rate-limit / WAF
// rule (e.g. a Vercel Firewall rule in front of /api/scan) — keep that as defense in depth.
const TRUSTED_PROXY_COUNT = Math.max(1, Number(process.env.TRUSTED_PROXY_COUNT ?? 1));

export function clientIp(req: Request): string {
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length) return parts[Math.max(0, parts.length - TRUSTED_PROXY_COUNT)];
  }
  return "anon";
}
