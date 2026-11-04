// Visual brand check: which organisation does the rendered page present itself as, and is
// the site it runs on really that organisation's? This brand-to-domain consistency check is
// the core of Phishpedia, PhishIntention, PhishLLM and KnowPhish. Claude only names the
// brand and what the page asks for; whether the domain is official is decided here from the
// curated list and the Wikidata knowledge base, so a page cannot talk its way into "official".
import { BRANDS } from "./lexical-features";
import { brandsIn } from "./brand";
import { kbBrandAt, kbDomainsFor } from "./brand-kb";
import { isUserContentHost, trancoRank } from "./reputation";
import { signal, type LayerResult, type Signal } from "./types";
import { parseTarget } from "./url";
import type { AiVerdict } from "./ai";

export interface VisualData {
  brand: string | null;
  domain: string;
  outcome: "official" | "mismatch" | "unverified" | "no_brand";
  /** Official domains we know for the brand (curated list and Wikidata). */
  known: string[];
  asks: string[];
}

// Site builders and hosts appear on countless genuine small sites ("Powered by Wix", a Shopify
// checkout). KnowPhish (USENIX Security 2024) traced a large share of a comparable detector's false
// alarms to such platform brands, so they never count as an impersonated brand here.
const PLATFORMS = /^(wix|squarespace|wordpress|shopify|jimdo|webflow|weebly|godaddy|ionos|strato|hostinger|one\.com|hostpoint|all-inkl)(\.com)?$/i;

const SENSITIVE = new Set(["password", "payment_card", "bank_details", "one_time_code", "crypto_wallet"]);
// Parcel and toll scams start with name and address and ask for the card on the next page.
const PERSONAL = "personal_data";
const reg = (d: string) => {
  try {
    return parseTarget(d).registrable;
  } catch {
    return "";
  }
};

export function analyzeVisual(ai: AiVerdict, finalUrl: string, ms = 0): LayerResult<VisualData> {
  const V = "visual" as const;
  const t = parseTarget(finalUrl);
  const domain = t.registrable;
  const brand = ai.brand_on_page?.trim() || null;
  const asks = ai.requests.filter((r) => r !== "none");
  const data: VisualData = { brand, domain, outcome: "no_brand", known: [], asks };
  const signals: Signal[] = [];
  if (!brand) return { layer: V, status: "ok", ms, signals, data };
  if (PLATFORMS.test(brand)) {
    data.outcome = "unverified";
    return { layer: V, status: "ok", ms, signals, data };
  }

  const known = new Set<string>([...kbDomainsFor(brand), ...brandsIn(brand).flatMap((b) => BRANDS[b] ?? [])]);
  data.known = [...known].slice(0, 8);
  const userContent = isUserContentHost(t);
  const official = !userContent && (known.has(domain) || known.has(t.icannDomain) || kbBrandAt(brand, domain));
  const sensitive = asks.some((a) => SENSITIVE.has(a));
  const personal = asks.includes(PERSONAL);

  if (official) {
    data.outcome = "official";
    signals.push(signal(V, "visual_brand_official", -1.5, { brand, domain }));
    return { layer: V, status: "ok", ms, signals, data };
  }

  // Large, established sites show other brands all the time (news, shops, reviews).
  const rank = trancoRank(domain);
  const popular = !userContent && rank !== null && rank <= 50_000;
  // Claude's own list of official domains may only spare a domain, never condemn one.
  const claimed = new Set(ai.brand_domains.map(reg).filter(Boolean));
  if (popular || (claimed.has(domain) && (known.size === 0 || (rank !== null && rank <= 100_000)))) {
    data.outcome = "unverified";
    return { layer: V, status: "ok", ms, signals, data };
  }

  if ((sensitive || personal) && (known.size > 0 || claimed.size > 0)) {
    data.outcome = "mismatch";
    // Full weight only when the brand's real domains are on record; Claude's knowledge alone counts less.
    const w = (known.size > 0 ? 3.2 : 1.6) * (sensitive ? 1 : 0.7);
    signals.push(signal(V, "visual_brand_mismatch", Number(w.toFixed(2)), { brand, domain }));
  } else {
    data.outcome = "unverified";
  }
  return { layer: V, status: "ok", ms, signals, data };
}
