// URL-structure heuristics + the ML domain model.
import lexicon from "@/lib/data/lexicon.json";
import { predictDomain } from "./domain-model";
import { signal, type LayerResult, type Signal } from "./types";
import type { ParsedTarget } from "./url";

const SHORTENERS = new Set(lexicon.shorteners);
const PATH_KEYWORDS = lexicon.suspicious_keywords.filter((k) => k.length >= 4);
// The model's list is frozen (it is a trained feature); heuristics may use a longer list.
const FREE_HOSTING = [...lexicon.free_hosting_suffixes, ...lexicon.free_hosting_extra];

export interface LexicalData {
  modelProbability: number | null;
  features: Record<string, number> | null;
  urlLength: number;
  subdomainDepth: number;
  pathKeywords: string[];
  isShortener: boolean;
  isFreeHosting: boolean;
}

export function analyzeLexical(t: ParsedTarget): LayerResult<LexicalData> {
  const start = Date.now();
  const s: Signal[] = [];
  const L = "lexical" as const;

  if (t.isIp) s.push(signal(L, "ip_host", 2.2, { host: t.hostname }));
  if (t.username || t.input.split("?")[0].split("#")[0].replace(/^[a-z]+:\/\//i, "").split("/")[0].includes("@"))
    s.push(signal(L, "userinfo_at", 2.5));
  if (t.port && ![80, 443].includes(t.port)) s.push(signal(L, "nonstandard_port", 0.8, { port: t.port }));
  if (t.scheme === "http") s.push(signal(L, "no_https", 0.4));
  if (t.hostname.startsWith("xn--") || t.hostname.includes(".xn--")) s.push(signal(L, "punycode", 1.0, { unicode: t.unicodeHost }));

  const isShortener = SHORTENERS.has(t.registrable) || SHORTENERS.has(t.hostname);
  if (isShortener) s.push(signal(L, "shortener", 0.6, { domain: t.registrable }));

  const isFreeHosting = FREE_HOSTING.some((f) => t.suffix === f || t.suffix.endsWith("." + f) || t.hostname.endsWith("." + f));
  if (isFreeHosting) s.push(signal(L, "free_hosting", 0.9, { suffix: t.suffix }));

  const subdomainLabels = t.subdomain ? t.subdomain.split(".").filter((l) => l !== "www") : [];
  if (subdomainLabels.length >= 3) s.push(signal(L, "deep_subdomains", 0.9, { count: subdomainLabels.length }));
  // "paypal.com.secure-login.net" – a full domain hidden inside the subdomain.
  if (/\.(com|net|org|de|co|io)(\.|$)/.test(t.subdomain)) s.push(signal(L, "domain_in_subdomain", 1.6, { subdomain: t.subdomain }));

  const tail = `${t.path} ${t.query}`.toLowerCase();
  const pathKeywords = PATH_KEYWORDS.filter((k) => tail.includes(k)).slice(0, 5);
  if (pathKeywords.length >= 2) s.push(signal(L, "path_keywords", 0.7, { words: pathKeywords.join(", ") }));
  if (/(^|[?&])(url|redirect|redirect_uri|next|goto|target|dest|continue|return)=https?:/i.test(t.query))
    s.push(signal(L, "open_redirect_param", 0.8));
  if (/\/\/.+\/\//.test(t.href.replace(/^https?:\/\//, "//"))) s.push(signal(L, "double_slash_path", 0.4));
  if (/\/ipfs\/|\.ipfs\./i.test(t.href)) s.push(signal(L, "ipfs", 1.5));
  if ((t.href.match(/%[0-9a-f]{2}/gi)?.length ?? 0) > 10) s.push(signal(L, "heavy_encoding", 0.5));
  if (t.href.length > 120) s.push(signal(L, "long_url", 0.3, { length: t.href.length }));
  if (/\.(exe|scr|zip|rar|iso|img|apk|msi|js|vbs|hta|lnk)(\?|$)/i.test(t.path)) s.push(signal(L, "executable_download", 1.2));

  let modelProbability: number | null = null;
  let features: Record<string, number> | null = null;
  if (!t.isIp && t.sld) {
    const pred = predictDomain(t.hostname);
    modelProbability = pred.probability;
    features = pred.features;
    // The model's logit is a calibrated likelihood ratio; damp it so one layer can't dominate.
    const w = Math.max(-2, Math.min(2.5, pred.logit * 0.7));
    s.push(signal(L, "ml_domain", Number(w.toFixed(2)), { p: Math.round(pred.probability * 100) }));
  }

  return {
    layer: "lexical",
    status: "ok",
    ms: Date.now() - start,
    signals: s,
    data: {
      modelProbability,
      features,
      urlLength: t.href.length,
      subdomainDepth: subdomainLabels.length,
      pathKeywords,
      isShortener,
      isFreeHosting,
    },
  };
}
