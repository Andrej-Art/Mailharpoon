// Pools the stored weekly runs (data/eval-rows, from the private data repository) and recomputes the verdicts from the stored
// signals, so a fusion change can be compared with the live rule on exactly the same links
// without scanning anything again. Lists every false alarm and every miss with its strongest signals.
// Usage: npx tsx scripts/eval-report.mts [weeks]
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fuse } from "../src/lib/analyzers/fusion";
import type { Layer, LayerResult, Signal } from "../src/lib/analyzers/types";
import type { EvalRow } from "../src/lib/eval-record";
import { THRESHOLDS, wilson } from "../src/lib/eval-stats";

const WEEKS = Number(process.argv[2] ?? 8);
const DIR = "data/eval-rows";

const files = (existsSync(DIR) ? readdirSync(DIR) : []).filter((f) => f.endsWith(".json")).sort().slice(-WEEKS);
if (!files.length) {
  console.log(`No stored runs in ${DIR}. Clone the private data repository into data/ first: gh repo clone Andrej-Art/mailharpoon-data data`);
  process.exit(0);
}
const rows: (EvalRow & { week: string })[] = files.flatMap((f) => {
  const { date, rows } = JSON.parse(readFileSync(`${DIR}/${f}`, "utf8")) as { date: string; rows: EvalRow[] };
  return rows.map((r) => ({ ...r, week: date }));
});

/** The stored signals rebuilt into layers, so the current fusion code can score them again. */
function layersOf(r: EvalRow): LayerResult[] {
  const by = new Map<string, Signal[]>();
  for (const s of r.signals) by.set(s.layer, [...(by.get(s.layer) ?? []), { ...s, layer: s.layer as Layer, severity: "info" }]);
  for (const l of r.ok) if (!by.has(l)) by.set(l, []);
  return [...by].map(([layer, signals]) => ({ layer: layer as Layer, status: r.ok.includes(layer) ? "ok" : "skipped", ms: 0, signals }));
}

const RULES: Record<string, (r: EvalRow) => number> = {
  live: (r) => fuse(layersOf(r)).score,
  confirmation: (r) => fuse(layersOf(r), { requireConfirmation: true }).score,
};

const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;
const cell = (k: number, n: number) => {
  const w = wilson(k, n);
  return `${pct(w.rate)} (${pct(w.low)}–${pct(w.high)}) ${k}/${n}`;
};
const phish = rows.filter((r) => r.set === "phish");
const legit = rows.filter((r) => r.set === "legit");

console.log(`## Pooled evaluation, ${files.length} run(s): ${files.map((f) => f.slice(0, 10)).join(", ")}`);
console.log(`${phish.length} phishing links, ${legit.length} legitimate domains. 95% Wilson intervals.\n`);
console.log("| Rule | Threshold | Phishing detected | False alarms |\n|---|---|---|---|");
for (const [name, score] of Object.entries(RULES)) {
  const ps = phish.map(score);
  const ls = legit.map(score);
  for (const t of THRESHOLDS) console.log(`| ${name} | ${t} | ${cell(ps.filter((s) => s >= t).length, ps.length)} | ${cell(ls.filter((s) => s >= t).length, ls.length)} |`);
}

const top = (r: EvalRow) =>
  [...r.signals]
    .filter((s) => s.weight !== 0)
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    .slice(0, 4)
    .map((s) => `${s.id} ${s.weight > 0 ? "+" : ""}${s.weight}`)
    .join(", ");

const list = (title: string, xs: typeof rows) => {
  console.log(`\n### ${title} (${xs.length})`);
  for (const r of xs) console.log(`- ${r.week} ${r.url} live ${RULES.live(r)}, candidate ${RULES.confirmation(r)}: ${top(r)}`);
};
list("False alarms, legitimate scored 35 or more", legit.filter((r) => RULES.live(r) >= 35).sort((a, b) => RULES.live(b) - RULES.live(a)));
list("Misses, phishing scored below 70", phish.filter((r) => RULES.live(r) < 70).sort((a, b) => RULES.live(a) - RULES.live(b)));

// Which signals show up most in each error class: the starting point for the next change.
const tally = (xs: typeof rows) => {
  const c = new Map<string, number>();
  for (const r of xs) for (const s of new Set(r.signals.filter((s) => s.weight > 0).map((s) => s.id))) c.set(s, (c.get(s) ?? 0) + 1);
  return [...c].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, k]) => `${id} ${k}`).join(", ");
};
console.log(`\nMost common risk signals in false alarms: ${tally(legit.filter((r) => RULES.live(r) >= 35)) || "-"}`);
console.log(`Most common risk signals in detected phishing: ${tally(phish.filter((r) => RULES.live(r) >= 70)) || "-"}`);
