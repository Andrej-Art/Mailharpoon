// Threat-intelligence layer: known-bad lists. A confirmed hit overrides everything else.
// Every source is optional; missing API keys simply skip that source.
import { quad9Verdict } from "@/lib/net/doh";
import { getJson } from "@/lib/net/safe-fetch";
import { signal, type LayerResult, type Signal } from "./types";
import type { ParsedTarget } from "./url";

export interface IntelData {
  sources: { name: string; status: "hit" | "clean" | "skipped" | "error"; detail?: string }[];
}

const OPENPHISH_FEED = "https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt";
let openphish: { at: number; urls: Set<string>; hosts: Set<string> } | null = null;

async function openPhishFeed() {
  if (openphish && Date.now() - openphish.at < 30 * 60_000) return openphish;
  try {
    const res = await fetch(OPENPHISH_FEED, { signal: AbortSignal.timeout(4000), cache: "no-store" });
    if (!res.ok) return openphish;
    const lines = (await res.text()).split("\n").map((l) => l.trim()).filter(Boolean);
    const hosts = new Set<string>();
    for (const l of lines) {
      try {
        hosts.add(new URL(l).hostname.toLowerCase());
      } catch {}
    }
    openphish = { at: Date.now(), urls: new Set(lines.map((l) => l.replace(/\/$/, ""))), hosts };
  } catch {}
  return openphish;
}

async function safeBrowsing(url: string, key: string) {
  const body = {
    client: { clientId: "mailharpoon", clientVersion: "2.0.0" },
    threatInfo: {
      threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: [{ url }],
    },
  };
  return getJson<{ matches?: { threatType: string }[] }>(
    `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(key)}`,
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) },
    4000,
  );
}

async function urlhaus(url: string, key: string) {
  return getJson<{ query_status: string; threat?: string; url_status?: string }>(
    "https://urlhaus-api.abuse.ch/v1/url/",
    { method: "POST", headers: { "Auth-Key": key }, body: new URLSearchParams({ url }) },
    4000,
  );
}

export async function analyzeIntel(t: ParsedTarget, extraUrls: string[] = []): Promise<LayerResult<IntelData>> {
  const start = Date.now();
  const s: Signal[] = [];
  const sources: IntelData["sources"] = [];
  const urls = [...new Set([t.href, ...extraUrls])];

  const tasks: Promise<void>[] = [];

  tasks.push(
    openPhishFeed().then((feed) => {
      if (!feed) return void sources.push({ name: "OpenPhish", status: "error" });
      const hit = urls.find((u) => feed.urls.has(u.replace(/\/$/, ""))) ?? (feed.hosts.has(t.hostname) && !t.isPrivateSuffix ? t.hostname : null);
      if (hit) {
        s.push({ ...signal("intel", "openphish_hit", 5), override: "malicious" });
        sources.push({ name: "OpenPhish", status: "hit", detail: hit });
      } else sources.push({ name: "OpenPhish", status: "clean" });
    }),
  );

  // Quad9 aggregates about twenty threat feeds into its filtering resolver. It is a strong
  // signal, but not an automatic verdict, because aggregated blocklists do contain mistakes.
  if (!t.isIp) {
    const hosts = [...new Set([t.hostname, ...extraUrls.map((u) => { try { return new URL(u).hostname; } catch { return ""; } }).filter(Boolean)])];
    tasks.push(
      Promise.all(hosts.map(quad9Verdict)).then((vs) => {
        const blocked = hosts.find((_, i) => vs[i] === "blocked");
        if (blocked) {
          s.push(signal("intel", "quad9_blocked", 3.5, { host: blocked }));
          sources.push({ name: "Quad9", status: "hit", detail: blocked });
        } else sources.push({ name: "Quad9", status: vs.every((v) => v === "unknown") ? "error" : "clean" });
      }),
    );
  }

  const gsbKey = process.env.GOOGLE_SAFE_BROWSING_KEY;
  if (gsbKey) {
    tasks.push(
      Promise.all(urls.map((u) => safeBrowsing(u, gsbKey))).then((rs) => {
        if (rs.every((r) => r === null)) return void sources.push({ name: "Google Safe Browsing", status: "error" });
        const match = rs.flatMap((r) => r?.matches ?? [])[0];
        if (match) {
          s.push({ ...signal("intel", "gsb_hit", 5, { type: match.threatType }), override: "malicious" });
          sources.push({ name: "Google Safe Browsing", status: "hit", detail: match.threatType });
        } else sources.push({ name: "Google Safe Browsing", status: "clean" });
      }),
    );
  } else sources.push({ name: "Google Safe Browsing", status: "skipped" });

  const uhKey = process.env.URLHAUS_AUTH_KEY;
  if (uhKey) {
    tasks.push(
      Promise.all(urls.map((u) => urlhaus(u, uhKey))).then((rs) => {
        if (rs.every((r) => r === null)) return void sources.push({ name: "URLhaus", status: "error" });
        const hit = rs.find((r) => r?.query_status === "ok");
        if (hit) {
          s.push({ ...signal("intel", "urlhaus_hit", 5, { threat: hit.threat ?? "malware" }), override: "malicious" });
          sources.push({ name: "URLhaus", status: "hit", detail: `${hit.threat ?? ""} ${hit.url_status ?? ""}`.trim() });
        } else sources.push({ name: "URLhaus", status: "clean" });
      }),
    );
  } else sources.push({ name: "URLhaus", status: "skipped" });

  await Promise.all(tasks);
  return { layer: "intel", status: "ok", ms: Date.now() - start, signals: s, data: { sources } };
}
