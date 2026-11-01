// Ablation for the rendered page check and the visual brand check.
// Every URL is scanned twice with the AI layer on and threat lists off:
//   before  = plain HTML fetch, AI reads text only (the previous pipeline)
//   after   = headless browser, AI also sees the screenshot, brand check against Wikidata
// Sets: fresh OpenPhish URLs, random legitimate domains (Tranco rank 300k+), and genuine
// login pages of well-known brands, the hardest case for a brand-mismatch check.
// Usage: npx tsx scripts/eval-visual.mts <tranco-top-1m.csv> [perSet]
import { readFileSync, writeFileSync } from "node:fs";
import { parse } from "tldts";
import { runScan, type Report } from "../src/lib/scan";

const [trancoFile, sizeArg] = process.argv.slice(2);
const SIZE = Number(sizeArg ?? 30);

const LOGINS = [
  "https://www.paypal.com/signin", "https://login.microsoftonline.com/", "https://accounts.google.com/",
  "https://www.amazon.de/ap/signin?openid.mode=checkid_setup&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0",
  "https://appleid.apple.com/sign-in", "https://www.dhl.de/de/privatkunden.html", "https://www.netflix.com/login",
  "https://www.instagram.com/accounts/login/", "https://www.linkedin.com/login", "https://www.dropbox.com/login",
  "https://banking.sparkasse-koelnbonn.de/", "https://meine.deutsche-bank.de/", "https://www.commerzbank.de/",
  "https://banking.dkb.de/login", "https://www.ing.de/", "https://www.postbank.de/", "https://www.comdirect.de/",
  "https://www.vodafone.de/meinvodafone/account/login", "https://www.telekom.de/kundencenter", "https://www.o2online.de/",
  "https://www.ebay.de/signin/", "https://www.otto.de/", "https://www.zalando.de/login", "https://www.tk.de/",
  "https://www.swm.de/", "https://www.dpd.com/de/de/", "https://www.hermesworld.com/de/", "https://www.adobe.com/",
  "https://github.com/login", "https://www.docusign.com/",
].slice(0, SIZE);

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

const seed = 20261101;
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

type Row = { set: string; url: string; before: number; after: number; visual: string | null; brand: string | null; renderMs: number | null; aiBefore: string | null; aiAfter: string | null };
const rows: Row[] = [];
const outcome = (r: Report) => (r.layers.find((l) => l.layer === "visual")?.data as { outcome?: string } | undefined)?.outcome ?? null;
const brandOf = (r: Report) => (r.layers.find((l) => l.layer === "visual")?.data as { brand?: string } | undefined)?.brand ?? null;
const aiNote = (r: Report) => {
  const l = r.layers.find((x) => x.layer === "ai");
  return l ? (l.status === "ok" ? "ok" : l.note ?? l.status) : null;
};

for (const [set, urls] of [["phish", phish], ["legit", legit], ["brand-login", LOGINS]] as const) {
  for (let i = 0; i < urls.length; i += 3) {
    await Promise.all(
      urls.slice(i, i + 3).map(async (url) => {
        try {
          const before = await runScan(url, { locale: "en", ai: true, intel: false, render: false }, () => {});
          const after = await runScan(url, { locale: "en", ai: true, intel: false }, () => {});
          const render = after.layers.find((l) => l.layer === "render");
          rows.push({
            set, url,
            before: before.result.score, after: after.result.score,
            visual: outcome(after), brand: brandOf(after),
            renderMs: render?.status === "ok" ? render.ms : null,
            aiBefore: aiNote(before), aiAfter: aiNote(after),
          });
          process.stderr.write(".");
        } catch {
          process.stderr.write("x");
        }
      }),
    );
  }
}
process.stderr.write("\n");

const rate = (xs: Row[], key: "before" | "after", thr: number) => (xs.length ? xs.filter((r) => r[key] >= thr).length / xs.length : 0);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const lines = ["| Set | n | Threshold | Before | After |", "|---|---|---|---|---|"];
for (const set of ["phish", "legit", "brand-login"]) {
  const xs = rows.filter((r) => r.set === set);
  for (const thr of [50, 70]) lines.push(`| ${set} | ${xs.length} | ${thr} | ${pct(rate(xs, "before", thr))} | ${pct(rate(xs, "after", thr))} |`);
}
const rendered = rows.filter((r) => r.renderMs !== null);
lines.push("", `Rendered: ${rendered.length}/${rows.length}, median render time ${rendered.map((r) => r.renderMs!).sort((a, b) => a - b)[Math.floor(rendered.length / 2)] ?? "-"} ms`);
for (const set of ["phish", "legit", "brand-login"]) {
  const xs = rows.filter((r) => r.set === set);
  const c = (o: string) => xs.filter((r) => r.visual === o).length;
  lines.push(`Brand check ${set}: official ${c("official")}, mismatch ${c("mismatch")}, unverified ${c("unverified")}, no brand ${c("no_brand")}`);
}
console.log(lines.join("\n"));
writeFileSync("ml/eval-visual.json", JSON.stringify({ date: new Date().toISOString().slice(0, 10), rows }, null, 2) + "\n");
process.exit(0);
