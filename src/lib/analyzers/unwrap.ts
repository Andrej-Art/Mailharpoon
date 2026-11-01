// Unwraps links rewritten by email security gateways and redirect services, so the
// scanner checks the real destination instead of Microsoft's or Proofpoint's domain.
// Proofpoint v2/v3 decoding follows Proofpoint's published reference decoder (urldecoder.py).

export interface Unwrapped {
  url: string;
  wrapper: string | null;
}

const MAX_DEPTH = 4;

// Proofpoint v3: run-length tokens "**X" map X to a length starting at 2.
const RUN_VALUES = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const RUN_LENGTH = new Map([...RUN_VALUES].map((c, i) => [c, i + 2]));

function decodeProofpointV3(href: string): string | null {
  const m = href.match(/v3\/__(.+?)__;(.*?)!/);
  if (!m) return null;
  let encodedUrl: string;
  try {
    encodedUrl = decodeURIComponent(m[1]);
  } catch {
    encodedUrl = m[1];
  }
  const decodedBytes = [...Buffer.from(`${m[2]}==`.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")];
  let marker = 0;
  return encodedUrl.replace(/\*(\*.)?/g, (token) => {
    if (token === "*") return decodedBytes[marker++] ?? "";
    const len = RUN_LENGTH.get(token.slice(-1)) ?? 0;
    const run = decodedBytes.slice(marker, marker + len).join("");
    marker += len;
    return run;
  });
}

function decodeProofpointV2(u: string): string {
  return decodeURIComponent(u.replace(/-/g, "%").replace(/_/g, "/"));
}

type Rule = { name: string; host: RegExp; path?: RegExp; extract: (u: URL) => string | null };

const RULES: Rule[] = [
  { name: "Microsoft Safe Links", host: /(^|\.)safelinks\.protection\.(outlook\.com|office365\.us)$/i, extract: (u) => u.searchParams.get("url") },
  { name: "Proofpoint URL Defense", host: /^urldefense\.com$/i, path: /^\/v3\//, extract: (u) => decodeProofpointV3(u.href) },
  { name: "Proofpoint URL Defense", host: /^urldefense\.(proofpoint\.)?com$/i, path: /^\/v2\/url/, extract: (u) => (u.searchParams.get("u") ? decodeProofpointV2(u.searchParams.get("u")!) : null) },
  { name: "Proofpoint URL Defense", host: /^urldefense\.(proofpoint\.)?com$/i, path: /^\/v1\/url/, extract: (u) => u.searchParams.get("u") },
  { name: "Barracuda Link Protection", host: /^linkprotect\.cudasvc\.com$/i, path: /^\/url/, extract: (u) => u.searchParams.get("a") },
  { name: "Trend Micro Click-Time", host: /(^|\.)trendmicro\.com$/i, path: /clicktime/i, extract: (u) => u.searchParams.get("url") },
  { name: "Google", host: /^(www\.)?google\.[a-z.]{2,6}$/i, path: /^\/url$/, extract: (u) => u.searchParams.get("q") ?? u.searchParams.get("url") },
  { name: "Facebook", host: /^l[m]?\.facebook\.com$/i, path: /^\/l\.php/, extract: (u) => u.searchParams.get("u") },
  { name: "Instagram", host: /^l\.instagram\.com$/i, extract: (u) => u.searchParams.get("u") },
  { name: "LinkedIn", host: /^(www\.)?linkedin\.com$/i, path: /^\/redir\/redirect/, extract: (u) => u.searchParams.get("url") },
  { name: "YouTube", host: /^(www\.)?youtube\.com$/i, path: /^\/redirect/, extract: (u) => u.searchParams.get("q") },
  { name: "Steam", host: /^steamcommunity\.com$/i, path: /^\/linkfilter/, extract: (u) => u.searchParams.get("url") ?? u.searchParams.get("u") },
  { name: "Slack", host: /^slack-redir\.net$/i, path: /^\/link/, extract: (u) => u.searchParams.get("url") },
];

/** Peel off known wrappers (possibly nested). Returns the original URL when nothing matches. */
export function unwrapUrl(href: string): Unwrapped {
  let current = href;
  let wrapper: string | null = null;
  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    let u: URL;
    try {
      u = new URL(current);
    } catch {
      break;
    }
    const rule = RULES.find((r) => r.host.test(u.hostname) && (!r.path || r.path.test(u.pathname)));
    if (!rule) break;
    let next: string | null = null;
    try {
      next = rule.extract(u);
    } catch {
      next = null;
    }
    if (!next || !/^https?:\/\//i.test(next)) break;
    wrapper ??= rule.name;
    current = next;
  }
  return { url: current, wrapper };
}
