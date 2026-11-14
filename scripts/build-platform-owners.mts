// Builds src/lib/data/platform-owners.json: pages on hosting platforms that belong to a brand of
// the curated list, so the brand checks do not report microsoft.github.io as an impersonation.
//
// github.io: <org>.github.io is the Pages site of the GitHub organisation <org>, and GitHub names are
// unique. An organisation named after a brand counts as the brand's own when one of these holds:
//   1. GitHub verified it and its website lies on one of the brand's official domains,
//   2. its website lies on one of the brand's official domains and it has existed for more than
//      three years with at least 10 public repositories,
//   3. it is long established: created more than eight years ago, at least 50 public repositories
//      and 1,000 followers. A squatter holding the name has none of that.
// Other platforms (vercel.app, pages.dev, netlify.app ...) offer no such check; their entries are
// added by hand under "manual" after the owner was confirmed on the brand's official site.
//
// Usage: GITHUB_TOKEN=... npx tsx scripts/build-platform-owners.mts
import { readFileSync, writeFileSync } from "node:fs";
import { parse } from "tldts";
import brands from "../src/lib/data/brands.json" with { type: "json" };

const OUT = "src/lib/data/platform-owners.json";
const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error("GITHUB_TOKEN is required (5,000 API requests per hour instead of 60)");

const YEAR = 365 * 24 * 3600 * 1000;
const now = Date.now();

async function gh(path: string): Promise<Record<string, unknown> | null> {
  const r = await fetch(`https://api.github.com${path}`, { headers: { authorization: `Bearer ${token}`, "user-agent": "mailharpoon-build" } });
  return r.ok ? ((await r.json()) as Record<string, unknown>) : null;
}

const previous = (() => {
  try {
    return JSON.parse(readFileSync(OUT, "utf8")) as { manual?: Record<string, string> };
  } catch {
    return {};
  }
})();

const hosts: Record<string, string> = {};
const evidence: Record<string, string> = {};
for (const [brand, domains] of Object.entries(brands as Record<string, string[]>)) {
  for (const login of new Set([brand, brand.replace(/-/g, "")])) {
    const org = await gh(`/orgs/${login}`);
    if (!org || org.type !== "Organization") continue;
    const site = typeof org.blog === "string" && org.blog ? parse(org.blog.includes("://") ? org.blog : `https://${org.blog}`).domain : null;
    const onOfficial = !!site && domains.includes(site);
    const age = (now - Date.parse(String(org.created_at))) / YEAR;
    const repos = Number(org.public_repos ?? 0);
    const followers = Number(org.followers ?? 0);
    let why: string | null = null;
    if (org.is_verified && onOfficial) why = `verified, website ${site}`;
    else if (onOfficial && age > 3 && repos >= 10) why = `website ${site}, ${Math.floor(age)} years, ${repos} repositories`;
    else if (age > 8 && repos >= 50 && followers >= 1000) why = `${Math.floor(age)} years, ${repos} repositories, ${followers} followers`;
    if (why) {
      const host = `${String(org.login).toLowerCase()}.github.io`;
      hosts[host] = brand;
      evidence[host] = why;
      console.log(`${host} -> ${brand}: ${why}`);
    }
  }
}

writeFileSync(
  OUT,
  JSON.stringify({ generated: new Date().toISOString().slice(0, 10), hosts, evidence, manual: previous.manual ?? {} }, null, 1) + "\n",
);
