// The catalogue behind the full check report: every check a link scan runs, grouped by
// layer, with the signals that report a finding. A check without a signal in a layer that
// ran counts as passed, so readers see what was checked, not only what was found.
import type { NetworkData } from "@/lib/analyzers/network";
import type { ReputationData } from "@/lib/analyzers/reputation";
import type { Layer, LayerResult, Signal } from "@/lib/analyzers/types";

export interface CheckDef {
  /** Label key in the dictionary's `checks.items`. */
  id: string;
  signals: string[];
  /** Checks that can only speak for a link: without a signal they simply do not apply. */
  trust?: boolean;
}

export const CHECK_GROUPS: { layer: Layer; checks: CheckDef[] }[] = [
  {
    layer: "lexical",
    checks: [
      { id: "ip", signals: ["ip_host"] },
      { id: "at", signals: ["userinfo_at"] },
      { id: "https", signals: ["no_https"] },
      { id: "port", signals: ["nonstandard_port"] },
      { id: "chars", signals: ["punycode", "mixed_script"] },
      { id: "shortener", signals: ["shortener"] },
      { id: "hosting", signals: ["free_hosting", "ipfs"] },
      { id: "subdomains", signals: ["deep_subdomains", "domain_in_subdomain"] },
      { id: "keywords", signals: ["path_keywords", "tech_email_autofill"] },
      { id: "hiddenRedirect", signals: ["open_redirect_param", "double_slash_path"] },
      { id: "length", signals: ["long_url", "heavy_encoding"] },
      { id: "download", signals: ["executable_download"] },
      { id: "model", signals: ["ml_domain"] },
    ],
  },
  {
    layer: "brand",
    checks: [
      { id: "brandName", signals: ["brand_in_host", "brand_in_path"] },
      { id: "typo", signals: ["typosquat", "typosquat_subdomain", "homoglyph"] },
      { id: "official", signals: ["official_brand_domain"], trust: true },
    ],
  },
  {
    layer: "reputation",
    checks: [
      { id: "popularity", signals: ["tranco_rank", "user_content_platform"], trust: true },
      { id: "age", signals: ["domain_age", "domain_age_old", "short_registration"] },
      { id: "hold", signals: ["registry_hold"] },
      { id: "cert", signals: ["fresh_certificate"] },
    ],
  },
  {
    layer: "page",
    checks: [
      { id: "password", signals: ["password_field", "password_over_http"] },
      { id: "card", signals: ["card_field"] },
      { id: "formTarget", signals: ["form_external_action", "form_mailto"] },
      { id: "brandPage", signals: ["brand_login_mismatch", "brand_title_mismatch"] },
      { id: "copied", signals: ["external_resources", "dead_links", "no_navigation", "favicon_hotlink"] },
      { id: "obfuscation", signals: ["hidden_iframe", "tech_obfuscated_js", "tech_doc_write_b64", "tech_large_base64_blob"] },
      { id: "exfil", signals: ["tech_telegram_exfil", "tech_discord_webhook", "tech_aitm_proxy"] },
      { id: "antiScanner", signals: ["tech_right_click_block", "tech_devtools_block", "tech_anti_bot_cloak", "fake_browser_check"] },
      { id: "clipboard", signals: ["tech_clipboard_hijack"] },
      { id: "redirects", signals: ["cross_domain_redirect", "redirect_chain", "meta_refresh_external", "js_redirect_stub"] },
      { id: "hostWarning", signals: ["host_phishing_warning"] },
      { id: "content", signals: ["content_rich"], trust: true },
    ],
  },
  {
    layer: "render",
    checks: [
      { id: "jsLogin", signals: ["js_built_login"] },
      { id: "jsRedirect", signals: ["js_redirect"] },
    ],
  },
  { layer: "redirect", checks: [{ id: "destination", signals: ["dest_official_brand", "dest_popular"], trust: true }] },
  {
    layer: "network",
    checks: [
      { id: "reachable", signals: ["dns_unresolved", "private_address"] },
      { id: "tls", signals: ["no_tls", "tls_mismatch", "tls_untrusted", "tls_valid"] },
      { id: "mail", signals: ["mail_auth_complete", "no_mail_records"] },
    ],
  },
  { layer: "visual", checks: [{ id: "visual", signals: ["visual_brand_mismatch", "visual_brand_official"] }] },
  { layer: "ai", checks: [{ id: "ai", signals: ["ai_phishing", "ai_suspicious", "ai_legitimate"] }] },
];

/** risk: raised the score; trust: lowered it; pass: checked, nothing found; none: does not apply; skipped: did not run. */
export type CheckStatus = "risk" | "trust" | "pass" | "none" | "skipped";

export interface CheckRow {
  id: string;
  status: CheckStatus;
  signals: Signal[];
}

export interface CheckGroup {
  layer: Layer;
  ran: boolean;
  rows: CheckRow[];
}

// A layer can run and still lack the data for one of its checks: an unreachable domain
// has no certificate to inspect. Such checks are not passed, they are not checked.
const UNKNOWN: Record<string, (data: { rep?: ReputationData; net?: NetworkData }) => boolean> = {
  age: ({ rep }) => !rep || rep.ageDays == null,
  cert: ({ rep }) => !rep || !rep.firstCertAt,
  tls: ({ net }) => !net?.resolves || !net.tls,
  mail: ({ net }) => !net?.resolves,
};

export function evaluateChecks(layers: LayerResult[]): CheckGroup[] {
  const byLayer = new Map(layers.map((l) => [l.layer, l]));
  const data = { rep: byLayer.get("reputation")?.data as ReputationData | undefined, net: byLayer.get("network")?.data as NetworkData | undefined };
  const all = layers.flatMap((l) => l.signals);
  const covered = new Set(CHECK_GROUPS.flatMap((g) => g.checks.flatMap((c) => c.signals)));
  return CHECK_GROUPS.map(({ layer, checks }) => {
    const ran = byLayer.get(layer)?.status === "ok";
    const rows: CheckRow[] = checks.map((c) => {
      const found = all.filter((s) => c.signals.includes(s.id));
      const status: CheckStatus =
        found.some((s) => s.weight > 0) ? "risk"
        : found.length ? "trust"
        : !ran || UNKNOWN[c.id]?.(data) ? "skipped"
        : c.trust ? "none"
        : "pass";
      return { id: c.id, status, signals: found };
    });
    // Findings without an entry in the catalogue still show, under their own text.
    for (const s of byLayer.get(layer)?.signals ?? []) {
      if (!covered.has(s.id)) rows.push({ id: s.id, status: s.weight > 0 ? "risk" : "trust", signals: [s] });
    }
    return { layer, ran, rows };
  });
}
