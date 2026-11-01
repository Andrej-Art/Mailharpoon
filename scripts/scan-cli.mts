// Usage: npx tsx scripts/scan-cli.ts <url> [...urls]   – runs the full pipeline locally.
import { runScan } from "../src/lib/scan";

for (const url of process.argv.slice(2)) {
  const r = await runScan(url, { locale: "en", ai: false }, () => {});
  const sig = r.result.topSignals.map((s) => `${s.id}${s.weight > 0 ? "+" : ""}${s.weight}`).join(" ");
  const status = r.layers.map((l) => `${l.layer}:${l.status}${l.note ? "(" + l.note + ")" : ""}`).join(" ");
  console.log(`${String(r.result.score).padStart(3)} ${r.result.verdict.padEnd(10)} ${url}\n      ${sig}\n      ${status} ${r.durationMs}ms`);
}
