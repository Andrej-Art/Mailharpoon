// Builds src/lib/data/brand-kb.json: organisations and their official websites from Wikidata
// (property P856), following the knowledge-base idea of KnowPhish (USENIX Security 2024).
// International organisations need a few Wikipedia articles to count as known; banks,
// utilities, insurers and authorities in Germany, Austria and Switzerland are taken in full
// because those are the regional names the curated list cannot cover.
// Usage: npx tsx scripts/build-brand-kb.mts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "tldts";
import lexicon from "../src/lib/data/lexicon.json" with { type: "json" };

const UA = "Mailharpoon/2.0 (https://github.com/Andrej-Art/Mailharpoon; brand knowledge base build)";

// Classes queried worldwide (min. 3 sitelinks) and in DACH (all entries).
const GLOBAL = {
  Q4830453: "business", Q891723: "public company", Q6881511: "enterprise", Q783794: "company", Q22687: "bank",
  Q1058914: "software company", Q18388277: "technology company", Q118140435: "very large online platform",
  Q35127: "website", Q19967801: "online service", Q46970: "airline", Q2401749: "telecommunications company",
  Q3220391: "social networking service", Q4182287: "search engine", Q507619: "retail chain", Q18043413: "supermarket chain",
  Q1956140: "payment service provider", Q25401607: "cryptocurrency exchange", Q1468664: "logistics company",
  Q2143354: "insurance company", Q620615: "mobile app", Q4382945: "online shop", Q658255: "subsidiary", Q431289: "brand",
};
const DACH = {
  Q4830453: "business", Q891723: "public company", Q6881511: "enterprise", Q783794: "company", Q22687: "bank",
  Q13601825: "Sparkasse", Q3277997: "cooperative bank", Q157963: "savings bank", Q2326317: "Stadtwerk",
  Q2143354: "insurance company", Q327333: "government agency", Q4382945: "online shop", Q507619: "retail chain",
  Q2401749: "telecommunications company", Q1468664: "logistics company", Q1058914: "software company",
};

// DACH queries run per country, otherwise "business" in Germany exceeds the 60 s query limit.
function query(cls: string, scope: string): string {
  const filter = scope === "global" ? "?item wikibase:sitelinks ?sl . FILTER(?sl >= 3)" : `?item wdt:P17 wd:${scope} .`;
  // Only current websites: no end date, not deprecated.
  return `SELECT ?item ?name ?site WHERE {
  ?item wdt:P31 wd:${cls} ; p:P856 ?st .
  ?st ps:P856 ?site .
  FILTER NOT EXISTS { ?st pq:P582 ?end }
  FILTER NOT EXISTS { ?st wikibase:rank wikibase:DeprecatedRank }
  ${filter}
  { ?item rdfs:label ?name } UNION { ?item skos:altLabel ?name }
  FILTER(LANG(?name) IN ("de", "en"))
}`;
}

async function run(q: string): Promise<{ item: string; name: string; site: string }[]> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch("https://query.wikidata.org/sparql", {
      method: "POST",
      headers: { "user-agent": UA, accept: "application/sparql-results+json", "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ query: q }),
      signal: AbortSignal.timeout(90_000),
    }).catch(() => null);
    // A query that times out mid-stream still answers 200, followed by an error text.
    const json = res?.ok ? await res.json().catch(() => null) : null;
    if (json) {
      return (json as { results: { bindings: Record<string, { value: string }>[] } }).results.bindings.map((b) => ({
        item: b.item.value.split("/").pop()!,
        name: b.name.value,
        site: b.site.value,
      }));
    }
    await new Promise((r) => setTimeout(r, 15_000 * (attempt + 1)));
  }
  throw new Error("query failed");
}

// Websites that are platform pages, not an own domain.
const PLATFORM = new Set([
  ...lexicon.user_content_hosts.map((h) => parse(h).domain),
  ...lexicon.free_hosting_suffixes,
  ...lexicon.free_hosting_extra,
  ...lexicon.shorteners,
  "facebook.com", "instagram.com", "linkedin.com", "twitter.com", "x.com", "youtube.com", "xing.com", "wikipedia.org",
  "google.com", "t.me", "wordpress.com", "jimdo.com", "wix.com", "jimdofree.com", "business.site", "tumblr.com",
]);

function domainOf(site: string): string | null {
  let u: URL;
  try {
    u = new URL(site);
  } catch {
    return null;
  }
  // A long path means a page on someone else's site, e.g. a profile on a platform.
  if (!/^\/?([a-z]{2}([-_][a-z]{2})?\/?|home\/?|index\.html?)?$/i.test(u.pathname)) return null;
  const d = parse(u.hostname, { allowPrivateDomains: true }).domain;
  if (!d || PLATFORM.has(d)) return null;
  return d;
}

const entities = new Map<string, { names: Set<string>; domains: Set<string> }>();
const jobs = [
  ...Object.keys(GLOBAL).map((c) => [c, "global"] as const),
  ...Object.keys(DACH).flatMap((c) => ["Q183", "Q40", "Q39"].map((country) => [c, country] as const)),
];
// Finished queries are cached, so an interrupted build resumes where it stopped.
const CACHE = join(tmpdir(), "mailharpoon-kb-cache");
mkdirSync(CACHE, { recursive: true });
const failed: string[] = [];
for (const [cls, scope] of jobs) {
  const file = join(CACHE, `${scope}-${cls}.json`);
  let rows: Awaited<ReturnType<typeof run>>;
  if (existsSync(file)) rows = JSON.parse(readFileSync(file, "utf8"));
  else {
    try {
      rows = await run(query(cls, scope));
    } catch {
      failed.push(`${scope} ${cls}`);
      continue;
    }
    writeFileSync(file, JSON.stringify(rows));
    await new Promise((r) => setTimeout(r, 3000));
  }
  for (const r of rows) {
    const d = domainOf(r.site);
    if (!d) continue;
    const e = entities.get(r.item) ?? { names: new Set(), domains: new Set() };
    e.names.add(r.name.trim());
    e.domains.add(d);
    entities.set(r.item, e);
  }
  console.log(`${scope} ${cls}: ${rows.length} rows, ${entities.size} organisations so far`);
}
if (failed.length) console.warn(`skipped after retries: ${failed.join(", ")}`);

// Compact format: [names, domains] per organisation, sorted for stable diffs.
const out = [...entities.entries()]
  .sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1)))
  .map(([id, e]) => [id, [...e.names].filter((n) => n.length >= 2 && n.length <= 80).slice(0, 8), [...e.domains].sort()]);
writeFileSync(
  "src/lib/data/brand-kb.json",
  JSON.stringify({ source: "Wikidata (CC0), official website P856", built: new Date().toISOString().slice(0, 10), orgs: out }) + "\n",
);
console.log(`wrote ${out.length} organisations, ${new Set(out.flatMap((o) => o[2] as string[])).size} domains`);
