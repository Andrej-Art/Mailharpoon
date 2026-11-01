// Minimal DNS-over-HTTPS client (RFC 8484, wire format) for A-record lookups.
// Used to compare Quad9's filtering resolver with its unfiltered twin: a domain that
// resolves unfiltered but returns NXDOMAIN on the filtering resolver is on Quad9's blocklist.
// Quad9 only speaks HTTP/2 for DoH (HTTP/1.1 gets "505"), so requests go through an
// undici agent with HTTP/2 enabled instead of the global fetch.
import { Agent, request } from "undici";

export type DohResult = { rcode: number; answers: number } | null;

/** Encode a DNS query for `name` (type A, class IN) as described in RFC 1035 §4.1. */
export function encodeQuery(name: string): Uint8Array {
  const labels = name.replace(/\.$/, "").split(".");
  const qname: number[] = [];
  for (const label of labels) {
    const bytes = new TextEncoder().encode(label);
    if (bytes.length === 0 || bytes.length > 63) throw new Error("invalid_label");
    qname.push(bytes.length, ...bytes);
  }
  qname.push(0);
  // Header: ID 0 (recommended for DoH caching), flags RD=1, QDCOUNT=1.
  const header = [0x00, 0x00, 0x01, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
  return new Uint8Array([...header, ...qname, 0x00, 0x01, 0x00, 0x01]);
}

/** Read RCODE and ANCOUNT from a DNS response header. */
export function decodeHeader(buf: Uint8Array): { rcode: number; answers: number } {
  if (buf.length < 12) throw new Error("short_response");
  return { rcode: buf[3] & 0x0f, answers: (buf[6] << 8) | buf[7] };
}

const b64url = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const h2 = new Agent({ allowH2: true, connect: { timeout: 3000 } });

export async function dohQuery(endpoint: string, name: string, timeoutMs = 3000): Promise<DohResult> {
  try {
    const res = await request(`${endpoint}?dns=${b64url(encodeQuery(name))}`, {
      headers: { accept: "application/dns-message" },
      dispatcher: h2,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.statusCode !== 200) {
      await res.body.dump();
      return null;
    }
    return decodeHeader(new Uint8Array(await res.body.arrayBuffer()));
  } catch {
    return null;
  }
}

export const RCODE_NXDOMAIN = 3;
export const QUAD9_FILTERED = "https://dns.quad9.net/dns-query";
export const QUAD9_UNFILTERED = "https://dns10.quad9.net/dns-query";

/**
 * "blocked": Quad9 refuses the name although it exists. "clean": both resolvers agree.
 * "unknown": a lookup failed or the name does not exist at all.
 */
export async function quad9Verdict(name: string): Promise<"blocked" | "clean" | "unknown"> {
  const [filtered, unfiltered] = await Promise.all([dohQuery(QUAD9_FILTERED, name), dohQuery(QUAD9_UNFILTERED, name)]);
  if (!filtered || !unfiltered) return "unknown";
  if (unfiltered.rcode !== 0 || unfiltered.answers === 0) return "unknown";
  return filtered.rcode === RCODE_NXDOMAIN ? "blocked" : "clean";
}
