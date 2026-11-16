// Brand-impersonation detection. The core insight from Phishpedia / PhishIntention /
// KnowPhish: a page or URL that *claims* a brand while living on a domain that brand
// does not own is the single strongest phishing indicator.
import lexicon from "@/lib/data/lexicon.json";
import { kbBrandAt } from "./brand-kb";
import { BRANDS } from "./lexical-features";
import { PLATFORM_OWNERS, platformOwner } from "./platform";
import { isUserContentHost } from "./reputation";
import { signal, type LayerResult, type Signal } from "./types";
import { parseTarget, type ParsedTarget } from "./url";

// Unicode TR39-style skeleton for the confusables attackers actually use.
const CONFUSABLES: Record<string, string> = {
  а: "a", е: "e", о: "o", р: "p", с: "c", у: "y", х: "x", і: "i", ј: "j", ԁ: "d", ɡ: "g", һ: "h", ӏ: "l", ѕ: "s", ԝ: "w", ʏ: "y",
  α: "a", ο: "o", ρ: "p", ν: "v", τ: "t", ι: "i", κ: "k", μ: "u", ϲ: "c", ɑ: "a", ı: "i", ł: "l", ø: "o", ß: "b",
  á: "a", à: "a", â: "a", ä: "a", ã: "a", å: "a", é: "e", è: "e", ê: "e", ë: "e", í: "i", ì: "i", î: "i", ï: "i",
  ó: "o", ò: "o", ô: "o", ö: "o", õ: "o", ú: "u", ù: "u", û: "u", ü: "u", ç: "c", ñ: "n", ý: "y",
};
const ASCII_LOOKALIKES: [RegExp, string][] = [
  [/rn/g, "m"], [/vv/g, "w"], [/cl/g, "d"], [/0/g, "o"], [/1/g, "l"], [/3/g, "e"], [/5/g, "s"], [/\$/g, "s"], [/@/g, "a"],
];

export function skeleton(s: string): string {
  let out = "";
  for (const ch of s.normalize("NFKC").toLowerCase()) out += CONFUSABLES[ch] ?? ch;
  for (const [re, rep] of ASCII_LOOKALIKES) out = out.replace(re, rep);
  return out;
}

/** Damerau–Levenshtein (optimal string alignment) distance. */
export function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

function scripts(s: string): Set<string> {
  const out = new Set<string>();
  for (const ch of s) {
    if (/\p{Script=Latin}/u.test(ch)) out.add("Latin");
    else if (/\p{Script=Cyrillic}/u.test(ch)) out.add("Cyrillic");
    else if (/\p{Script=Greek}/u.test(ch)) out.add("Greek");
    else if (/\p{L}/u.test(ch)) out.add("Other");
  }
  return out;
}

const OFFICIAL = new Map<string, string>(); // registrable -> brand
for (const [brand, domains] of Object.entries(BRANDS)) for (const d of domains) OFFICIAL.set(d, brand);
// Brand-owned pages on hosting platforms (microsoft.github.io), kept out of officialSlds below so
// that "github" does not become a typosquatting target through every org page.
const PLATFORM = new Map(Object.entries(PLATFORM_OWNERS));

// "ebay" -> "ebay": the brand behind the name part of each official domain.
const OFFICIAL_BY_SLD = new Map([...OFFICIAL].map(([d, b]) => [d.split(".")[0], b] as const).reverse());

const officialSlds = [...new Set([...OFFICIAL.keys()].map((d) => d.split(".")[0]))].filter((s) => s.length >= 4);

/** Is the label exactly a brand name or the name part of an official domain ("paypal", "ebay")? */
export const isBrandName = (label: string) => Boolean(BRANDS[label]) || OFFICIAL_BY_SLD.has(label);

export const isOfficialDomain = (registrable: string) => OFFICIAL.has(registrable) || PLATFORM.has(registrable);

/**
 * Is the domain an official site of the brand? Besides the curated list this asks the
 * Wikidata knowledge base, which knows group members such as the individual Sparkassen.
 */
export function ownsBrand(registrable: string, brand: string): boolean {
  return (BRANDS[brand]?.includes(registrable) ?? false) || platformOwner(registrable) === brand || kbBrandAt(brand, registrable);
}

/** Find brands mentioned as whole tokens (or long substrings) in a piece of text. */
export function brandsIn(text: string): string[] {
  const lower = text.toLowerCase();
  const tokens = new Set(lower.split(/[^a-z0-9]+/).filter(Boolean));
  const hits: string[] = [];
  for (const brand of Object.keys(BRANDS)) {
    const compact = brand.replace(/-/g, "");
    if (tokens.has(brand) || tokens.has(compact) || (compact.length >= 6 && lower.includes(compact))) hits.push(brand);
  }
  return hits;
}

const AFFIX_STOP = new Set(lexicon.brand_affix_stoplist);
const KEYWORDS = lexicon.suspicious_keywords.filter((k) => k.length >= 4);
const AFFIX_BRANDS = Object.keys(BRANDS).filter((b) => b.length >= 3 && !AFFIX_STOP.has(b) && !b.includes("-"));

/** Brands glued to other words inside a label: "mydpd", "paypalhelp", "dhl-paket". */
export function brandAffixes(label: string): string[] {
  return AFFIX_BRANDS.filter((b) => label !== b && (label.startsWith(b) || label.endsWith(b)));
}

export interface BrandData {
  claimedBrands: string[];
  officialBrand: string | null;
  typosquatOf: string | null;
  homoglyphOf: string | null;
  scripts: string[];
}

export function analyzeBrand(t: ParsedTarget): LayerResult<BrandData> {
  const start = Date.now();
  const signals: Signal[] = [];
  const ownedPlatformPage = PLATFORM.get(t.registrable) ?? null;
  const officialBrand = ownedPlatformPage ?? OFFICIAL.get(t.registrable) ?? OFFICIAL.get(t.icannDomain) ?? null;

  // 1. Brand mentioned in subdomain / free-hosting label / path while the domain is not theirs.
  // Brands that are also everyday words ("booking", "apple", "orange") only count in the
  // host name when phishing vocabulary sits next to them ("apple-id-verify").
  const phishy = KEYWORDS.some((k) => t.hostname.includes(k));
  const subLabels = t.subdomain.split(".").filter((l) => l && l !== "www");
  const hostClaims = [
    ...brandsIn(`${t.subdomain} ${t.isPrivateSuffix ? t.sld : ""}`),
    ...subLabels.flatMap(brandAffixes),
  ].filter((b) => phishy || !AFFIX_STOP.has(b));
  const sldClaims = brandsIn(t.sld.replace(/-/g, " "))
    .concat(Object.keys(BRANDS).filter((b) => b.length >= 5 && t.sld.includes(b) && t.sld !== b))
    .filter((b) => phishy || !AFFIX_STOP.has(b));
  const pathClaims = brandsIn(`${t.path} ${t.query}`);
  // "github-laziji.github.io": the platform operator's name in a page name is common and harmless,
  // unless phishing vocabulary sits next to it ("github-login-verify.github.io").
  const operator = hostOperator(t);
  const claimed = [...new Set([...hostClaims, ...sldClaims, ...pathClaims])].filter(
    (b) => !ownsBrand(t.registrable, b) && !ownsBrand(t.icannDomain, b) && (phishy || b !== operator),
  );

  // A platform page named exactly after a brand (facebook.github.io) whose owner could not be
  // confirmed: platform names are first come, first served, but the big brands usually hold their
  // own. Without phishing vocabulary this alone stays a hint ("suspicious" at most); a login form or
  // a brand logo on the page still makes it dangerous.
  const exactBrand = BRANDS[t.sld] ? t.sld : (OFFICIAL_BY_SLD.get(t.sld) ?? null);
  const unverifiedPlatformBrand = t.isPrivateSuffix && !officialBrand && !phishy && !subLabels.length ? exactBrand : null;

  if (!officialBrand) {
    const inHost = claimed.filter((b) => (hostClaims.includes(b) || sldClaims.includes(b)) && b !== unverifiedPlatformBrand);
    if (inHost.length) signals.push(signal("brand", "brand_in_host", 2.6, { brand: inHost[0], domain: t.registrable }));
    else {
      const inPath = claimed.filter((b) => b !== unverifiedPlatformBrand);
      if (inPath.length) signals.push(signal("brand", "brand_in_path", 1.2, { brand: inPath[0], domain: t.registrable }));
    }
  }

  // 2. Typosquatting / lookalike of an official brand domain.
  let typosquatOf: string | null = null;
  let homoglyphOf: string | null = null;
  const unicodeSld = t.unicodeHost.split(".").slice(-1 - t.suffix.split(".").length, -t.suffix.split(".").length).join("") || t.sld;
  if (!officialBrand && !t.isIp && t.sld) {
    const skel = skeleton(unicodeSld);
    for (const off of officialSlds) {
      if (t.sld === off) continue;
      if (skel === off) {
        homoglyphOf = off;
        break;
      }
      const dist = editDistance(t.sld, off);
      if ((dist === 1 && off.length >= 5) || (dist === 2 && off.length >= 9)) {
        typosquatOf = off;
        break;
      }
    }
    // Lookalikes inside compound names: "arnazon-prime-support", "paypa1-secure".
    if (!homoglyphOf && !typosquatOf) {
      const tokens = unicodeSld.split("-").filter((x) => x.length >= 4);
      for (const off of officialSlds) {
        for (const tok of tokens) {
          if (tok === off) continue;
          if (skeleton(tok) === off) homoglyphOf = off;
          else if (off.length >= 5 && editDistance(tok, off) === 1) typosquatOf = off;
          if (homoglyphOf || typosquatOf) break;
        }
        if (!homoglyphOf && !typosquatOf && off.length >= 5 && !unicodeSld.includes(off) && skeleton(unicodeSld).includes(off)) homoglyphOf = off;
        if (homoglyphOf || typosquatOf) break;
      }
    }
    // Same name, different TLD: paypal.co.in, amazon-de.net etc.
    if (!typosquatOf && !homoglyphOf && officialSlds.includes(t.sld) && !unverifiedPlatformBrand) typosquatOf = t.sld;
  }
  // Typosquats hidden in subdomains: "ehay.item.example.com".
  if (!officialBrand && !homoglyphOf && !typosquatOf) {
    const brandLabels = Object.keys(BRANDS).filter((b) => b.length >= 4 && !b.includes("-"));
    for (const label of subLabels) {
      const hit = brandLabels.find((b) => label !== b && label.length >= 4 && (skeleton(label) === b || editDistance(label, b) === 1));
      if (hit) {
        signals.push(signal("brand", "typosquat_subdomain", 2.0, { brand: hit, label }));
        break;
      }
    }
  }

  if (homoglyphOf) signals.push(signal("brand", "homoglyph", 3.5, { brand: homoglyphOf, host: t.unicodeHost }));
  else if (typosquatOf) signals.push(signal("brand", "typosquat", 2.8, { brand: typosquatOf, domain: t.registrable }));

  if (unverifiedPlatformBrand && !homoglyphOf && !typosquatOf)
    signals.push(signal("brand", "brand_platform_unverified", 1.2, { brand: unverifiedPlatformBrand, domain: t.registrable }));

  // 3. Mixed scripts in one label (Latin + Cyrillic) is almost never legitimate.
  const sc = scripts(t.unicodeHost);
  if (sc.size > 1) signals.push(signal("brand", "mixed_script", 2.5, { scripts: [...sc].join(" + ") }));

  // sites.google.com belongs to Google, the page on it does not: user content never earns the brand's credit.
  if (officialBrand && (ownedPlatformPage || !isUserContentHost(t))) signals.push({ ...signal("brand", "official_brand_domain", -2.5, { brand: officialBrand }) });

  return {
    layer: "brand",
    status: "ok",
    ms: Date.now() - start,
    signals,
    data: { claimedBrands: claimed, officialBrand, typosquatOf, homoglyphOf, scripts: [...sc] },
  };
}

const CODE_HOSTS = new Set(["github.com", "gitlab.com", "codeberg.org", "bitbucket.org"]);

/**
 * A page on a hosting platform that forwards to its own project under the same name is no cloaking
 * trick: jquery.github.io to github.com/jquery, webpack.github.io to webpack.js.org, mermaid-js.github.io
 * to mermaid.js.org. Forwarding to anything that shows brand signals never counts as harmless.
 */
export function forwardsToOwnName(t: ParsedTarget, href: string): boolean {
  if (!t.isPrivateSuffix || t.sld.length < 3) return false;
  let dest: ParsedTarget;
  let url: URL;
  try {
    url = new URL(href, `https://${t.hostname}/`);
    dest = parseTarget(url.href);
  } catch {
    return false;
  }
  const name = t.sld.toLowerCase();
  const same = (label: string) => label === name || (label.length >= 4 && name.split("-")[0] === label);
  const owner = url.pathname.split("/")[1]?.toLowerCase() ?? "";
  const matches = CODE_HOSTS.has(dest.registrable) ? same(owner) : same(dest.sld.toLowerCase().split(".")[0]);
  return matches && !analyzeBrand(dest).signals.some((s) => s.weight > 0);
}

// The company that runs a hosting platform. Its name appears on every page there ("Site not found ·
// GitHub Pages", "Deployed on Cloudflare Pages"), so it is no brand claim by the page owner.
const HOST_OPERATOR: Record<string, string> = {
  "github.io": "github", "gitlab.io": "gitlab", "pages.dev": "cloudflare", "workers.dev": "cloudflare",
  "web.app": "google", "firebaseapp.com": "google", "azurewebsites.net": "microsoft",
};

export const hostOperator = (t: ParsedTarget): string | null => HOST_OPERATOR[t.suffix] ?? null;
