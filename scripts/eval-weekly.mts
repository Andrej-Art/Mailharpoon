// Weekly zero-day evaluation, run by .github/workflows/weekly-eval.yml.
// Fresh OpenPhish URLs vs. random legitimate domains outside the bundled popularity list,
// with every threat list switched off, so it measures what the detector itself can do.
// Every link is stored with its score and signals (query strings, addresses and tokens removed),
// so errors can be inspected, weeks pooled and new fusion rules replayed on the same links.
// Per-link rows go to data/ (a checkout of the private data repository), the public repository
// only receives the aggregate figures.
// Each run also scores a candidate rule next to the live one, a paired comparison on equal terms.
// Usage: npx tsx scripts/eval-weekly.mts <tranco-top-1m.csv> [sampleSize]
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parse } from "tldts";
import { evalRow, type EvalRow } from "../src/lib/eval-record";
import { metricsOf, wilson } from "../src/lib/eval-stats";
import { runScan } from "../src/lib/scan";

const [trancoFile, sizeArg] = process.argv.slice(2);
const SIZE = Number(sizeArg ?? 100);
// Hard floor: the job fails only on a clear breakdown, because a weekly live set is noisy.
const MIN_RECALL_AT_50 = 0.3;
const MAX_FPR_AT_70 = 0.15;

function shuffle<T>(xs: T[], seed: number): T[] {
  const a = [...xs];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const seed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ""));
const feed = await (await fetch("https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt")).text();
const seen = new Set<string>();
const phish = shuffle(feed.split("\n").map((l) => l.trim()).filter(Boolean), seed).filter((u) => {
  const d = parse(u, { allowPrivateDomains: true }).domain;
  if (!d || seen.has(d)) return false;
  seen.add(d);
  return true;
}).slice(0, SIZE);

const tranco = readFileSync(trancoFile, "utf8").split("\n").slice(300_000).map((l) => l.split(",")[1]?.trim()).filter(Boolean) as string[];
const legit = shuffle(tranco, seed + 1).slice(0, SIZE).map((d) => `https://${d}`);

const rows: EvalRow[] = [];
for (const [set, urls] of [["phish", phish], ["legit", legit]] as const) {
  for (let i = 0; i < urls.length; i += 6) {
    await Promise.all(urls.slice(i, i + 6).map(async (url) => {
      try {
        const r = await runScan(url, { locale: "en", ai: false, intel: false }, () => {});
        rows.push(evalRow(set, url, r.layers, r.result));
      } catch {
        /* unparseable feed entry */
      }
    }));
  }
}

const p = rows.filter((r) => r.set === "phish");
const n = rows.filter((r) => r.set === "legit");
const metrics = metricsOf(p.map((r) => r.score), n.map((r) => r.score));
const candidate = metricsOf(p.map((r) => r.candidate), n.map((r) => r.candidate));

const date = new Date().toISOString().slice(0, 10);
const result = { date, sample: { phishing: p.length, legitimate: n.length }, metrics, candidate };
mkdirSync("ml/eval-history", { recursive: true });
mkdirSync("data/eval-rows", { recursive: true });
writeFileSync(`ml/eval-history/${date}.json`, JSON.stringify(result, null, 2) + "\n");
// The site reads this copy, so every weekly commit updates the published figures.
writeFileSync("ml/eval-history/latest.json", JSON.stringify(result, null, 2) + "\n");
writeFileSync(`data/eval-rows/${date}.json`, JSON.stringify({ date, rows }, null, 1) + "\n");

const ci = (rate: number, total: number) => {
  const w = wilson(Math.round(rate * total), total);
  return `${Math.round(rate * 100)}% (${Math.round(w.low * 100)}–${Math.round(w.high * 100)})`;
};
const table = [
  `### Mailharpoon weekly evaluation (${date})`,
  `${p.length} fresh phishing URLs, ${n.length} legitimate domains, threat lists off. 95% Wilson intervals in brackets.`,
  "",
  "| Threshold | Phishing detected | False alarms | Candidate: detected | Candidate: false alarms |",
  "|---|---|---|---|---|",
  ...metrics.map((m, i) => `| ${m.threshold} | ${ci(m.recall, p.length)} | ${ci(m.fpr, n.length)} | ${ci(candidate[i].recall, p.length)} | ${ci(candidate[i].fpr, n.length)} |`),
].join("\n");
console.log(table);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, table + "\n");

const at50 = metrics.find((m) => m.threshold === 50)!;
const at70 = metrics.find((m) => m.threshold === 70)!;
if (at50.recall < MIN_RECALL_AT_50 || at70.fpr > MAX_FPR_AT_70) {
  console.error(`Quality floor breached: recall@50=${at50.recall}, fpr@70=${at70.fpr}`);
  process.exit(1);
}
