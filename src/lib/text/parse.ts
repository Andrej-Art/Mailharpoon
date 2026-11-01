// Turns a pasted message (raw email source, plain email body, SMS or chat text)
// into structured data: sender, auth results, readable body and every link it contains.
import * as cheerio from "cheerio";
import { parse as parseDomain } from "tldts";
import { unwrapUrl } from "@/lib/analyzers/unwrap";

export interface Address {
  name: string;
  address: string;
  domain: string;
}

export interface LinkRef {
  url: string;
  /** Visible anchor text in HTML mails, when it differs from the target. */
  text?: string;
}

export interface ParsedMessage {
  kind: "email" | "text";
  hasHeaders: boolean;
  subject: string | null;
  from: Address | null;
  replyTo: Address | null;
  returnPath: string | null;
  auth: { spf: string | null; dkim: string | null; dmarc: string | null };
  body: string;
  links: LinkRef[];
}

const MAX_LINKS = 10;

function decodeEncodedWords(s: string): string {
  return s.replace(/=\?([^?]+)\?([bqBQ])\?([^?]*)\?=/g, (_, charset: string, enc: string, data: string) => {
    try {
      const bytes =
        enc.toUpperCase() === "B"
          ? Buffer.from(data, "base64")
          : Buffer.from(data.replace(/_/g, " ").replace(/=([0-9A-F]{2})/gi, (_m, h) => String.fromCharCode(parseInt(h, 16))), "latin1");
      return new TextDecoder(charset.toLowerCase().includes("8859") ? "latin1" : "utf-8").decode(bytes);
    } catch {
      return data;
    }
  });
}

function decodeQuotedPrintable(s: string): string {
  const bytes = Buffer.from(s.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/gi, (_m, h) => String.fromCharCode(parseInt(h, 16))), "latin1");
  return bytes.toString("utf8");
}

export function parseAddress(raw: string | undefined): Address | null {
  if (!raw) return null;
  const v = decodeEncodedWords(raw).trim();
  const m = v.match(/^(.*?)<\s*([^>\s]+@[^>\s]+)\s*>/) ?? v.match(/^()([^\s<>]+@[^\s<>]+)/);
  if (!m) return null;
  const address = m[2].toLowerCase().replace(/^mailto:/, "");
  return { name: m[1].replace(/^["'\s]+|["'\s]+$/g, ""), address, domain: address.split("@")[1] ?? "" };
}

/** Split "Header: value" lines (with folded continuations) from the body. */
function splitHeaders(raw: string): { headers: Map<string, string[]>; body: string } | null {
  const text = raw.replace(/\r\n/g, "\n");
  const end = text.search(/\n\s*\n/);
  if (end < 0) return null;
  const block = text.slice(0, end);
  const lines = block.split("\n");
  if (!/^[A-Za-z][\w-]*:\s/.test(lines[0] ?? "")) return null;
  const headers = new Map<string, string[]>();
  let current = "";
  for (const line of lines) {
    if (/^\s/.test(line) && current) {
      const arr = headers.get(current)!;
      arr[arr.length - 1] += " " + line.trim();
    } else {
      const m = line.match(/^([A-Za-z][\w-]*):\s?(.*)$/);
      if (!m) return null;
      current = m[1].toLowerCase();
      headers.set(current, [...(headers.get(current) ?? []), m[2]]);
    }
  }
  const looksLikeMail = headers.has("from") && (headers.has("subject") || headers.has("received") || headers.has("date") || headers.has("to"));
  return looksLikeMail ? { headers, body: text.slice(end).trim() } : null;
}

/** Pick the readable part of a (possibly multipart) MIME body. */
function mimeBody(headers: Map<string, string[]>, body: string): { text: string; html: string | null } {
  const ctype = headers.get("content-type")?.[0] ?? "text/plain";
  const cte = (headers.get("content-transfer-encoding")?.[0] ?? "").toLowerCase();
  const decode = (s: string, enc: string) =>
    enc.includes("base64") ? Buffer.from(s.replace(/\s+/g, ""), "base64").toString("utf8") : enc.includes("quoted-printable") ? decodeQuotedPrintable(s) : s;

  const boundary = ctype.match(/boundary="?([^";]+)"?/i)?.[1];
  if (boundary) {
    let text = "";
    let html: string | null = null;
    for (const part of body.split(`--${boundary}`)) {
      const sp = splitPart(part);
      if (!sp) continue;
      const pt = sp.headers.get("content-type")?.[0] ?? "";
      const pe = (sp.headers.get("content-transfer-encoding")?.[0] ?? "").toLowerCase();
      if (/multipart\//i.test(pt)) {
        const nested = mimeBody(sp.headers, sp.body);
        text ||= nested.text;
        html ??= nested.html;
      } else if (/text\/plain/i.test(pt) && !text) text = decode(sp.body, pe);
      else if (/text\/html/i.test(pt) && !html) html = decode(sp.body, pe);
    }
    return { text, html };
  }
  const decoded = decode(body, cte);
  return /text\/html/i.test(ctype) ? { text: "", html: decoded } : { text: decoded, html: null };
}

function splitPart(part: string): { headers: Map<string, string[]>; body: string } | null {
  const p = part.replace(/^\s*\n/, "");
  const end = p.search(/\n\s*\n/);
  if (end < 0) return null;
  const headers = new Map<string, string[]>();
  for (const line of p.slice(0, end).split("\n")) {
    const m = line.match(/^([A-Za-z][\w-]*):\s?(.*)$/);
    if (m) headers.set(m[1].toLowerCase(), [m[2]]);
  }
  return { headers, body: p.slice(end).trim() };
}

const URL_RE =
  /\b(?:h[tx]{2}ps?:\/\/|www\.)[^\s<>"'()\]]+|\b(?:[a-z0-9-]+\.)+[a-z]{2,24}\/[^\s<>"'()]*|\b(?:[a-z0-9-]+(?:\[\.\]|\.))+(?:com|net|org|de|info|top|xyz|online|site|shop|app|dev|io|cc|me|link|click|help|live|co|eu|at|ch|ru|cn)\b/gi;

/** Find URLs in free text, including defanged ones (hxxp://evil[.]com) and bare domains with a path. */
export function extractUrls(raw: string): string[] {
  // Re-fang defanged indicators first: hxxp://, evil[.]com, evil(.)com, evil{.}com
  const text = raw.replace(/\[\.\]|\(\.\)|\{\.\}/g, ".").replace(/\bhxxp/gi, "http");
  const out = new Set<string>();
  for (const m of text.matchAll(URL_RE)) {
    let u = m[0].replace(/[.,;:!?…]+$/, "");
    if (!/^https?:\/\//i.test(u)) u = `http://${u}`;
    try {
      const host = new URL(u).hostname;
      const p = parseDomain(host);
      if (!p.isIp && !p.publicSuffix) continue;
      if (!p.isIp && !p.domain) continue;
      // Skip email domains that only appeared as part of an address ("max@firma.de").
      const idx = m.index ?? 0;
      if (text[idx - 1] === "@") continue;
      out.add(u);
    } catch {}
    if (out.size >= MAX_LINKS) break;
  }
  return [...out];
}

function htmlToText(html: string): { text: string; links: LinkRef[] } {
  const $ = cheerio.load(html);
  const links: LinkRef[] = [];
  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") ?? "").trim();
    if (/^https?:\/\//i.test(href)) links.push({ url: href, text: $(el).text().replace(/\s+/g, " ").trim().slice(0, 200) });
  });
  $("script,style,head").remove();
  return { text: $("body").text().replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim() || $.text().trim(), links };
}

function authResult(h: Map<string, string[]>, key: "spf" | "dkim" | "dmarc"): string | null {
  const all = [...(h.get("authentication-results") ?? []), ...(h.get("arc-authentication-results") ?? [])].join(" ");
  const m = all.match(new RegExp(`\\b${key}=(pass|fail|softfail|neutral|none|temperror|permerror|bestguesspass)`, "i"));
  if (m) return m[1].toLowerCase();
  if (key === "spf") return h.get("received-spf")?.[0]?.match(/^\s*(\w+)/)?.[1]?.toLowerCase() ?? null;
  return null;
}

/** Replace gateway-wrapped links (Safe Links, Proofpoint ...) by their real destination. */
function unwrapLinks(links: LinkRef[]): LinkRef[] {
  const seen = new Set<string>();
  return links
    .map((l) => ({ ...l, url: unwrapUrl(l.url).url }))
    .filter((l) => (seen.has(l.url) ? false : (seen.add(l.url), true)));
}

export function parseMessage(raw: string): ParsedMessage {
  const input = raw.replace(/\u0000/g, "").trim();
  const split = splitHeaders(input);

  if (split) {
    const h = split.headers;
    const { text, html } = mimeBody(h, split.body);
    const fromHtml = html ? htmlToText(html) : null;
    const body = (text || fromHtml?.text || split.body).trim();
    const linkMap = new Map<string, LinkRef>();
    for (const l of fromHtml?.links ?? []) if (!linkMap.has(l.url)) linkMap.set(l.url, l);
    for (const u of extractUrls(body)) if (!linkMap.has(u)) linkMap.set(u, { url: u });
    return {
      kind: "email",
      hasHeaders: true,
      subject: h.get("subject") ? decodeEncodedWords(h.get("subject")![0]).trim() : null,
      from: parseAddress(h.get("from")?.[0]),
      replyTo: parseAddress(h.get("reply-to")?.[0]),
      returnPath: parseAddress(h.get("return-path")?.[0])?.domain ?? null,
      auth: { spf: authResult(h, "spf"), dkim: authResult(h, "dkim"), dmarc: authResult(h, "dmarc") },
      body: body.slice(0, 20_000),
      links: unwrapLinks([...linkMap.values()]).slice(0, MAX_LINKS),
    };
  }

  // Pasted HTML without headers
  if (/<a\s[^>]*href=/i.test(input)) {
    const { text, links } = htmlToText(input);
    const extra = extractUrls(text).filter((u) => !links.some((l) => l.url === u)).map((url) => ({ url }));
    return emptyText(text, [...links, ...extra]);
  }

  // A plain email body often starts with "Von: ..." / "From: ..." lines copied from a mail client.
  const fromLine = input.match(/^(?:From|Von|Absender)\s*:\s*(.+)$/im)?.[1];
  const subjectLine = input.match(/^(?:Subject|Betreff)\s*:\s*(.+)$/im)?.[1];
  const res = emptyText(input, extractUrls(input).map((url) => ({ url })));
  if (fromLine) {
    res.kind = "email";
    res.from = parseAddress(fromLine);
  }
  if (subjectLine) res.subject = subjectLine.trim();
  return res;
}

function emptyText(body: string, links: LinkRef[]): ParsedMessage {
  return {
    kind: "text",
    hasHeaders: false,
    subject: null,
    from: null,
    replyTo: null,
    returnPath: null,
    auth: { spf: null, dkim: null, dmarc: null },
    body: body.slice(0, 20_000),
    links: unwrapLinks(links).slice(0, MAX_LINKS),
  };
}
