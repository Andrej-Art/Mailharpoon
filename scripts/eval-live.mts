// Live zero-day evaluation: blacklists disabled, fresh OpenPhish URLs vs. unknown
// legitimate domains (Tranco ranks outside the bundled top-100k allowlist).
// Usage: npx tsx scripts/eval-live.mts <phish.txt> <legit.txt>
import { readFileSync } from "node:fs";
import { runScan } from "../src/lib/scan";

const [phishFile, legitFile] = process.argv.slice(2);
const read = (f: string) => readFileSync(f, "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
const sets = [["phish", read(phishFile)], ["legit", read(legitFile)]] as const;

const rows: { set: string; url: string; score: number; page: string }[] = [];
for (const [set, urls] of sets) {
  for (let i = 0; i < urls.length; i += 6) {
    await Promise.all(urls.slice(i, i + 6).map(async (url) => {
      try {
        const r = await runScan(url, { locale: "en", ai: false, intel: false }, () => {});
        const page = r.layers.find((l) => l.layer === "page");
        rows.push({ set, url, score: r.result.score, page: page?.status ?? "?" });
        console.log(`${set} ${String(r.result.score).padStart(3)} ${page?.status} ${url}  ${r.result.topSignals.slice(0, 4).map((s) => s.id + (s.weight > 0 ? "+" : "") + s.weight).join(" ")}`);
      } catch (e) {
        console.log(`${set} ERR ${url} ${(e as Error).message}`);
      }
    }));
  }
}
for (const thr of [35, 50, 70]) {
  const tp = rows.filter((r) => r.set === "phish" && r.score >= thr).length;
  const fp = rows.filter((r) => r.set === "legit" && r.score >= thr).length;
  const np = rows.filter((r) => r.set === "phish").length;
  const nl = rows.filter((r) => r.set === "legit").length;
  console.log(`threshold ${thr}: recall ${tp}/${np} (${Math.round((100 * tp) / np)}%), false positives ${fp}/${nl} (${Math.round((100 * fp) / nl)}%)`);
}
