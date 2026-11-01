// Evaluates the message scanner on ml/text-eval/*.jsonl.
// Links are not fetched (the English corpus is years old and its links are dead), so this
// measures the content, sender and (if ANTHROPIC_API_KEY is set) AI layers.
// Usage: npx tsx scripts/eval-text.mts [--dev] [--verbose]
import { readFileSync, readdirSync } from "node:fs";
import { runMessageScan } from "../src/lib/scan-message";

const verbose = process.argv.includes("--verbose");
const ai = Boolean(process.env.ANTHROPIC_API_KEY);
// --dev evaluates the tuning set (ml/text-dev); the default is the held-out test sets.
const dir = new URL(process.argv.includes("--dev") ? "../ml/text-dev/" : "../ml/text-eval/", import.meta.url);
console.log(`AI layer: ${ai ? "on" : "off"}\n`);

for (const file of readdirSync(dir).filter((f) => f.endsWith(".jsonl"))) {
  const rows = readFileSync(new URL(file, dir), "utf8").trim().split("\n").map((l) => JSON.parse(l) as { label: number; text: string });
  const scored: { label: number; score: number; text: string; ids: string[] }[] = [];
  for (let i = 0; i < rows.length; i += 8) {
    await Promise.all(
      rows.slice(i, i + 8).map(async (r) => {
        const rep = await runMessageScan(r.text, { locale: file.startsWith("de") ? "de" : "en", ai, links: false }, () => {});
        scored.push({ label: r.label, score: rep.result.score, text: r.text, ids: rep.result.topSignals.map((s) => s.id) });
      }),
    );
  }
  console.log(`== ${file} (${scored.filter((r) => r.label).length} phishing / ${scored.filter((r) => !r.label).length} benign)`);
  for (const thr of [35, 50, 70]) {
    const p = scored.filter((r) => r.label === 1);
    const n = scored.filter((r) => r.label === 0);
    const tp = p.filter((r) => r.score >= thr).length;
    const fp = n.filter((r) => r.score >= thr).length;
    console.log(`  threshold ${thr}: recall ${tp}/${p.length} (${Math.round((100 * tp) / p.length)}%), false positives ${fp}/${n.length} (${Math.round((100 * fp) / n.length)}%)`);
  }
  if (verbose) {
    for (const r of scored.filter((r) => (r.label === 1 && r.score < 35) || (r.label === 0 && r.score >= 35)))
      console.log(`  ${r.label ? "MISS" : "FP  "} ${String(r.score).padStart(3)} ${r.text.slice(0, 90).replace(/\s+/g, " ")}  [${r.ids.join(" ")}]`);
  }
  console.log();
}
