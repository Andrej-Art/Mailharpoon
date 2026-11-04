// Daily archive of the public OpenPhish feed, run by .github/workflows/archive-feeds.yml.
// The feed only shows what is live right now; kept over months it becomes a time-ordered corpus
// for training and for measuring how fast the model ages (time-split evaluation, TESSERACT-style).
// The archive lives in the private data repository (checked out as data/), not in the public one.
// Links are stored without query strings, addresses or tokens, one "date<TAB>url" line each.
// Usage: npx tsx scripts/archive-feeds.mts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { stripUrl } from "../src/lib/eval-record";

const FEED = "https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt";
const date = new Date().toISOString().slice(0, 10);
const file = `data/feeds/openphish/${date.slice(0, 7)}.tsv`;

const urls = (await (await fetch(FEED)).text()).split("\n").map((l) => l.trim()).filter(Boolean).map(stripUrl);
mkdirSync("data/feeds/openphish", { recursive: true });
const existing = existsSync(file) ? readFileSync(file, "utf8") : "";
const known = new Set(existing.split("\n").map((l) => l.split("\t")[1]).filter(Boolean));
const fresh = [...new Set(urls)].filter((u) => !known.has(u));
writeFileSync(file, existing + fresh.map((u) => `${date}\t${u}\n`).join(""));
console.log(`${fresh.length} new of ${urls.length} feed entries, archived in ${file}`);
