import { describe, expect, it } from "vitest";
import { unwrapUrl } from "@/lib/analyzers/unwrap";

describe("unwrapping security-gateway links", () => {
  it("Microsoft Safe Links", () => {
    const r = unwrapUrl(
      "https://eur01.safelinks.protection.outlook.com/?url=https%3A%2F%2Fpaypal-login.top%2Fverify%3Fid%3D1&data=05%7C02%7Cx&sdata=abc&reserved=0",
    );
    expect(r).toEqual({ url: "https://paypal-login.top/verify?id=1", wrapper: "Microsoft Safe Links" });
  });

  it("Proofpoint v2", () => {
    const r = unwrapUrl("https://urldefense.proofpoint.com/v2/url?u=http-3A__www.example.com_path&d=DwMFaQ&c=x&r=y&m=z&s=w&e=");
    expect(r.url).toBe("http://www.example.com/path");
  });

  it("Proofpoint v3 (format decoded as in Proofpoint's reference decoder)", () => {
    const r = unwrapUrl(
      "https://urldefense.com/v3/__https://google.com:443/search?q=a*test&gs=ps__;Kw!-612Flbf0JvQ3kNJkRi5Jg!Ue6tQudNKaShHg93trcdjqDP8se2ySE65jyCIe2K1D_uNjZ1Lnf6YLQERujngZv9UWf66ujQIQ$",
    );
    expect(r.url).toBe("https://google.com:443/search?q=a+test&gs=ps");
  });

  it("nested wrappers: Google redirect inside Safe Links", () => {
    const inner = "https://www.google.com/url?q=https://evil.example/login&sa=D";
    const r = unwrapUrl(`https://nam12.safelinks.protection.outlook.com/?url=${encodeURIComponent(inner)}&data=x`);
    expect(r).toEqual({ url: "https://evil.example/login", wrapper: "Microsoft Safe Links" });
  });

  it("leaves ordinary links and non-http targets alone", () => {
    expect(unwrapUrl("https://www.google.com/search?q=test")).toEqual({ url: "https://www.google.com/search?q=test", wrapper: null });
    expect(unwrapUrl("https://www.google.com/url?q=javascript:alert(1)").wrapper).toBeNull();
  });
});
