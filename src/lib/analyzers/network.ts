// Network layer: DNS records, TLS certificate and hosting infrastructure.
import dns from "node:dns/promises";
import tls from "node:tls";
import { getJson, isPublicIp, resolvePublic } from "@/lib/net/safe-fetch";
import { signal, type LayerResult, type Signal } from "./types";
import type { ParsedTarget } from "./url";

export interface TlsInfo {
  available: boolean;
  authorized: boolean;
  error: string | null;
  issuer: string | null;
  subject: string | null;
  sans: string[];
  validFrom: string | null;
  validTo: string | null;
  protocol: string | null;
  hostnameMatch: boolean;
}

export interface NetworkData {
  resolves: boolean;
  addresses: string[];
  mx: boolean;
  ns: string[];
  spf: boolean;
  dmarc: boolean;
  tls: TlsInfo | null;
  asn: { ip: string; org: string | null; asn: string | null; country: string | null; countryCode: string | null } | null;
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;
const settle = <T,>(p: Promise<T>) => p.then((v) => v, () => null);

function tlsProbe(ip: string, servername: string): Promise<TlsInfo> {
  return new Promise((resolve) => {
    const empty: TlsInfo = {
      available: false, authorized: false, error: null, issuer: null, subject: null, sans: [],
      validFrom: null, validTo: null, protocol: null, hostnameMatch: false,
    };
    const socket = tls.connect({ host: ip, port: 443, servername, rejectUnauthorized: false, timeout: 4000 });
    const done = (info: TlsInfo) => {
      socket.destroy();
      resolve(info);
    };
    socket.once("secureConnect", () => {
      const cert = socket.getPeerCertificate();
      const sans = (cert.subjectaltname ?? "").split(",").map((s) => s.trim().replace(/^DNS:/, "")).filter(Boolean);
      const matchErr = tls.checkServerIdentity(servername, cert);
      done({
        available: true,
        authorized: socket.authorized,
        error: socket.authorizationError ? String(socket.authorizationError) : null,
        issuer: first(cert.issuer?.O ?? cert.issuer?.CN),
        subject: first(cert.subject?.CN),
        sans: sans.slice(0, 20),
        validFrom: cert.valid_from ? new Date(cert.valid_from).toISOString() : null,
        validTo: cert.valid_to ? new Date(cert.valid_to).toISOString() : null,
        protocol: socket.getProtocol(),
        hostnameMatch: !matchErr,
      });
    });
    socket.once("timeout", () => done({ ...empty, error: "timeout" }));
    socket.once("error", (e) => done({ ...empty, error: e.message }));
  });
}

export async function analyzeNetwork(t: ParsedTarget): Promise<LayerResult<NetworkData>> {
  const start = Date.now();
  const s: Signal[] = [];
  const N = "network" as const;

  let pinned: Awaited<ReturnType<typeof resolvePublic>> | null = null;
  let blocked = false;
  try {
    pinned = await resolvePublic(t.hostname);
  } catch (e) {
    blocked = e instanceof Error && e.message.startsWith("non_public");
  }

  const zone = t.isIp ? null : t.icannDomain;
  const [mx, ns, txt, dmarc] = await Promise.all([
    zone ? settle(dns.resolveMx(zone)) : null,
    zone ? settle(dns.resolveNs(zone)) : null,
    zone ? settle(dns.resolveTxt(zone)) : null,
    zone ? settle(dns.resolveTxt(`_dmarc.${zone}`)) : null,
  ]);

  const data: NetworkData = {
    resolves: Boolean(pinned),
    addresses: pinned?.all ?? [],
    mx: Boolean(mx?.length),
    ns: (ns ?? []).slice(0, 4),
    spf: Boolean(txt?.some((r) => r.join("").startsWith("v=spf1"))),
    dmarc: Boolean(dmarc?.some((r) => r.join("").startsWith("v=DMARC1"))),
    tls: null,
    asn: null,
  };

  if (blocked) {
    s.push(signal(N, "private_address", 1.0));
    return { layer: "network", status: "ok", ms: Date.now() - start, signals: s, data, note: "non_public_target" };
  }
  if (!pinned) {
    s.push(signal(N, "dns_unresolved", 0.6));
    return { layer: "network", status: "ok", ms: Date.now() - start, signals: s, data };
  }

  const [tlsInfo, asn] = await Promise.all([
    tlsProbe(pinned.address, t.hostname),
    isPublicIp(pinned.address)
      ? getJson<{ success: boolean; country?: string; country_code?: string; connection?: { asn?: number; org?: string; isp?: string } }>(
          `https://ipwho.is/${pinned.address}?fields=success,country,country_code,connection`,
          {},
          3000,
        )
      : null,
  ]);
  data.tls = tlsInfo;
  if (asn?.success)
    data.asn = {
      ip: pinned.address,
      org: asn.connection?.org ?? asn.connection?.isp ?? null,
      asn: asn.connection?.asn ? `AS${asn.connection.asn}` : null,
      country: asn.country ?? null,
      countryCode: asn.country_code ?? null,
    };

  if (!tlsInfo.available) s.push(signal(N, "no_tls", t.scheme === "https" ? 0.6 : 0.3));
  else if (!tlsInfo.hostnameMatch) s.push(signal(N, "tls_mismatch", 1.4, { subject: tlsInfo.subject ?? "?" }));
  else if (!tlsInfo.authorized) s.push(signal(N, "tls_untrusted", 1.2, { error: tlsInfo.error ?? "?" }));
  else s.push(signal(N, "tls_valid", -0.2, { issuer: tlsInfo.issuer ?? "?" }));

  // Legit organisations almost always publish mail-authentication records for their main domain.
  if (zone && !t.isPrivateSuffix) {
    if (data.mx && data.spf && data.dmarc) s.push(signal(N, "mail_auth_complete", -0.4));
    else if (!data.mx && !data.spf) s.push(signal(N, "no_mail_records", 0.15));
  }

  return { layer: "network", status: "ok", ms: Date.now() - start, signals: s, data };
}
