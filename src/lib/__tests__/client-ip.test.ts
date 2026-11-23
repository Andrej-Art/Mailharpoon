import { describe, expect, it } from "vitest";
import { clientIp } from "@/lib/client-ip";

const reqWith = (headers: Record<string, string>) => new Request("http://localhost/api/scan", { headers });

describe("clientIp — trusted-hop derivation", () => {
  it("prefers the platform-set x-real-ip over anything in x-forwarded-for", () => {
    const req = reqWith({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "6.6.6.6, 7.7.7.7" });
    expect(clientIp(req)).toBe("203.0.113.7");
  });

  it("does NOT treat a rotating left X-Forwarded-For entry as different clients", () => {
    // One trusted proxy (the default) appends the real client IP on the right; the attacker only
    // controls the left part. The derived IP must stay constant no matter what they rotate there.
    const derived = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const spoof = `10.0.0.${i}`;
      const req = reqWith({ "x-forwarded-for": `${spoof}, 203.0.113.7` });
      derived.add(clientIp(req));
    }
    expect([...derived]).toEqual(["203.0.113.7"]);
  });

  it("reads the right-most (proxy-appended) entry with the default single trusted proxy", () => {
    expect(clientIp(reqWith({ "x-forwarded-for": "198.51.100.9" }))).toBe("198.51.100.9");
    expect(clientIp(reqWith({ "x-forwarded-for": "evil, 198.51.100.9" }))).toBe("198.51.100.9");
  });

  it("falls back to anon when no trustworthy header is present", () => {
    expect(clientIp(reqWith({}))).toBe("anon");
    expect(clientIp(reqWith({ "x-forwarded-for": "   ,  " }))).toBe("anon");
  });

  it("trims whitespace around header values", () => {
    expect(clientIp(reqWith({ "x-real-ip": "  203.0.113.7  " }))).toBe("203.0.113.7");
  });
});
