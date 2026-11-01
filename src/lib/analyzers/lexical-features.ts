// TypeScript twin of ml/features.py – keep both files in sync.
// The parity test in src/lib/__tests__/parity.test.ts fails if they drift apart.
import { parse } from "tldts";
import brands from "@/lib/data/brands.json";
import lexicon from "@/lib/data/lexicon.json";

export const BRANDS = brands as Record<string, string[]>;
const KEYWORDS = lexicon.suspicious_keywords.filter((k) => k.length >= 4 && /^[\x00-\x7f]*$/.test(k));
const FREE_HOSTING = lexicon.free_hosting_suffixes;
const BRAND_NAMES = Object.keys(BRANDS).filter((b) => b.length >= 4);
const VOWELS = new Set("aeiou");
const NGRAM_N = 3;

export const FEATURE_NAMES = [
  "sld_len",
  "sld_digit_count",
  "sld_digit_ratio",
  "sld_hyphen_count",
  "sld_entropy",
  "sld_vowel_ratio",
  "sld_max_consonant_run",
  "sld_max_digit_run",
  "sld_max_repeat_run",
  "sld_token_count",
  "sld_longest_token",
  "sld_keyword_count",
  "sld_brand_hit",
  "is_punycode",
  "is_free_hosting",
  "suffix_levels",
  "tld_len",
  "tld_risk",
  "sld_ngram_llr",
] as const;

export interface FeatureContext {
  tldRisk: Record<string, number>;
  tldPrior: number;
  ngramLlr: Record<string, number>;
  ngramUnseen: number;
}

// Python's round() uses banker's rounding on exact halves; at 6 decimals on
// float inputs that practically never matters, so plain rounding is used.
const round = (x: number, d: number) => {
  const f = 10 ** d;
  return Math.round(x * f) / f;
};

const isDigit = (c: string) => c >= "0" && c <= "9";
const isAlpha = (c: string) => /\p{L}/u.test(c);

export function splitHost(host: string): { sld: string; suffix: string } {
  const p = parse(host.toLowerCase().replace(/^\.+|\.+$/g, ""), { allowPrivateDomains: true });
  return { sld: p.domainWithoutSuffix ?? "", suffix: p.publicSuffix ?? "" };
}

export function shannonEntropy(s: string): number {
  if (!s) return 0;
  const counts = new Map<string, number>();
  for (const ch of s) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  const n = [...s].length;
  let h = 0;
  for (const c of counts.values()) h -= (c / n) * Math.log2(c / n);
  return h;
}

function maxRun(s: string, pred: (c: string) => boolean): number {
  let best = 0;
  let cur = 0;
  for (const ch of s) {
    cur = pred(ch) ? cur + 1 : 0;
    best = Math.max(best, cur);
  }
  return best;
}

function maxRepeatRun(s: string): number {
  let best = 0;
  let cur = 0;
  let prev = "";
  for (const ch of s) {
    cur = ch === prev ? cur + 1 : 1;
    prev = ch;
    best = Math.max(best, cur);
  }
  return best;
}

function ngrams(sld: string): string[] {
  const padded = `^${sld}$`;
  const out: string[] = [];
  for (let i = 0; i <= padded.length - NGRAM_N; i++) out.push(padded.slice(i, i + NGRAM_N));
  return out;
}

function ngramLlr(sld: string, ctx: FeatureContext): number {
  const grams = ngrams(sld);
  if (!grams.length) return 0;
  let sum = 0;
  for (const g of grams) sum += ctx.ngramLlr[g] ?? ctx.ngramUnseen;
  return sum / grams.length;
}

export function brandHit(sld: string, registrable: string): number {
  for (const brand of BRAND_NAMES) {
    if (sld.includes(brand) && !BRANDS[brand].includes(registrable)) return 1;
  }
  return 0;
}

export function domainFeatures(host: string, ctx: FeatureContext): number[] {
  const { sld, suffix } = splitHost(host);
  const registrable = suffix ? `${sld}.${suffix}` : sld;
  const tld = suffix ? suffix.split(".").pop()! : "";
  const chars = [...sld];
  const letters = chars.filter(isAlpha);
  const digits = chars.filter(isDigit).length;
  const tokens = sld.split(/[-0-9]+/).filter(Boolean);

  return [
    chars.length,
    digits,
    sld ? round(digits / chars.length, 6) : 0,
    chars.filter((c) => c === "-").length,
    round(shannonEntropy(sld), 6),
    letters.length ? round(letters.filter((c) => VOWELS.has(c)).length / letters.length, 6) : 0,
    maxRun(sld, (c) => isAlpha(c) && !VOWELS.has(c)),
    maxRun(sld, isDigit),
    maxRepeatRun(sld),
    tokens.length,
    tokens.reduce((m, t) => Math.max(m, t.length), 0),
    KEYWORDS.filter((k) => sld.includes(k)).length,
    brandHit(sld, registrable),
    sld.startsWith("xn--") || suffix.includes("xn--") ? 1 : 0,
    FREE_HOSTING.some((f) => suffix === f || suffix.endsWith("." + f)) ? 1 : 0,
    suffix ? suffix.split(".").length : 0,
    tld.length,
    round(ctx.tldRisk[tld] ?? ctx.tldPrior, 6),
    round(ngramLlr(sld, ctx), 6),
  ];
}
