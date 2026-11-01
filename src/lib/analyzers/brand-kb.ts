// Lookup into the Wikidata brand knowledge base (scripts/build-brand-kb.mts):
// which domains does an organisation officially use, and whose official site is a domain.
import kb from "@/lib/data/brand-kb.json";

const LEGAL =
  /\b(ag|gmbh|mbh|se|inc|ltd|llc|plc|co|kg|kgaa|eg|ev|corp|corporation|company|sa|nv|bv|ab|asa|spa|holding|holdings|group|gruppe|the|und|and)\b/g;

/** Comparable form of an organisation name: no accents, legal form or punctuation. */
export function normName(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(LEGAL, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type Org = [id: string, names: string[], domains: string[]];
let index: { byName: Map<string, Set<string>>; byDomain: Map<string, string[]> } | null = null;

function load() {
  if (index) return index;
  const byName = new Map<string, Set<string>>();
  const byDomain = new Map<string, string[]>();
  for (const [, names, domains] of (kb as unknown as { orgs: Org[] }).orgs) {
    const normed = [...new Set(names.map(normName).filter((n) => n.length >= 2))];
    for (const n of normed) {
      const set = byName.get(n) ?? new Set();
      for (const d of domains) set.add(d);
      byName.set(n, set);
    }
    for (const d of domains) byDomain.set(d, [...(byDomain.get(d) ?? []), ...normed]);
  }
  index = { byName, byDomain };
  return index;
}

/** Official domains of an organisation with exactly this (normalised) name or alias. */
export function kbDomainsFor(brand: string): Set<string> {
  return load().byName.get(normName(brand)) ?? new Set();
}

/** Normalised names of the organisations whose official website is this domain. */
export function kbOrgsAt(domain: string): string[] {
  return load().byDomain.get(domain) ?? [];
}

const words = (s: string) => ` ${s} `;

/**
 * Does the domain belong to an organisation carrying this brand name? Covers groups with
 * many members: "Sparkasse" matches the official site of "Sparkasse KölnBonn".
 */
export function kbBrandAt(brand: string, domain: string): boolean {
  const b = normName(brand);
  if (b.length < 3) return false;
  return kbOrgsAt(domain).some((n) => n === b || (b.length >= 4 && words(n).includes(words(b))) || (n.length >= 6 && words(b).includes(words(n))));
}
