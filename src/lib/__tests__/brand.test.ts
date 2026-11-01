import { describe, expect, it } from "vitest";
import { analyzeBrand, editDistance, skeleton } from "@/lib/analyzers/brand";
import { parseTarget } from "@/lib/analyzers/url";

const ids = (url: string) => analyzeBrand(parseTarget(url)).signals.map((s) => s.id);

describe("brand impersonation", () => {
  it("normalises look-alike characters", () => {
    expect(skeleton("arnazon")).toBe("amazon");
    expect(skeleton("paypa1")).toBe("paypal");
    expect(skeleton("рaypal")).toBe("paypal"); // Cyrillic р
    expect(editDistance("steamcommnnunity", "steamcommunity")).toBe(2);
  });

  it.each([
    ["https://www.arnazon-prime-support.com/login", ["homoglyph"]],
    ["https://paypa1-secure-login.pages.dev/verify", ["homoglyph"]],
    ["https://xn--aypal-uye.com/", ["homoglyph"]], // рaypal with Cyrillic р
    ["https://micros0ft.com", ["homoglyph"]],
    ["https://steamcommnnunity.com/tradeoffer", ["typosquat"]],
    ["https://login.paypal.com.secure-check.net", ["brand_in_host"]],
    ["https://mydpd.tmstb.xyz/track", ["brand_in_host"]],
    ["https://www.ehay.item.scpconst.com/", ["typosquat_subdomain"]],
  ])("flags %s", (url, expected) => {
    for (const id of expected) expect(ids(url)).toContain(id);
  });

  it.each([
    "https://www.paypal.com/signin",
    "https://www.amazon.de/gp/cart",
    "https://de.wikipedia.org/wiki/Phishing",
    "https://www.heise.de/news",
    "https://booking-system.example.org",
    "https://pineapple-recipes.com",
  ])("does not flag %s", (url) => {
    const risky = analyzeBrand(parseTarget(url)).signals.filter((s) => s.weight > 0);
    expect(risky).toEqual([]);
  });
});
