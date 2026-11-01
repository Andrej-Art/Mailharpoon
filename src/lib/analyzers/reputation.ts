// Reputation layer: popularity (Tranco), domain age (RDAP) and certificate history (CT logs).
// Newly registered domains with freshly issued certificates are among the strongest
// predictors of phishing in recent measurement studies.
import tranco from "@/lib/data/tranco-top100k.json";
import lexicon from "@/lib/data/lexicon.json";
import { getJson } from "@/lib/net/safe-fetch";
import { signal, type LayerResult, type Signal } from "./types";
import type { ParsedTarget } from "./url";

let RANKS: Map<string, number> | null = null;
export function trancoRank(domain: string): number | null {
  if (!RANKS) {
    RANKS = new Map();
    tranco.list.split("\n").forEach((d, i) => RANKS!.set(d, i + 1));
  }
  return RANKS.get(domain) ?? null;
}

const USER_CONTENT = lexicon.user_content_hosts;
export function isUserContentHost(t: ParsedTarget): boolean {
  if (USER_CONTENT.some((h) => t.hostname === h || t.hostname.endsWith("." + h))) return true;
  // Machine-generated customer subdomains on a hoster ("cq796502.tw1.ru") don't inherit its reputation.
  return t.subdomain.split(".").some((l) => /\d{4,}/.test(l) || l.length >= 20);
}

interface RdapEvent {
  eventAction: string;
  eventDate: string;
}
interface RdapDomain {
  events?: RdapEvent[];
  entities?: { roles?: string[]; vcardArray?: [string, [string, object, string, string][]] }[];
  status?: string[];
}

export interface ReputationData {
  trancoRank: number | null;
  userContentPlatform: boolean;
  registeredAt: string | null;
  expiresAt: string | null;
  ageDays: number | null;
  registrar: string | null;
  rdapStatus: string[];
  firstCertAt: string | null;
  certCount: number | null;
  /** Why registration data may be missing: some registries (e.g. DENIC for .de) never publish dates. */
  rdapNote: "ok" | "no_dates" | "failed" | "not_applicable";
  ctNote: "ok" | "skipped_popular" | "failed" | "not_applicable";
}

const DAY = 86_400_000;

const UA = { "user-agent": "Mailharpoon/2.0 (+https://github.com/Andrej-Art/Mailharpoon)", accept: "application/rdap+json" };
let bootstrap: { at: number; servers: Map<string, string> } | null = null;

/** IANA RDAP bootstrap (RFC 9224): TLD -> authoritative RDAP base URL. */
async function rdapServer(tld: string): Promise<string | null> {
  if (!bootstrap || Date.now() - bootstrap.at > 24 * 3600_000) {
    const data = await getJson<{ services: [string[], string[]][] }>("https://data.iana.org/rdap/dns.json", { headers: UA }, 4000);
    if (data) {
      const servers = new Map<string, string>();
      for (const [tlds, urls] of data.services) for (const t of tlds) servers.set(t, urls.find((u) => u.startsWith("https")) ?? urls[0]);
      bootstrap = { at: Date.now(), servers };
    }
  }
  return bootstrap?.servers.get(tld) ?? RDAP_EXTRA[tld] ?? null;
}

// Registries with a public RDAP service that is missing from the IANA bootstrap file
// (checked 2026-11-01). DENIC and SWITCH answer, but never publish registration dates.
const RDAP_EXTRA: Record<string, string> = {
  de: "https://rdap.denic.de/",
  ch: "https://rdap.nic.ch/",
  li: "https://rdap.nic.ch/",
  io: "https://rdap.identitydigital.services/rdap/",
};

async function rdap(domain: string): Promise<RdapDomain | null> {
  const server = await rdapServer(domain.split(".").pop()!);
  const base = server ? server.replace(/\/?$/, "/") : "https://rdap.org/";
  return getJson<RdapDomain>(`${base}domain/${encodeURIComponent(domain)}`, { headers: UA, redirect: "follow" }, 5000);
}

async function firstCertificate(domain: string): Promise<{ first: string | null; count: number } | null> {
  const rows = await getJson<{ not_before: string }[]>(
    `https://crt.sh/?q=${encodeURIComponent(domain)}&output=json&deduplicate=Y`,
    { headers: { "user-agent": UA["user-agent"] } },
    6000,
  );
  if (!rows) return null;
  const first = rows.reduce<string | null>((min, r) => (!min || r.not_before < min ? r.not_before : min), null);
  return { first: first ? `${first}Z` : null, count: rows.length };
}

const SHORTENERS = new Set(lexicon.shorteners);

export async function analyzeReputation(t: ParsedTarget): Promise<LayerResult<ReputationData>> {
  const start = Date.now();
  const s: Signal[] = [];
  const R = "reputation" as const;
  const userContent = isUserContentHost(t);

  const shortener = SHORTENERS.has(t.registrable);
  const rank = t.isIp ? null : trancoRank(t.registrable);
  if (rank && shortener) {
    // A popular shortener says nothing about where it points; the redirect layer judges the target.
  } else if (rank) {
    // Popular platforms that host user content (Google Sites/Forms, Notion, Dropbox ...) are
    // abused heavily, so their popularity says little about the specific page.
    const w = userContent ? -0.4 : rank <= 1_000 ? -3.5 : rank <= 10_000 ? -2.8 : -1.8;
    s.push(signal(R, "tranco_rank", w, { rank }));
  }
  if (userContent) s.push(signal(R, "user_content_platform", 0.4, { host: t.hostname }));

  const data: ReputationData = {
    trancoRank: rank,
    userContentPlatform: userContent,
    registeredAt: null,
    expiresAt: null,
    ageDays: null,
    registrar: null,
    rdapStatus: [],
    firstCertAt: null,
    certCount: null,
    rdapNote: "not_applicable",
    ctNote: "not_applicable",
  };

  // Registration data only exists for registrable, non-private domains. RDAP is a single cheap
  // request, so it always runs. The certificate history (crt.sh) can return tens of thousands of
  // rows for big sites, so it is only fetched for domains outside the popularity list.
  if (!t.isIp && !t.isPrivateSuffix) {
    const [r, ct] = await Promise.all([rdap(t.icannDomain), rank ? Promise.resolve(null) : firstCertificate(t.icannDomain)]);
    data.ctNote = rank ? "skipped_popular" : ct ? "ok" : "failed";
    data.rdapNote = !r ? "failed" : r.events?.some((e) => e.eventAction === "registration") ? "ok" : "no_dates";

    if (r?.events) {
      const reg = r.events.find((e) => e.eventAction === "registration")?.eventDate ?? null;
      const exp = r.events.find((e) => e.eventAction === "expiration")?.eventDate ?? null;
      data.registeredAt = reg;
      data.expiresAt = exp;
      data.rdapStatus = r.status ?? [];
      const registrar = r.entities?.find((e) => e.roles?.includes("registrar"));
      data.registrar = registrar?.vcardArray?.[1]?.find((v) => v[0] === "fn")?.[3] ?? null;
      if (reg) {
        const age = Math.floor((Date.now() - Date.parse(reg)) / DAY);
        data.ageDays = age;
        if (age < 7) s.push(signal(R, "domain_age", 2.6, { days: age }));
        else if (age < 30) s.push(signal(R, "domain_age", 1.9, { days: age }));
        else if (age < 180) s.push(signal(R, "domain_age", 1.0, { days: age }));
        else if (age < 365) s.push(signal(R, "domain_age", 0.3, { days: age }));
        else if (age > 5 * 365) s.push(signal(R, "domain_age_old", -1.0, { years: Math.floor(age / 365) }));
        else s.push(signal(R, "domain_age_old", -0.4, { years: Math.floor(age / 365) }));
      }
      if (exp && reg && Date.parse(exp) - Date.parse(reg) <= 400 * DAY && (data.ageDays ?? 999) < 365)
        s.push(signal(R, "short_registration", 0.3));
      if (data.rdapStatus.some((x) => /hold|suspend/i.test(x))) s.push(signal(R, "registry_hold", 2.0));
    }

    if (ct) {
      data.firstCertAt = ct.first;
      data.certCount = ct.count;
      if (ct.first) {
        const certAge = Math.floor((Date.now() - Date.parse(ct.first)) / DAY);
        if (certAge < 14) s.push(signal(R, "fresh_certificate", 1.2, { days: certAge }));
        else if (certAge < 60) s.push(signal(R, "fresh_certificate", 0.5, { days: certAge }));
      }
    }
  }

  return { layer: "reputation", status: "ok", ms: Date.now() - start, signals: s, data };
}
