// What the domain model "sees" in a name, in plain terms, for the animated example on the
// methodology page. The score is the real model output; the findings explain the features it uses.
import { predictDomain } from "./analyzers/domain-model";
import { BRAND_NAMES, BRANDS, KEYWORDS, splitHost } from "./analyzers/lexical-features";

export type FindingKind = "brand" | "keyword" | "digit" | "digits" | "hyphen" | "hyphens" | "random" | "natural" | "tldRisky" | "tldCommon";

export interface Finding {
  kind: FindingKind;
  value: string;
  /** Character ranges in the full host this finding lights up, end exclusive. */
  spans: [number, number][];
}

export interface DomainReading {
  host: string;
  score: number;
  findings: Finding[];
}

const all = (s: string, sub: string): [number, number][] => {
  const out: [number, number][] = [];
  for (let i = s.indexOf(sub); i >= 0; i = s.indexOf(sub, i + 1)) out.push([i, i + sub.length]);
  return out;
};

export function readDomain(host: string): DomainReading {
  const { sld, suffix } = splitHost(host);
  const { probability, features: f } = predictDomain(host);
  const tld = suffix.split(".").pop() ?? "";
  const tldAt = host.length - tld.length;
  const findings: Finding[] = [];

  const brand = f.sld_brand_hit ? BRAND_NAMES.find((b) => sld.includes(b) && !BRANDS[b].includes(`${sld}.${suffix}`)) : undefined;
  if (brand) findings.push({ kind: "brand", value: brand, spans: all(sld, brand) });
  for (const k of KEYWORDS.filter((k) => sld.includes(k) && !brand?.includes(k)).slice(0, 2)) findings.push({ kind: "keyword", value: k, spans: all(sld, k) });
  if (f.sld_digit_count) findings.push({ kind: f.sld_digit_count === 1 ? "digit" : "digits", value: String(f.sld_digit_count), spans: [...sld].flatMap((c, i) => (c >= "0" && c <= "9" ? [[i, i + 1] as [number, number]] : [])) });
  if (f.sld_hyphen_count) findings.push({ kind: f.sld_hyphen_count === 1 ? "hyphen" : "hyphens", value: String(f.sld_hyphen_count), spans: all(sld, "-") });
  // Letter combinations rare in real names (n-gram log-likelihood ratio) read as random.
  if (f.sld_ngram_llr > 0.5) findings.push({ kind: "random", value: sld, spans: [[0, sld.length]] });
  else if (f.sld_ngram_llr < -0.1) findings.push({ kind: "natural", value: sld, spans: [[0, sld.length]] });
  if (f.tld_risk >= 0.3) findings.push({ kind: "tldRisky", value: tld, spans: [[tldAt, host.length]] });
  else if (f.tld_risk < 0.1) findings.push({ kind: "tldCommon", value: tld, spans: [[tldAt, host.length]] });

  return { host, score: Math.min(99, Math.max(1, Math.round(probability * 100))), findings };
}
