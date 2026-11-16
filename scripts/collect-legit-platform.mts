// Collects genuine pages on hosting platforms from GitHub: the homepage field of popular repositories
// and the blog field of their owners. Output: one URL per line. Needs GITHUB_TOKEN.
// Usage: GITHUB_TOKEN=... npx tsx scripts/collect-legit-platform.mts <out.txt>
import { writeFileSync } from "node:fs";
import { parse } from "tldts";
import lexicon from "../src/lib/data/lexicon.json";

const HOSTS = [...lexicon.free_hosting_suffixes, ...lexicon.free_hosting_extra];
const onPlatform = (u: string) => {
  try {
    const h = new URL(u).hostname.toLowerCase();
    return HOSTS.some((s) => h.endsWith("." + s)) && h.split(".").length >= 3;
  } catch {
    return false;
  }
};
const gh = async (path: string) => {
  const r = await fetch(`https://api.github.com${path}`, { headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: "application/vnd.github+json" } });
  if (r.status === 403 || r.status === 429) { await new Promise((s) => setTimeout(s, 60_000)); return gh(path); }
  return r.ok ? r.json() : null;
};
const found = new Map<string, string>(); // registrable -> url
const add = (u: string | null | undefined) => {
  if (!u) return;
  const url = /^https?:\/\//.test(u) ? u : `https://${u}`;
  if (!onPlatform(url)) return;
  const reg = parse(url, { allowPrivateDomains: true }).domain;
  if (reg && !found.has(reg)) found.set(reg, `https://${new URL(url).hostname.toLowerCase()}/`);
};
const owners = new Set<string>();
const langs = ["javascript", "typescript", "python", "go", "rust", "java", "c++", "ruby", "php", "swift", "kotlin", "c#", "html", "css", "shell", "vue", "dart", "scala", "r", "julia"];
for (const lang of langs) for (const stars of ["200..1000", "1000..5000", ">5000"]) for (let page = 1; page <= 3; page++) {
  const res = await gh(`/search/repositories?q=language:${encodeURIComponent(lang)}+stars:${stars}&sort=updated&per_page=100&page=${page}`);
  for (const r of res?.items ?? []) { add(r.homepage); owners.add(r.owner.login); }
  await new Promise((s) => setTimeout(s, 2200)); // search API: 30 requests per minute
}
console.error("repos done", found.size, "owners", owners.size);
let n = 0;
for (const o of [...owners].slice(0, 1500)) {
  const u = await gh(`/users/${o}`);
  add(u?.blog);
  const page = `https://${o.toLowerCase()}.github.io/`;
  const live = await fetch(page, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(8000) }).then((r) => r.status === 200).catch(() => false);
  if (live) add(page);
  if (++n % 200 === 0) console.error("owners", n, found.size);
}
writeFileSync(process.argv[2], [...found.values()].join("\n") + "\n");
console.error("total", found.size);
