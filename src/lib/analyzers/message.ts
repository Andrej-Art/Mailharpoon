// Content and sender analysis for pasted messages (email, SMS, chat).
// Patterns follow the scam types reported by consumer-protection agencies
// (parcel fees, bank/TAN, "hi mum", fake support, prizes, advance fee, CEO fraud).
import { parse as parseDomain } from "tldts";
import { analyzeBrand, brandsIn, isOfficialDomain, ownsBrand } from "./brand";
import { signal, type LayerResult, type Signal } from "./types";
import { parseTarget } from "./url";
import type { ParsedMessage } from "@/lib/text/parse";

type Rule = [id: string, weight: number, pattern: RegExp];

// Each rule fires at most once. Patterns are German and English.
const CONTENT_RULES: Rule[] = [
  ["msg_family_new_number", 2.4, /\b(hallo|hi|hey)\s+(mama|mami|papa|papi|mum|mom|dad)\b.{0,160}\b(neue nummer|new number|handy (ist )?(kaputt|defekt|ins wasser)|phone (is )?(broken|lost))|\b(neue nummer|new number)\b.{0,80}\b(mama|papa|mum|mom|dad)\b/is],
  ["msg_gift_cards", 2.2, /\b(google[- ]?play|itunes|apple|amazon|steam|paysafe)[- ]?(karte|karten|card|cards|gutschein|code)\b|\bgift ?cards?\b|\bgutscheinkarten?\b/i],
  ["msg_crypto", 1.6, /\b(bitcoin|btc|krypto|crypto|usdt|ethereum|wallet)\b.{0,120}\b(schick|send|überweis|transfer|verdoppel|double|invest|gewinn|profit)/is],
  ["msg_wallet_address", 1.4, /\b(bc1[a-z0-9]{25,60}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|0x[a-fA-F0-9]{40})\b/],
  ["msg_parcel_fee", 2.0, /\b(paket|sendung|zustellung|lieferung|parcel|package|delivery|shipment)\b.{0,200}\b(gebühr|zollgebühr|nachzahlung|lagergebühr|fee|customs|duty|zahlen|pay)\b|\b(gebühr|fee)\b.{0,30}\d+[,.]\d{2}\s?(€|eur|euro|\$|£)/is],
  ["msg_account_locked", 1.4, /\b(gesperrt|sperrung|eingeschränkt|deaktiviert|gelöscht|pausiert|suspended|locked|restricted|disabled|deactivated|will be (closed|deleted))\b/i],
  ["msg_payment_failed", 1.2, /\b(nicht abgebucht|abbuchung (ist )?fehlgeschlagen|zahlung (ist )?fehlgeschlagen|konnte nicht (abgebucht|eingezogen)|payment (has )?failed|unable to (process|charge) your payment|billing problem)\b/i],
  ["msg_verify_account", 1.4, /\b(verifizier|bestätigen sie (ihre|ihr)|bestätige (deine|dein)|daten (aktualisieren|bestätigen)|identität (bestätigen|verifizieren)|verify (your|account|identity)|confirm your (account|identity|details)|update your (payment|billing|account))/i],
  ["msg_credentials", 1.6, /\b(passwort|kennwort|zugangsdaten|pin\b|tan\b|pushtan|login[- ]?daten|password|passcode|one[- ]time code|security code|verification code)\b.{0,80}\b(eingeben|senden|schicken|mitteilen|bestätigen|enter|send|share|confirm|provide)/is],
  ["msg_send_code", 2.2, /\b(code|bestätigungscode),?\s.{0,60}\b(an diese nummer|an mich|weiterleiten|zurückschicken|send (it|me)|forward)/is],
  ["msg_urgency", 0.7, /\b(innerhalb von \d+ (stunden|tagen)|within \d+ (hours|days)|(?<!ab )sofort|umgehend|unverzüglich|heute noch|letzte mahnung|final notice|immediately|urgent|dringend|act now|expires? today|läuft heute ab)\b/i],
  ["msg_threat_authority", 1.8, /\b(haftbefehl|verhaftung|polizei|staatsanwalt|gericht|arrest|warrant|lawsuit|klage)\b/i],
  ["msg_prize", 1.6, /\b(gewonnen|gewinner|gewinnspiel|glückwunsch.{0,40}ausgewählt|winner|you('ve| have) won|prize|lottery|lotto|selected to receive)\b/i],
  ["msg_inheritance", 2.0, /\b(erbe|erbschaft|erben|inheritance|beneficiary|next of kin)\b.{0,160}\b(million|mio|\$|€|usd|eur)/is],
  ["msg_refund_bait", 1.2, /\b(rückerstattung|erstattung|steuerrückerstattung|refund|reimbursement|cashback)\b.{0,160}\b(iban|kontodaten|bankdaten|card|karte|formular|form|link|hier|here)\b/is],
  ["msg_tech_support", 2.0, /\b(computer|pc|gerät|device|windows|microsoft|apple|mac)\b.{0,80}\b(infiziert|virus|gehackt|infected|hacked|compromised)\b.{0,160}\b(rufen sie|anrufen|call|kontaktieren sie)/is],
  ["msg_callback", 0.9, /\b(rufen sie (uns |sofort |umgehend )?(an|zurück)|rufen sie .{0,30} an|call (us|now|immediately|this number)|kundendienst an)\b/i],
  ["msg_ceo_fraud", 1.8, /\b(geschäftsführer|ceo|vorstand|chef)\b.{0,200}\b(überweisung|überweisen|zahlung|gutschein|karten|wire|transfer|payment|vertraulich|confidential|im meeting|in a meeting)\b/is],
  ["msg_id_copy", 1.4, /\b(kopie (ihres|deines) (ausweises|personalausweises|passes)|ausweisdokument|copy of your (id|passport))\b/i],
  ["msg_generic_greeting", 0.5, /\b(sehr geehrter kunde|sehr geehrte kundin|lieber kunde|liebe kundin|lieber nutzer|dear (customer|user|client|valued|account holder|sir\/madam))\b/i],
  ["msg_storage_full", 1.2, /\b(postfach|mailbox|speicher|storage)\b.{0,60}\b(voll|full|überschritten|exceeded)\b/i],
  ["msg_voicemail_lure", 1.0, /\b(neue sprachnachricht|sprachnachricht erhalten|voicemail|voice message)\b.{0,80}(hier|here|http|link)/is],
];

const PHONE_RE = /(?:\+|00)\d{1,3}[\s/-]?\d{2,5}[\s/-]?\d{3,}|\b0\d{2,5}[\s/-]?\d{3,}(?:[\s/-]?\d{2,})?/;

// Calls to action that are not a regular link: obfuscated addresses ("www . site . com",
// "http : / /"), SMS short codes ("Text WIN to 85023") and premium-rate numbers.
const CTA_RE =
  /\bh\s?t\s?t\s?p\s?s?\s?:\s?\/\s?\/|\bwww\s?\.\s?[a-z0-9-]+\s?\.\s?[a-z]{2,}|\b(text|txt|send|sms|reply|simse?)\s+[A-Z0-9]{2,12}\s+(to|an)\s+\d{4,6}\b|\b09\d{8,10}\b|\b(click|klicken sie) (here|hier)\b|\b(visit|besuchen sie|order|bestellen sie) (now|today|jetzt|heute|our|unsere)/i;

const FREEMAIL = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com", "yahoo.com", "icloud.com", "me.com", "aol.com",
  "gmx.de", "gmx.net", "web.de", "t-online.de", "freenet.de", "mail.de", "posteo.de", "proton.me", "protonmail.com", "yandex.ru", "mail.ru",
]);

const reg = (domain: string) => parseDomain(domain, { allowPrivateDomains: true }).domain ?? domain;

export interface MessageData {
  kind: ParsedMessage["kind"];
  subject: string | null;
  from: ParsedMessage["from"];
  replyTo: ParsedMessage["replyTo"];
  auth: ParsedMessage["auth"];
  claimedBrands: string[];
  linkCount: number;
  length: number;
  rules: string[];
}

export function analyzeMessageContent(m: ParsedMessage): LayerResult<MessageData> {
  const start = Date.now();
  const s: Signal[] = [];
  const text = `${m.subject ?? ""}\n${m.body}`;
  const rules: string[] = [];

  const hasPhone = PHONE_RE.test(text);
  for (const [id, w, re] of CONTENT_RULES) {
    // A call-back request only matters when the message actually supplies a number to call.
    if ((id === "msg_callback" || id === "msg_tech_support") && !hasPhone) continue;
    if (re.test(text)) {
      rules.push(id);
      s.push(signal("message", id, w));
    }
  }

  // Link text that shows one address while pointing to another (HTML mails).
  for (const l of m.links) {
    const shown = l.text?.match(/(?:https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,})/i)?.[1];
    if (shown) {
      const shownDomain = reg(shown.toLowerCase());
      const realDomain = (() => {
        try {
          return reg(new URL(l.url).hostname);
        } catch {
          return null;
        }
      })();
      if (realDomain && shownDomain && realDomain !== shownDomain) {
        s.push(signal("message", "msg_link_text_mismatch", 2.4, { shown: shownDomain, real: realDomain }));
        break;
      }
    }
  }

  const claimedBrands = brandsIn(text.slice(0, 4000));
  const hasAsk = m.links.length > 0 || hasPhone || rules.length > 0 || CTA_RE.test(text);
  if (!hasAsk && m.body.length > 0) s.push(signal("message", "msg_no_call_to_action", -1.4));

  return {
    layer: "message",
    status: "ok",
    ms: Date.now() - start,
    signals: s,
    data: {
      kind: m.kind,
      subject: m.subject,
      from: m.from,
      replyTo: m.replyTo,
      auth: m.auth,
      claimedBrands,
      linkCount: m.links.length,
      length: m.body.length,
      rules,
    },
  };
}

/** Sender checks: only meaningful when the user pasted an email with a sender. */
export function analyzeSender(m: ParsedMessage, claimedBrands: string[]): LayerResult | null {
  if (!m.from) return null;
  const start = Date.now();
  const s: Signal[] = [];
  const S = "sender" as const;
  const domain = reg(m.from.domain);
  const freemail = FREEMAIL.has(m.from.domain);

  // Authentication results are only present when the full source (headers) was pasted.
  const { spf, dkim, dmarc } = m.auth;
  if (dmarc === "fail") s.push(signal(S, "sender_dmarc_fail", 2.6));
  else if (spf === "fail" || spf === "softfail" || dkim === "fail") s.push(signal(S, "sender_auth_fail", 1.6, { spf: spf ?? "-", dkim: dkim ?? "-" }));
  else if (dmarc === "pass" || (spf === "pass" && dkim === "pass")) s.push(signal(S, "sender_auth_pass", -1.0));

  if (m.replyTo && reg(m.replyTo.domain) !== domain) s.push(signal(S, "sender_reply_to_mismatch", 1.4, { replyTo: m.replyTo.domain }));
  if (m.returnPath && reg(m.returnPath) !== domain && !freemail) s.push(signal(S, "sender_return_path_mismatch", 0.4));

  // Display name or content claims a brand, but the address belongs to someone else.
  const nameBrands = brandsIn(m.from.name);
  const brand = nameBrands[0] ?? claimedBrands.find((b) => !ownsBrand(domain, b));
  if (brand && !ownsBrand(domain, brand) && !isOfficialDomain(domain)) {
    s.push(signal(S, nameBrands.length ? "sender_display_spoof" : "sender_brand_mismatch", nameBrands.length ? 2.4 : 1.6, { brand, domain: m.from.domain }));
  } else if (isOfficialDomain(domain)) {
    // Only trustworthy when authentication confirms it; display addresses are trivial to forge.
    s.push(signal(S, "sender_official_domain", dmarc === "pass" || (spf === "pass" && dkim === "pass") ? -1.6 : -0.3, { domain }));
  }
  if (freemail && brand) s.push(signal(S, "sender_freemail_brand", 1.2, { domain: m.from.domain, brand }));

  // Lookalike sender domains (paypa1-service.com) – reuse the URL brand checks.
  if (!freemail) {
    try {
      for (const x of analyzeBrand(parseTarget(`https://${m.from.domain}`)).signals) {
        if (x.weight > 0 && ["homoglyph", "typosquat", "mixed_script"].includes(x.id)) s.push({ ...x, layer: S });
      }
    } catch {}
  }

  return {
    layer: S,
    status: "ok",
    ms: Date.now() - start,
    signals: s,
    data: { from: m.from, replyTo: m.replyTo, returnPath: m.returnPath, auth: m.auth, freemail },
  };
}
