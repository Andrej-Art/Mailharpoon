import { afterEach, describe, expect, it, vi } from "vitest";
import type { Report } from "../scan";
import { defang, readTrends, recordScan, sightings } from "../trends/store";

const report = (over: Partial<Report>): Report =>
  ({
    id: "x",
    mode: "url",
    scannedAt: "",
    result: { probability: 0.99, score: 99, verdict: "dangerous", confidence: "high", topSignals: [], logit: 5 },
    layers: [{ layer: "ai", status: "ok", ms: 1, signals: [], data: { impersonated_brand: "Sparkasse" } }],
    durationMs: 1,
    version: "2",
    target: { href: "https://login.sparkasse-sicher.top/x?email=a@b.de", hostname: "login.sparkasse-sicher.top", unicodeHost: "login.sparkasse-sicher.top", registrable: "sparkasse-sicher.top", scheme: "https", isIp: false },
    ...over,
  }) as Report;

describe("sightings", () => {
  it("keeps only the registrable domain of dangerous links", () => {
    expect(sightings(report({}))).toEqual([{ domain: "sparkasse-sicher.top", brand: "Sparkasse" }]);
  });
  it("ignores links that are not dangerous", () => {
    expect(sightings(report({ result: { ...report({}).result, verdict: "suspicious" } }))).toEqual([]);
  });
  it("never lists big established sites", () => {
    const r = report({});
    r.target = { ...r.target!, registrable: "google.com" };
    expect(sightings(r)).toEqual([]);
  });
  it("takes dangerous links from a checked message", () => {
    const r = report({ mode: "message", target: undefined, links: [
      { url: "https://a.paket-zoll.top/", score: 95, verdict: "dangerous", top: [], domain: "paket-zoll.top" },
      { url: "https://www.dhl.de/", score: 3, verdict: "safe", top: [], domain: "dhl.de" },
    ] });
    expect(sightings(r).map((s) => s.domain)).toEqual(["paket-zoll.top"]);
  });
});

describe("defang", () => {
  it("breaks the domain so it cannot be clicked", () => {
    expect(defang("paypal-login.top")).toBe("paypal-login[.]top");
  });
});

describe("redis calls", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("sends no IP address, link or path to the database", async () => {
    vi.stubEnv("KV_REST_API_URL", "https://example.upstash.io");
    vi.stubEnv("KV_REST_API_TOKEN", "secret");
    const fetch = vi.fn(async () => new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    await recordScan(report({}), "203.0.113.7", Date.parse("2026-11-02T10:00:00Z"));
    const body = String((fetch.mock.calls[0] as unknown[])[1] && ((fetch.mock.calls[0] as unknown[])[1] as RequestInit).body);
    expect(body).toContain("tr:2026-11-02:r:sparkasse-sicher.top");
    expect(body).not.toContain("203.0.113.7");
    expect(body).not.toContain("email");
    expect(body).not.toContain("login.sparkasse");
  });

  it("lists only domains checked by enough different people", async () => {
    vi.stubEnv("KV_REST_API_URL", "https://example.upstash.io");
    vi.stubEnv("KV_REST_API_TOKEN", "secret");
    const now = Date.parse("2026-11-02T10:00:00Z");
    const fetch = vi.fn(async (_url: string, init: RequestInit) => {
      const cmds = JSON.parse(String(init.body)) as string[][];
      const result = cmds.map((c) => {
        if (c[0] === "ZRANGE" && c[1] === "tr:2026-11-02:d") return { result: ["a-phish.top", "9", "b-phish.top", "4"] };
        if (c[0] === "ZRANGE" && c[1] === "tr:2026-11-02:b") return { result: ["paypal", "5"] };
        if (c[0] === "HGETALL" && c[1] === "tr:2026-11-02:bn") return { result: ["paypal", "PayPal"] };
        if (c[0] === "PFCOUNT") return { result: c[1].includes("a-phish") ? 5 : c[1].includes("paypal") ? 3 : 1 };
        return { result: null };
      });
      return new Response(JSON.stringify(result), { status: 200 });
    });
    vi.stubGlobal("fetch", fetch);
    const t = await readTrends({ now, minPeople: 3 });
    expect(t.domains.map((d) => [d.name, d.people])).toEqual([["a-phish.top", 5]]);
    expect(t.brands).toEqual([{ name: "PayPal", people: 3, scans: 5 }]);
  });

  it("does nothing without a database", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await recordScan(report({}), "203.0.113.7");
    expect(fetch).not.toHaveBeenCalled();
    expect((await readTrends()).domains).toEqual([]);
  });
});

describe("database settings", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("accepts a custom prefix from the Vercel integration", async () => {
    vi.stubEnv("MAILHARPOON_KV_REST_API_URL", "https://example.upstash.io/");
    vi.stubEnv("MAILHARPOON_KV_REST_API_TOKEN", "secret");
    const { trendsEnabled } = await import("../trends/store");
    expect(trendsEnabled()).toBe(true);
  });
});
