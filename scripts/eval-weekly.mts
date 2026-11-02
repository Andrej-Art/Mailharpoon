// Weekly zero-day evaluation, run by .github/workflows/weekly-eval.yml.
// Fresh OpenPhish URLs vs. random legitimate domains outside the bundled popularity list,
// with every threat list switched off, so it measures what the detector itself can do.
// Usage: npx tsx scripts/eval-weekly.mts <tranco-top-1m.csv> [sampleSize]
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parse } from "tldts";
import { runScan } from "../src/lib/scan";

const [trancoFile, sizeArg] = process.argv.slice(2);
const SIZE = Number(sizeArg ?? 40);
const THRESHOLDS = [35, 50, 70];
// Hard floor: the job fails only on a clear breakdown, because a 40-sample live set is noisy.
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

type Row = { set: "phish" | "legit"; url: string; score: number };
const rows: Row[] = [];
for (const [set, urls] of [["phish", phish], ["legit", legit]] as const) {
  for (let i = 0; i < urls.length; i += 6) {
    await Promise.all(urls.slice(i, i + 6).map(async (url) => {
      try {
        const r = await runScan(url, { locale: "en", ai: false, intel: false }, () => {});
        rows.push({ set, url, score: r.result.score });
      } catch {
        /* unparseable feed entry */
      }
    }));
  }
}

const p = rows.filter((r) => r.set === "phish");
const n = rows.filter((r) => r.set === "legit");
const metrics = THRESHOLDS.map((thr) => ({
  threshold: thr,
  recall: Number((p.filter((r) => r.score >= thr).length / p.length).toFixed(3)),
  fpr: Number((n.filter((r) => r.score >= thr).length / n.length).toFixed(3)),
}));

const date = new Date().toISOString().slice(0, 10);
const result = { date, sample: { phishing: p.length, legitimate: n.length }, metrics };
mkdirSync("ml/eval-history", { recursive: true });
writeFileSync(`ml/eval-history/${date}.json`, JSON.stringify(result, null, 2) + "\n");
// The site reads this copy, so every weekly commit updates the published figures.
writeFileSync("ml/eval-history/latest.json", JSON.stringify(result, null, 2) + "\n");

const table = [
  `### Mailharpoon weekly evaluation (${date})`,
  `${p.length} fresh phishing URLs, ${n.length} legitimate domains, threat lists off.`,
  "",
  "| Threshold | Phishing detected | False alarms |",
  "|---|---|---|",
  ...metrics.map((m) => `| ${m.threshold} | ${Math.round(m.recall * 100)}% | ${Math.round(m.fpr * 100)}% |`),
].join("\n");
console.log(table);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, table + "\n");

const at50 = metrics.find((m) => m.threshold === 50)!;
const at70 = metrics.find((m) => m.threshold === 70)!;
if (at50.recall < MIN_RECALL_AT_50 || at70.fpr > MAX_FPR_AT_70) {
  console.error(`Quality floor breached: recall@50=${at50.recall}, fpr@70=${at70.fpr}`);
  process.exit(1);
}
