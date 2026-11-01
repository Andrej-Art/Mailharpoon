import { domainToUnicode } from "node:url";
import { parse } from "tldts";

export interface ParsedTarget {
  input: string;
  href: string;
  scheme: string;
  hostname: string; // ASCII / punycode form
  unicodeHost: string; // what a human sees in the address bar
  port: number | null;
  path: string;
  query: string;
  username: string;
  registrable: string; // private-PSL aware (foo.github.io)
  icannDomain: string; // ICANN-only (github.io)
  sld: string;
  suffix: string;
  subdomain: string;
  isIp: boolean;
  isPrivateSuffix: boolean;
}

export class InvalidUrlError extends Error {}

const MAX_URL_LENGTH = 4096;

export function parseTarget(raw: string): ParsedTarget {
  let input = raw.trim().replace(/^["'<\s]+|["'>\s]+$/g, "");
  if (!input || input.length > MAX_URL_LENGTH) throw new InvalidUrlError("empty_or_too_long");
  // Defanged indicators from threat reports: hxxp://evil[.]com
  input = input.replace(/^hxxp/i, "http").replace(/\[\.\]/g, ".").replace(/\(\.\)/g, ".");
  if (!/^[a-z][a-z0-9+.-]*:/i.test(input)) input = `http://${input}`;

  let u: URL;
  try {
    u = new URL(input);
  } catch {
    throw new InvalidUrlError("unparseable");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new InvalidUrlError("unsupported_scheme");
  if (!u.hostname) throw new InvalidUrlError("no_host");

  const hostname = u.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
  const priv = parse(hostname, { allowPrivateDomains: true });
  const icann = parse(hostname);
  const isIp = Boolean(priv.isIp) || /^(0x[0-9a-f]+|\d+)$/i.test(hostname);

  return {
    input: raw.trim(),
    href: u.href,
    scheme: u.protocol.slice(0, -1),
    hostname,
    unicodeHost: domainToUnicode(hostname) || hostname,
    port: u.port ? Number(u.port) : null,
    path: decodeSafe(u.pathname),
    query: decodeSafe(u.search),
    username: u.username,
    registrable: priv.domain ?? hostname,
    icannDomain: icann.domain ?? hostname,
    sld: priv.domainWithoutSuffix ?? "",
    suffix: priv.publicSuffix ?? "",
    subdomain: priv.subdomain ?? "",
    isIp,
    isPrivateSuffix: Boolean(priv.isPrivate),
  };
}

function decodeSafe(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
