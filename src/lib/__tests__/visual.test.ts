import { describe, expect, it } from "vitest";
import type { AiVerdict } from "@/lib/analyzers/ai";
import { kbBrandAt, kbDomainsFor, normName } from "@/lib/analyzers/brand-kb";
import { analyzeVisual } from "@/lib/analyzers/visual";

const ai = (brand: string | null, requests: AiVerdict["requests"] = ["password"], brand_domains: string[] = []): AiVerdict => ({
  verdict: "suspicious",
  risk: 0.5,
  impersonated_brand: null,
  brand_on_page: brand,
  brand_domains,
  requests,
  reasons: [],
});

describe("Wikidata brand knowledge base", () => {
  it("normalises legal forms and accents", () => {
    expect(normName("Deutsche Bank AG")).toBe("deutsche bank");
    expect(normName("Stadtwerke München GmbH")).toBe("stadtwerke munchen");
  });

  it("knows official domains beyond the curated list", () => {
    expect(kbDomainsFor("Commerzbank")).toContain("commerzbank.de");
    expect(kbBrandAt("Stadtwerke München", "swm.de")).toBe(true);
  });
});

describe("visual brand check", () => {
  it("confirms a brand on its own domain", () => {
    const r = analyzeVisual(ai("PayPal"), "https://www.paypal.com/signin");
    expect(r.data?.outcome).toBe("official");
    expect(r.signals[0].weight).toBeLessThan(0);
  });

  it("flags a brand login on a foreign domain", () => {
    const r = analyzeVisual(ai("PayPal"), "https://paypal-konto-check.top/login");
    expect(r.data?.outcome).toBe("mismatch");
    expect(r.signals[0]).toMatchObject({ id: "visual_brand_mismatch", weight: 3.2 });
  });

  it("does not let the model vouch for a phishing domain of a known brand", () => {
    const r = analyzeVisual(ai("PayPal", ["password"], ["paypal.com", "paypal-konto-check.top"]), "https://paypal-konto-check.top/login");
    expect(r.data?.outcome).toBe("mismatch");
  });

  it("counts a parcel-style address form at reduced weight", () => {
    const r = analyzeVisual(ai("DHL", ["personal_data"]), "https://dhl-zustellung-info.top/paket");
    expect(r.data?.outcome).toBe("mismatch");
    expect(r.signals[0].weight).toBeCloseTo(2.24);
  });

  it("stays neutral for unknown small businesses", () => {
    const r = analyzeVisual(ai("Bäckerei Schmidt Kundenportal"), "https://baeckerei-schmidt-portal.de/login");
    expect(r.data?.outcome).toBe("unverified");
    expect(r.signals).toHaveLength(0);
  });

  it("stays neutral when a large site merely shows a brand", () => {
    const r = analyzeVisual(ai("PayPal", ["none"]), "https://www.spiegel.de/wirtschaft/paypal-artikel");
    expect(r.signals).toHaveLength(0);
  });

  it("does nothing without a brand", () => {
    expect(analyzeVisual(ai(null), "https://example.org/").data?.outcome).toBe("no_brand");
  });
});
