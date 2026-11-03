// How often other services currently report a domain: OpenPhish (phishing) and URLhaus
// (malware downloads). Both are public feeds of confirmed dangerous links; counting their
// links per registrable domain shows which campaigns are active right now. The counts flow
// into the "currently circulating" list next to the checks made with Mailharpoon.
import { parseTarget } from "@/lib/analyzers/url";

export interface ExternalCounts {
  /** Reported links per registrable domain, per service. */
  bySource: Record<string, Map<string, number>>;
}

const OPENPHISH_FEED = "https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt";
const URLHAUS_RECENT = "https://urlhaus-api.abuse.ch/v1/urls/recent/limit/1000/";

/** Registrable domain of a link; IP addresses are skipped, they mean nothing to readers. */
export function domainOf(link: string): string | null {
  if (!/^https?:\/\//i.test(link)) return null;
  try {
    const t = parseTarget(link);
    return t.isIp || !t.registrable.includes(".") ? null : t.registrable;
  } catch {
    return null;
  }
}

export function countDomains(links: string[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const l of links) {
    const d = domainOf(l);
    if (d) out.set(d, (out.get(d) ?? 0) + 1);
  }
  return out;
}

async function openPhish(): Promise<string[]> {
  const res = await fetch(OPENPHISH_FEED, { signal: AbortSignal.timeout(8000), next: { revalidate: 1800 } });
  if (!res.ok) return [];
  return (await res.text()).split("\n").map((l) => l.trim()).filter(Boolean);
}

async function urlhaus(): Promise<string[]> {
  const key = process.env.URLHAUS_AUTH_KEY;
  if (!key) return [];
  const res = await fetch(URLHAUS_RECENT, { headers: { "Auth-Key": key }, signal: AbortSignal.timeout(12000), next: { revalidate: 1800 } });
  if (!res.ok) return [];
  const data = (await res.json()) as { urls?: { url: string; url_status: string }[] };
  return (data.urls ?? []).filter((u) => u.url_status === "online").map((u) => u.url);
}

/** Never throws: a failing service simply contributes nothing. */
export async function externalCounts(): Promise<ExternalCounts> {
  const failed = (name: string) => (e: unknown) => {
    console.error(`${name} feed failed`, e instanceof Error ? e.message : e);
    return [];
  };
  const [op, uh] = await Promise.all([openPhish().catch(failed("OpenPhish")), urlhaus().catch(failed("URLhaus"))]);
  return { bySource: { OpenPhish: countDomains(op), URLhaus: countDomains(uh) } };
}
