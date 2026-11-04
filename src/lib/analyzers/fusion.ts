// Evidence fusion: every signal is a log-odds contribution; the sum passes through a
// sigmoid. Blacklist hits override. Weights are expert-set from the literature and the
// v2 evaluation (see /methodology) – deliberately transparent instead of a black box.
import { sigmoid } from "./domain-model";
import type { LayerResult, Signal } from "./types";

export type Verdict = "safe" | "suspicious" | "dangerous";

export interface Fused {
  probability: number;
  score: number; // 0..100
  verdict: Verdict;
  confidence: "low" | "medium" | "high";
  topSignals: Signal[];
  logit: number;
}

// An unknown site with no evidence either way should land clearly in "safe" (~25).
const PRIOR = -1.0;

// Candidate rule under evaluation: "dangerous" needs at least one piece of hard evidence, many
// weak hints together reach "suspicious" at most. Weak hints (a young domain, a cheap TLD, an odd
// name) fit a new small business as well, and a red verdict on such a site costs trust.
const ASKS = new Set(["password_field", "card_field", "form_external_action", "form_mailto", "password_over_http"]);
const IMPERSONATES = new Set(["brand_login_mismatch", "visual_brand_mismatch", "brand_in_host", "typosquat", "typosquat_subdomain", "favicon_hotlink"]);
// Evidence that is damning on its own: lookalike characters, data sent to a Telegram bot, a host's own phishing warning.
const DAMNING = new Set(["homoglyph", "mixed_script", "quad9_blocked", "host_phishing_warning", "tech_telegram_exfil", "tech_discord_webhook", "tech_aitm_proxy", "tech_clipboard_hijack"]);
const CAPPED = 0.69;

/** Whether the signals contain hard evidence for a "dangerous" verdict. */
export function confirmed(signals: Signal[]): boolean {
  const has = (set: Set<string>) => signals.some((s) => set.has(s.id) && s.weight > 0);
  if (signals.some((s) => s.override === "malicious") || has(DAMNING)) return true;
  // The visual mismatch is only raised when the page asks for sensitive or personal data.
  const asks = has(ASKS) || signals.some((s) => s.id === "visual_brand_mismatch");
  const young = signals.some((s) => (s.id === "domain_age" && s.weight >= 1.9) || (s.id === "fresh_certificate" && s.weight >= 1.2));
  const cloaked = signals.some((s) => s.id === "fake_browser_check");
  return (asks && (has(IMPERSONATES) || young)) || (cloaked && young);
}

export function fuse(layers: LayerResult[], opts: { requireConfirmation?: boolean } = {}): Fused {
  const signals = layers.flatMap((l) => l.signals);
  const malicious = signals.some((s) => s.override === "malicious");

  // Cap each layer's total so a single noisy layer cannot decide alone.
  const perLayer = new Map<string, number>();
  for (const s of signals) perLayer.set(s.layer, (perLayer.get(s.layer) ?? 0) + s.weight);
  let logit = PRIOR;
  for (const [layer, sum] of perLayer) logit += layer === "intel" ? sum : Math.max(-4, Math.min(4.5, sum));

  let probability = sigmoid(logit);
  if (malicious) probability = Math.max(probability, 0.98);
  if (opts.requireConfirmation && probability >= 0.7 && !confirmed(signals)) probability = CAPPED;

  const verdict: Verdict = probability >= 0.7 ? "dangerous" : probability >= 0.35 ? "suspicious" : "safe";
  const ok = layers.filter((l) => l.status === "ok").map((l) => l.layer);
  let confidence: Fused["confidence"];
  if (ok.includes("message")) {
    // Messages: the content rules are narrow, so certainty comes from a clear score plus an independent check.
    const decisive = Math.abs(logit) >= 3;
    confidence = malicious || (decisive && (ok.includes("ai") || ok.includes("links"))) ? "high" : decisive || Math.abs(logit) >= 1.8 ? "medium" : "low";
  } else {
    confidence = malicious || (ok.includes("page") && ok.includes("reputation") && ok.length >= 5) ? "high" : ok.length >= 4 ? "medium" : "low";
  }

  const topSignals = [...signals]
    .filter((s) => s.weight !== 0)
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    .slice(0, 8);

  return { probability, score: Math.round(probability * 100), verdict, confidence, topSignals, logit };
}
