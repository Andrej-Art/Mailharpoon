// Counts which dangerous domains and impersonated brands people check most, for the
// "currently circulating" list. Privacy by design: only the registrable domain of a link
// rated dangerous is kept, never the full link or the message, and requesters are counted
// with HyperLogLog over a salted daily hash, so no IP address ever reaches the database.
// Storage is Upstash Redis via its REST API (Vercel Marketplace), without an extra package.
import { createHash } from "node:crypto";
import type { Report } from "@/lib/scan";
import { trancoRank } from "@/lib/analyzers/reputation";
import { parseTarget } from "@/lib/analyzers/url";
import type { ExternalCounts } from "./external";

const DAYS_KEPT = 9;
const TTL = DAYS_KEPT * 86_400;

// The Vercel integration names the variables KV_REST_API_URL by default, or with a custom
// prefix (MY_KV_REST_API_URL); Upstash itself uses UPSTASH_REDIS_REST_URL.
function config() {
  const env = process.env;
  for (const [u, t] of [["KV_REST_API_URL", "KV_REST_API_TOKEN"], ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]]) {
    const key = Object.keys(env).find((k) => (k === u || k.endsWith(`_${u}`)) && env[k] && env[k.slice(0, -u.length) + t]);
    if (key) return { url: env[key]!.replace(/\/$/, ""), token: env[key.slice(0, -u.length) + t]! };
  }
  return null;
}

export const trendsEnabled = () => config() !== null;

type Cmd = (string | number)[];

async function pipeline(cmds: Cmd[]): Promise<unknown[]> {
  const c = config();
  if (!c || !cmds.length) return [];
  const res = await fetch(`${c.url}/pipeline`, {
    method: "POST",
    headers: { authorization: `Bearer ${c.token}`, "content-type": "application/json" },
    body: JSON.stringify(cmds),
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  const out = (await res.json()) as { result?: unknown; error?: string }[];
  return out.map((r) => r.result);
}

const dayKey = (t: number) => new Date(t).toISOString().slice(0, 10);
const brandKey = (b: string) => b.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export interface Sighting {
  domain: string;
  brand: string | null;
}

// Big, established sites are never listed, even when a scan of one of their pages went wrong.
// Shared file hosts hold the files of countless unrelated users, so they say nothing either.
const SHARED_HOSTS = /\.githubusercontent\.com$/;
const listable = (domain: string) => {
  const rank = trancoRank(domain);
  return Boolean(domain) && !SHARED_HOSTS.test(domain) && (rank === null || rank > 10_000);
};

/** Dangerous domains and claimed brands from a finished scan. */
export function sightings(report: Report): Sighting[] {
  const layer = (name: string) => report.layers.find((l) => l.layer === name)?.data as Record<string, unknown> | undefined;
  const aiBrand = (layer("ai")?.impersonated_brand as string | null | undefined) ?? null;
  const visual = layer("visual");
  const brand = aiBrand || (visual?.outcome === "mismatch" ? (visual.brand as string) : null) || null;
  const out: Sighting[] = [];
  if (report.mode === "url" && report.target && report.result.verdict === "dangerous") out.push({ domain: report.target.registrable, brand });
  for (const l of report.links ?? []) if (l.verdict === "dangerous") out.push({ domain: l.domain, brand });
  const seen = new Set<string>();
  return out.filter((s) => listable(s.domain) && !seen.has(s.domain) && seen.add(s.domain));
}

/** Records a scan. Never throws: counting must not break a scan. */
export async function recordScan(report: Report, ip: string, now = Date.now()): Promise<void> {
  const c = config();
  const found = sightings(report);
  if (!c || !found.length) return;
  const day = dayKey(now);
  // The token is the salt, so the hash cannot be recomputed from a list of IP addresses.
  const who = createHash("sha256").update(`${day}|${ip}|${c.token}`).digest("hex").slice(0, 20);
  const cmds: Cmd[] = [];
  for (const s of found) {
    cmds.push(["PFADD", `tr:${day}:r:${s.domain}`, who], ["EXPIRE", `tr:${day}:r:${s.domain}`, TTL]);
    cmds.push(["ZINCRBY", `tr:${day}:d`, 1, s.domain], ["EXPIRE", `tr:${day}:d`, TTL]);
    if (s.brand) {
      const b = brandKey(s.brand);
      if (!b) continue;
      cmds.push(["HSET", `tr:${day}:dm`, s.domain, s.brand], ["EXPIRE", `tr:${day}:dm`, TTL]);
      cmds.push(["PFADD", `tr:${day}:rb:${b}`, who], ["EXPIRE", `tr:${day}:rb:${b}`, TTL]);
      cmds.push(["ZINCRBY", `tr:${day}:b`, 1, b], ["EXPIRE", `tr:${day}:b`, TTL]);
      cmds.push(["HSET", `tr:${day}:bn`, b, s.brand], ["EXPIRE", `tr:${day}:bn`, TTL]);
    }
  }
  await pipeline(cmds).catch(() => {});
}

export interface TrendEntry {
  name: string;
  /** Different people who checked it with Mailharpoon. */
  people: number;
  scans: number;
  brand?: string | null;
  /** Links on this domain other services currently report, by service. */
  reports?: Record<string, number>;
}

export interface Trends {
  days: number;
  minPeople: number;
  domains: TrendEntry[];
  brands: TrendEntry[];
}

const pairs = (r: unknown): [string, number][] => {
  const a = (r as string[] | null) ?? [];
  const out: [string, number][] = [];
  for (let i = 0; i + 1 < a.length; i += 2) out.push([a[i], Number(a[i + 1])]);
  return out;
};

const hash = (r: unknown): Record<string, string> => {
  const a = (r as string[] | null) ?? [];
  const out: Record<string, string> = {};
  for (let i = 0; i + 1 < a.length; i += 2) out[a[i]] = a[i + 1];
  return out;
};

export const reportTotal = (e: TrendEntry) => Object.values(e.reports ?? {}).reduce((a, b) => a + b, 0);

/** Checks made with Mailharpoon in the last days, before any threshold. */
async function readOwn(days: number, now: number): Promise<{ domains: TrendEntry[]; brands: TrendEntry[] }> {
  if (!config()) return { domains: [], brands: [] };
  const dayList = Array.from({ length: days }, (_, i) => dayKey(now - i * 86_400_000));
  const first = await pipeline(
    dayList.flatMap((d) => [
      ["ZRANGE", `tr:${d}:d`, 0, 49, "REV", "WITHSCORES"],
      ["ZRANGE", `tr:${d}:b`, 0, 49, "REV", "WITHSCORES"],
      ["HGETALL", `tr:${d}:dm`],
      ["HGETALL", `tr:${d}:bn`],
    ]),
  );
  const scans = { d: new Map<string, number>(), b: new Map<string, number>() };
  const brandOf: Record<string, string> = {};
  const brandName: Record<string, string> = {};
  // Oldest day first, so the newest brand label wins.
  for (let i = dayList.length - 1; i >= 0; i--) {
    for (const [k, v] of pairs(first[i * 4])) scans.d.set(k, (scans.d.get(k) ?? 0) + v);
    for (const [k, v] of pairs(first[i * 4 + 1])) scans.b.set(k, (scans.b.get(k) ?? 0) + v);
    Object.assign(brandOf, hash(first[i * 4 + 2]));
    Object.assign(brandName, hash(first[i * 4 + 3]));
  }
  const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
  const d = top(scans.d);
  const b = top(scans.b);
  // PFCOUNT over several keys counts the people across all days without double counting.
  const counts = await pipeline([
    ...d.map(([k]) => ["PFCOUNT", ...dayList.map((day) => `tr:${day}:r:${k}`)]),
    ...b.map(([k]) => ["PFCOUNT", ...dayList.map((day) => `tr:${day}:rb:${k}`)]),
  ]);
  return {
    domains: d.map(([k, n], i) => ({ name: k, scans: n, people: Number(counts[i]), brand: brandOf[k] ?? null })),
    brands: b.map(([k, n], i) => ({ name: brandName[k] ?? k, scans: n, people: Number(counts[d.length + i]) })),
  };
}

/**
 * Most checked dangerous domains and brands of the last days. A domain checked with
 * Mailharpoon is shown once enough different people checked it, or earlier when other
 * services report it as well; then their report counts are added. Domains reported only
 * by other services fill the rest of the list, so it shows what circulates right now.
 */
export async function readTrends({
  days = 7,
  minPeople = Number(process.env.TREND_MIN_PEOPLE ?? 3),
  limit = 10,
  now = Date.now(),
  external,
}: { days?: number; minPeople?: number; limit?: number; now?: number; external?: ExternalCounts } = {}): Promise<Trends> {
  const own = await readOwn(days, now).catch(() => ({ domains: [] as TrendEntry[], brands: [] as TrendEntry[] }));
  const byDomain = new Map(own.domains.map((e) => [e.name, { ...e }]));
  for (const [service, counts] of Object.entries(external?.bySource ?? {})) {
    for (const [domain, n] of counts) {
      if (!listable(domain)) continue;
      const e = byDomain.get(domain) ?? { name: domain, people: 0, scans: 0, brand: null };
      e.reports = { ...e.reports, [service]: n };
      byDomain.set(domain, e);
    }
  }
  const domains = [...byDomain.values()]
    .filter((e) => e.people >= minPeople || reportTotal(e) > 0)
    // Checked with Mailharpoon first, then by the number of people and of reported links.
    .sort((p, q) => Number(q.people > 0) - Number(p.people > 0) || q.people - p.people || reportTotal(q) - reportTotal(p))
    .slice(0, limit);
  const brands = own.brands.filter((x) => x.people >= minPeople).sort((p, q) => q.people - p.people || q.scans - p.scans).slice(0, 8);
  return { days, minPeople, domains, brands };
}

/** Shown as text, never as a link: paypal-login.top becomes paypal-login[.]top. */
export const defang = (domain: string) => {
  try {
    return parseTarget(`http://${domain}`).unicodeHost.replace(/\./g, "[.]");
  } catch {
    return domain.replace(/\./g, "[.]");
  }
};
