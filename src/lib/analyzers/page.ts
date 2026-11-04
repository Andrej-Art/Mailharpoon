// Live page inspection: fetch the page (SSRF-safe) and look for credential harvesting,
// brand impersonation, exfiltration and evasion techniques used by current phishing kits.
import * as cheerio from "cheerio";
import { parse } from "tldts";
import { safeFetch, type Hop } from "@/lib/net/safe-fetch";
import { brandsIn, isOfficialDomain, ownsBrand } from "./brand";
import { signal, type LayerResult, type Signal } from "./types";
import type { ParsedTarget } from "./url";

export interface FormInfo {
  action: string;
  actionDomain: string | null;
  method: string;
  hasPassword: boolean;
  hasEmail: boolean;
  hasCard: boolean;
  external: boolean;
}

export interface PageData {
  fetched: boolean;
  error?: string;
  status: number | null;
  finalUrl: string;
  finalDomain: string;
  hops: Hop[];
  title: string;
  description: string;
  language: string | null;
  forms: FormInfo[];
  pageBrands: string[];
  externalResourceRatio: number | null;
  externalLinkRatio: number | null;
  nullLinkRatio: number | null;
  iframes: number;
  hiddenIframes: number;
  scriptsInline: number;
  techniques: string[];
  textSample: string;
  faviconDomain: string | null;
  serverHeader: string | null;
}

const reg = (u: string) => parse(u, { allowPrivateDomains: true }).domain ?? null;

export async function analyzePage(t: ParsedTarget): Promise<LayerResult<PageData>> {
  const start = Date.now();
  const s: Signal[] = [];
  const P = "page" as const;

  const res = await safeFetch(t.href);
  const finalDomain = reg(res.finalUrl) ?? t.registrable;
  const base: PageData = {
    ...emptyPageData(res.finalUrl, finalDomain),
    fetched: res.ok,
    error: res.error,
    status: res.status,
    hops: res.hops,
    serverHeader: res.headers["server"] ?? null,
  };

  // Redirect behaviour
  const crossDomainHops = new Set(res.hops.map((h) => reg(h.url)).filter(Boolean));
  if (finalDomain !== t.registrable) s.push(signal(P, "cross_domain_redirect", 0.6, { from: t.registrable, to: finalDomain }));
  if (res.hops.length >= 4 || crossDomainHops.size >= 3) s.push(signal(P, "redirect_chain", 0.5, { hops: res.hops.length }));

  if (!res.ok || !res.body) {
    return {
      layer: "page",
      status: res.ok ? "ok" : "error",
      ms: Date.now() - start,
      signals: s,
      data: base,
      note: res.error,
    };
  }

  s.push(...inspectHtml(res.body, res.finalUrl, t, base));
  return { layer: "page", status: "ok", ms: Date.now() - start, signals: s, data: base };
}

export const emptyPageData = (finalUrl: string, finalDomain: string): PageData => ({
  fetched: true,
  status: null,
  finalUrl,
  finalDomain,
  hops: [],
  title: "",
  description: "",
  language: null,
  forms: [],
  pageBrands: [],
  externalResourceRatio: null,
  externalLinkRatio: null,
  nullLinkRatio: null,
  iframes: 0,
  hiddenIframes: 0,
  scriptsInline: 0,
  techniques: [],
  textSample: "",
  faviconDomain: null,
  serverHeader: null,
});

/**
 * Inspect one HTML document. Used for the fetched source and again for the DOM after the
 * browser ran the page's scripts. Fills `base` and returns the evidence it found.
 */
export function inspectHtml(html: string, finalUrl: string, t: ParsedTarget, base: PageData): Signal[] {
  const s: Signal[] = [];
  const P = "page" as const;
  const $ = cheerio.load(html);
  const pageHost = reg(finalUrl);
  const isExternal = (href: string | undefined) => {
    if (!href) return false;
    try {
      const d = reg(new URL(href, finalUrl).href);
      return Boolean(d && d !== pageHost);
    } catch {
      return false;
    }
  };

  base.title = $("title").first().text().trim().slice(0, 200);
  base.description = ($('meta[name="description"]').attr("content") ?? "").trim().slice(0, 300);
  base.language = $("html").attr("lang") ?? null;

  // Forms & credential harvesting
  $("form").each((_, el) => {
    const f = $(el);
    const action = (f.attr("action") ?? "").trim();
    let actionDomain: string | null = null;
    try {
      actionDomain = action && !/^(javascript|mailto|data):/i.test(action) ? reg(new URL(action, finalUrl).href) : pageHost;
    } catch {}
    const inputs = f.find("input");
    const attrs = inputs.toArray().map((i) => `${$(i).attr("type") ?? ""} ${$(i).attr("name") ?? ""} ${$(i).attr("autocomplete") ?? ""} ${$(i).attr("placeholder") ?? ""}`.toLowerCase());
    base.forms.push({
      action: action.slice(0, 200),
      actionDomain,
      method: (f.attr("method") ?? "get").toLowerCase(),
      hasPassword: attrs.some((a) => a.startsWith("password") || /passw|passwort|kennwort|pin\b/.test(a)),
      hasEmail: attrs.some((a) => /email|e-mail|user|login|account/.test(a)),
      hasCard: attrs.some((a) => /cc-number|card|cvv|cvc|kreditkarte|iban|expir/.test(a)),
      external: Boolean(actionDomain && actionDomain !== pageHost),
    });
  });
  // Password fields outside of <form> (common in JS-driven kits)
  const loosePassword = $('input[type="password"]').filter((_, el) => $(el).closest("form").length === 0).length > 0;

  const hasPassword = loosePassword || base.forms.some((f) => f.hasPassword);
  const hasCard = base.forms.some((f) => f.hasCard);
  if (hasPassword) s.push(signal(P, "password_field", 0.8));
  if (hasCard) s.push(signal(P, "card_field", 1.0));
  if (base.forms.some((f) => f.external && (f.hasPassword || f.hasEmail)))
    s.push(signal(P, "form_external_action", 1.0, { domain: base.forms.find((f) => f.external)!.actionDomain ?? "?" }));
  if (base.forms.some((f) => /^mailto:/i.test(f.action))) s.push(signal(P, "form_mailto", 2.0));
  if (hasPassword && t.scheme === "http" && !finalUrl.startsWith("https")) s.push(signal(P, "password_over_http", 2.0));

  // Brand impersonation on the page itself
  const visibleText = $("body").clone().find("script,style,noscript,svg").remove().end().text().replace(/\s+/g, " ").trim();
  base.textSample = visibleText.slice(0, 2500);
  // "Sign in with Google / Apple / Microsoft" buttons are legitimate federated login, not impersonation.
  // reCAPTCHA notices ("protected by reCAPTCHA and the Google Privacy Policy") are not a brand claim either.
  const RECAPTCHA = /\b(google\s+)?re-?captcha\b|\bgoogle(['’]s)?\s+(privacy\s+policy|terms(\s+of\s+(service|use))?|datenschutzerkl\w+|nutzungsbedingungen)/gi;
  const OAUTH = /\b(sign\s*in|log\s*in|login|continue|sign\s*up|register|anmelden|einloggen|fortfahren|weiter|registrieren)\s+(with|via|using|mit|über)\s+(google|apple|facebook|microsoft|github|gitlab|twitter|x|discord|linkedin|amazon|paypal|steam|yahoo)\b/gi;
  const brandText = `${base.title} ${base.description} ${$("img[alt]").map((_, i) => $(i).attr("alt")).get().join(" ")} ${visibleText.slice(0, 4000)}`.replace(OAUTH, " ").replace(RECAPTCHA, " ");
  base.pageBrands = brandsIn(brandText).filter((b) => !ownsBrand(base.finalDomain, b) && !ownsBrand(t.registrable, b));
  const titleBrands = brandsIn(base.title).filter((b) => base.pageBrands.includes(b));
  if ((hasPassword || hasCard) && titleBrands.length) {
    s.push(signal(P, "brand_login_mismatch", 3.0, { brand: titleBrands[0], domain: base.finalDomain }));
  } else if ((hasPassword || hasCard) && base.pageBrands.length) {
    s.push(signal(P, "brand_login_mismatch", 1.4, { brand: base.pageBrands[0], domain: base.finalDomain }));
  } else if (titleBrands.length) {
    s.push(signal(P, "brand_title_mismatch", 0.9, { brand: titleBrands[0], domain: base.finalDomain }));
  }

  // Resource & link structure (UCI "Request_URL" / "URL_of_Anchor" / "Links_in_tags", modernised)
  const resources = $("img[src],script[src],link[href]").toArray().map((el) => $(el).attr("src") ?? $(el).attr("href"));
  if (resources.length >= 5) {
    base.externalResourceRatio = resources.filter(isExternal).length / resources.length;
    if (base.externalResourceRatio > 0.8 && hasPassword) s.push(signal(P, "external_resources", 0.7, { pct: Math.round(base.externalResourceRatio * 100) }));
  }
  const anchors = $("a").toArray().map((el) => ($(el).attr("href") ?? "").trim());
  if (anchors.length >= 3) {
    base.nullLinkRatio = anchors.filter((h) => !h || h === "#" || /^javascript:/i.test(h)).length / anchors.length;
    base.externalLinkRatio = anchors.filter(isExternal).length / anchors.length;
    if (base.nullLinkRatio > 0.6 && hasPassword) s.push(signal(P, "dead_links", 0.8, { pct: Math.round(base.nullLinkRatio * 100) }));
  } else if (hasPassword && anchors.length === 0) {
    s.push(signal(P, "no_navigation", 0.5));
  }

  const fav = $('link[rel*="icon"]').attr("href");
  if (fav) {
    try {
      base.faviconDomain = reg(new URL(fav, finalUrl).href);
      if (base.faviconDomain && base.faviconDomain !== pageHost) {
        const favBrand = Object.keys(BRAND_FAVICON_HINT).find((b) => base.faviconDomain!.includes(b));
        if (favBrand && !isOfficialDomain(base.finalDomain)) s.push(signal(P, "favicon_hotlink", 1.2, { domain: base.faviconDomain }));
      }
    } catch {}
  }

  // iframes
  $("iframe").each((_, el) => {
    base.iframes++;
    const st = `${$(el).attr("style") ?? ""} ${$(el).attr("width") ?? ""}x${$(el).attr("height") ?? ""}`.toLowerCase();
    if (/display:\s*none|visibility:\s*hidden|\b0x0\b|\b1x1\b/.test(st)) base.hiddenIframes++;
  });
  if (base.hiddenIframes) s.push(signal(P, "hidden_iframe", 0.6, { count: base.hiddenIframes }));

  // Script-level techniques used by phishing kits
  const scripts = $("script").map((_, el) => $(el).html() ?? "").get().join("\n");
  base.scriptsInline = $("script:not([src])").length;
  const techniques: [string, RegExp, number][] = [
    ["telegram_exfil", /api\.telegram\.org\/bot|tg_bot_token|chat_id\s*[:=]/i, 2.6],
    ["discord_webhook", /discord(app)?\.com\/api\/webhooks/i, 2.2],
    ["obfuscated_js", /eval\s*\(\s*(atob|unescape|function\s*\(p,a,c,k,e)|String\.fromCharCode\((\s*\d+\s*,){20}|_0x[a-f0-9]{4,}\[/i, 0.9],
    ["doc_write_b64", /document\.write\s*\(\s*(atob|unescape|decodeURIComponent)/i, 1.2],
    ["right_click_block", /oncontextmenu\s*=\s*["']?\s*return\s+false|event\.button\s*==\s*2/i, 0.5],
    ["devtools_block", /debugger;|devtools.*(open|detect)|keyCode\s*==\s*123/i, 0.7],
    ["anti_bot_cloak", /navigator\.webdriver|headless|botd|ipinfo\.io|ip-api\.com|ipapi\.co/i, 0.6],
    ["aitm_proxy", /evilginx|modlishka|\/common\/oauth2\/v2\.0\/authorize.*proxy/i, 2.0],
    ["clipboard_hijack", /navigator\.clipboard\.writeText\([^)]*(powershell|cmd|mshta)/i, 3.0], // "ClickFix"
    ["email_autofill", /[#?&](email|e|u|login)=[^&]*@|location\.hash.*atob/i, 0.6],
  ];
  for (const [id, re, w] of techniques) {
    if (re.test(scripts) || (id === "right_click_block" && re.test(html))) {
      base.techniques.push(id);
      s.push(signal(P, `tech_${id}`, w));
    }
  }
  const b64Blob = html.match(/[A-Za-z0-9+/=]{3000,}/);
  if (b64Blob && !/data:image|data:font|woff/i.test(html.slice(Math.max(0, b64Blob.index! - 40), b64Blob.index))) {
    base.techniques.push("large_base64_blob");
    s.push(signal(P, "tech_large_base64_blob", 0.6));
  }

  const refresh = $('meta[http-equiv="refresh" i]').attr("content");
  if (refresh && /url=/i.test(refresh) && isExternal(refresh.split(/url=/i)[1]?.replace(/['"]/g, "")))
    s.push(signal(P, "meta_refresh_external", 0.8));

  // Thin page that only exists to bounce the visitor somewhere else
  if (visibleText.length < 80 && /location\.(href|replace)|window\.location\s*=/.test(scripts)) s.push(signal(P, "js_redirect_stub", 0.5));

  if (!hasPassword && !hasCard && base.pageBrands.length === 0 && visibleText.length > 1500 && anchors.length > 20)
    s.push(signal(P, "content_rich", -0.5));

  // The hosting provider itself already flagged the site (Cloudflare interstitial).
  if (/suspected phishing\s*\|\s*cloudflare/i.test(base.title) || /this website has been reported for potential phishing/i.test(visibleText))
    s.push(signal(P, "host_phishing_warning", 3.0, { provider: "Cloudflare" }));
  // A home-made "verifying your browser" screen keeps scanners away from the real page.
  // Genuine challenge services (Cloudflare, DDoS-Guard, Sucuri) are recognisable and excluded.
  else if (GATE_RE.test(visibleText) && !/challenges\.cloudflare\.com|_cf_chl_opt|cf-chl|ddos-guard|sucuri/i.test(html))
    s.push(signal(P, "fake_browser_check", hasPassword ? 1.6 : 0.8));

  // Text that addresses an AI scanner instead of the visitor, often hidden in comments or invisible
  // elements. Genuine pages have no reason to instruct a classifier; phishing kits started doing it
  // to talk LLM-based detectors into "safe" (Koide et al., 2026).
  if (INJECTION_RE.test(html)) s.push(signal(P, "prompt_injection", 1.5));

  return s;
}

export const INJECTION_RE =
  /ignore (all |any )?(previous|prior|above|earlier) (instructions|prompts)|(classify|mark|rate|label|report) (this|the) (page|site|website|url|link) as (safe|legitimate|benign|harmless)|(you are|as) an? (ai|llm|language model|security (scanner|classifier))[^.]{0,80}(must|should) (answer|respond|classify|return)|<\/?(system|assistant)_?(prompt)?>/i;

export const GATE_RE =
  /verifying (your|the) browser|checking (your browser|if the site connection is secure)|browser verification|human verification|security check in progress|(überprüf|prüf)\w* (ihren |deinen )?browser/i;

// Favicon hosts that kits hot-link to borrow a brand's identity.
const BRAND_FAVICON_HINT: Record<string, true> = {
  microsoft: true, office: true, live: true, paypal: true, apple: true, google: true, amazon: true, netflix: true,
  facebook: true, instagram: true, dhl: true, adobe: true, dropbox: true, docusign: true, linkedin: true,
};
