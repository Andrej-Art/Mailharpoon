// Scans a prepared link list the same way as the weekly evaluation (threat lists and AI off) and stores
// one row per link, for development and holdout sets outside the weekly run. Resumable: links already in
// the output file are skipped.
// Usage: npx tsx scripts/eval-batch.mts <list.tsv: set<TAB>url> <out.json> [parallel]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { evalRow, type EvalRow } from "../src/lib/eval-record";
import { runScan } from "../src/lib/scan";

const [listFile, outFile, par] = process.argv.slice(2);
const PAR = Number(par ?? 6);
const items = readFileSync(listFile, "utf8").split("\n").filter(Boolean).map((l) => l.split("\t") as [EvalRow["set"], string]);
const rows: (EvalRow & { input: string })[] = existsSync(outFile) ? JSON.parse(readFileSync(outFile, "utf8")).rows : [];
const done = new Set(rows.map((r) => r.input));
const todo = items.filter(([, u]) => !done.has(u));
console.error(`${todo.length} to scan, ${rows.length} already stored`);
const save = () => writeFileSync(outFile, JSON.stringify({ rows }, null, 1) + "\n");
for (let i = 0; i < todo.length; i += PAR) {
  await Promise.all(todo.slice(i, i + PAR).map(async ([set, url]) => {
    try {
      const r = await Promise.race([
        runScan(url, { locale: "en", ai: false, intel: false }, () => {}),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 90_000)),
      ]);
      rows.push({ ...evalRow(set, url, r.layers, r.result), input: url });
    } catch {
      rows.push({ set, url, input: url, score: -1, candidate: -1, ok: [], signals: [] } as never);
    }
  }));
  if ((i / PAR) % 5 === 0) { save(); console.error(`${Math.min(i + PAR, todo.length)}/${todo.length}`); }
}
save();
process.exit(0);
