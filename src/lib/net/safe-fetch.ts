// SSRF-hardened HTTP client.
//  * Every hop is resolved once, all addresses must be public, and the connection is
//    pinned to the vetted IP (closes the DNS-rebinding TOCTOU gap of the v1 backend).
//  * Redirects are followed manually so each Location is re-validated.
//  * Bodies are size-capped and every request is time-boxed.
import dns from "node:dns/promises";
import net from "node:net";
import { Agent, request } from "undici";

const BLOCKED = new net.BlockList();
for (const [addr, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
  ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) BLOCKED.addSubnet(addr, prefix, "ipv4");
for (const [addr, prefix] of [
  ["::", 128], ["::1", 128], ["100::", 64], ["2001::", 23], ["2001:db8::", 32],
  ["fc00::", 7], ["fe80::", 10], ["ff00::", 8],
] as const) BLOCKED.addSubnet(addr, prefix, "ipv6");

export function isPublicIp(ip: string): boolean {
  const family = net.isIP(ip);
  if (!family) return false;
  if (family === 6) {
    // IPv4-mapped / NAT64 addresses must be judged by their embedded IPv4 address.
    const embedded = ip.match(/^(?:::ffff:|64:ff9b::)(\d+\.\d+\.\d+\.\d+)$/i)?.[1];
    if (embedded) return isPublicIp(embedded);
    if (/^(::ffff:|64:ff9b::)/i.test(ip)) return false;
  }
  return !BLOCKED.check(ip, family === 4 ? "ipv4" : "ipv6");
}

export class BlockedTargetError extends Error {}

export async function resolvePublic(hostname: string): Promise<{ address: string; family: 4 | 6; all: string[] }> {
  const literal = net.isIP(hostname);
  const records = literal
    ? [{ address: hostname, family: literal as 4 | 6 }]
    : ((await dns.lookup(hostname, { all: true, verbatim: true })) as { address: string; family: 4 | 6 }[]);
  if (!records.length) throw new BlockedTargetError("no_address");
  const bad = records.find((r) => !isPublicIp(r.address));
  if (bad) throw new BlockedTargetError(`non_public_address:${bad.address}`);
  const v4 = records.find((r) => r.family === 4) ?? records[0];
  return { address: v4.address, family: v4.family, all: records.map((r) => r.address) };
}

function pinnedAgent(address: string, family: 4 | 6) {
  return new Agent({
    connect: {
      timeout: 4000,
      rejectUnauthorized: false, // we inspect broken TLS instead of refusing it; certificate state is reported separately
      lookup: (_host: string, opts: { all?: boolean }, cb: (...args: unknown[]) => void) =>
        opts?.all ? cb(null, [{ address, family }]) : cb(null, address, family),
    } as never,
    headersTimeout: 6000,
    bodyTimeout: 6000,
  });
}

export const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

export interface Hop {
  url: string;
  status: number;
  ip: string;
  location?: string;
}

export interface FetchResult {
  ok: boolean;
  finalUrl: string;
  status: number | null;
  hops: Hop[];
  headers: Record<string, string>;
  body: string;
  truncated: boolean;
  contentType: string;
  error?: string;
  ip?: string;
}

const MAX_BYTES = 1_500_000;
const MAX_HOPS = 6;

export async function safeFetch(startUrl: string, { timeoutMs = 9000 } = {}): Promise<FetchResult> {
  const deadline = AbortSignal.timeout(timeoutMs);
  const hops: Hop[] = [];
  let url = startUrl;

  for (let i = 0; i <= MAX_HOPS; i++) {
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      return fail(url, hops, "bad_redirect_url");
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") return fail(url, hops, `redirect_to_${u.protocol}`);
    if (u.port && !["80", "443", "8080", "8443"].includes(u.port)) return fail(url, hops, "port_not_allowed");

    let pinned;
    try {
      pinned = await resolvePublic(u.hostname.replace(/^\[|\]$/g, ""));
    } catch (e) {
      return fail(url, hops, e instanceof BlockedTargetError ? e.message : "dns_failed");
    }

    const dispatcher = pinnedAgent(pinned.address, pinned.family);
    try {
      const res = await request(url, {
        method: "GET",
        dispatcher,
        signal: deadline,
        headers: {
          "user-agent": BROWSER_UA,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-language": "en-US,en;q=0.9,de;q=0.8",
        },
      });
      const headers = Object.fromEntries(
        Object.entries(res.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : String(v ?? "")]),
      );
      const location = headers["location"];
      hops.push({ url, status: res.statusCode, ip: pinned.address, location });

      if (res.statusCode >= 300 && res.statusCode < 400 && location) {
        await res.body.dump();
        url = new URL(location, url).href;
        continue;
      }

      const contentType = headers["content-type"] ?? "";
      let size = 0;
      let truncated = false;
      const chunks: Buffer[] = [];
      for await (const chunk of res.body) {
        size += chunk.length;
        if (size > MAX_BYTES) {
          truncated = true;
          break;
        }
        chunks.push(chunk as Buffer);
      }
      if (truncated) res.body.destroy();
      return {
        ok: true,
        finalUrl: url,
        status: res.statusCode,
        hops,
        headers,
        body: /text|html|xml|json|javascript/i.test(contentType) || !contentType ? Buffer.concat(chunks).toString("utf8") : "",
        truncated,
        contentType,
        ip: pinned.address,
      };
    } catch (e) {
      const msg = e instanceof Error ? (e.name === "TimeoutError" || e.name === "AbortError" ? "timeout" : e.message) : "fetch_failed";
      return fail(url, hops, msg);
    } finally {
      dispatcher.close().catch(() => {});
    }
  }
  return fail(url, hops, "too_many_redirects");
}

function fail(url: string, hops: Hop[], error: string): FetchResult {
  return { ok: false, finalUrl: url, status: null, hops, headers: {}, body: "", truncated: false, contentType: "", error };
}

/** Small JSON GET helper for third-party APIs (trusted hosts, still time-boxed). */
export async function getJson<T>(url: string, init: RequestInit = {}, timeoutMs = 5000): Promise<T | null> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
