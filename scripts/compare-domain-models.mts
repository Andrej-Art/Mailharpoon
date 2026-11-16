// Compares two exported domain models on the same held-out domains: fresh OpenPhish phishing on own
// domains (archive days from <testFrom>) and unknown legitimate domains (Tranco ranks 600k-1M, sampled).
// Prints recall at p >= 0.5 and at the probability where each model raises 5 % false alarms.
// Usage: npx tsx scripts/compare-domain-models.mts <old.json> <new.json> <archive.tsv> <testFrom> <tranco.csv>
import { readFileSync } from "node:fs";
import { parse } from "tldts";
import { rawScoreWith, type TreeModel } from "../src/lib/analyzers/domain-model";
import { domainFeatures } from "../src/lib/analyzers/lexical-features";
import lexicon from "../src/lib/data/lexicon.json";

const [oldPath, newPath, archive, testFrom, trancoPath] = process.argv.slice(2);
const HOSTS = [...lexicon.free_hosting_suffixes, ...lexicon.free_hosting_extra];
const onPlatform = (d: string) => HOSTS.some((s) => d === s || d.endsWith("." + s));
const reg = (u: string) => parse(u, { allowPrivateDomains: true }).domain ?? null;

const phish = [...new Set(readFileSync(archive, "utf8").split("\n").map((l) => l.split("\t")).filter(([day, u]) => u && day >= testFrom).map(([, u]) => reg(u)).filter((d): d is string => !!d && !onPlatform(d) && !/^\d+\.\d+\.\d+\.\d+$/.test(d)))];
const tranco = readFileSync(trancoPath, "utf8").split("\n").slice(600_000).map((l) => l.split(",")[1]?.trim()).filter(Boolean) as string[];
let s = 7;
const legit = tranco.filter(() => ((s = (s * 1103515245 + 12345) % 2 ** 31) % 20) === 0).map(reg).filter((d): d is string => !!d && !onPlatform(d));

for (const [name, path] of [["old", oldPath], ["new", newPath]]) {
  const m = JSON.parse(readFileSync(path, "utf8")) as TreeModel;
  const p = (d: string) => 1 / (1 + Math.exp(-rawScoreWith(m, domainFeatures(d, m))));
  const pp = phish.map(p), pl = legit.map(p).sort((a, b) => b - a);
  const at5 = pl[Math.floor(pl.length * 0.05)];
  const rate = (xs: number[], t: number) => (xs.filter((x) => x >= t).length / xs.length * 100).toFixed(1) + "%";
  console.log(`${name}: phishing ${pp.length}, legit ${pl.length} | p>=0.5: recall ${rate(pp, 0.5)}, false alarms ${rate(pl, 0.5)} | at 5% false alarms (p>=${at5.toFixed(2)}): recall ${rate(pp, at5)}`);
}
