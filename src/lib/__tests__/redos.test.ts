import { describe, expect, it } from "vitest";
import { extractUrls, parseMessage } from "@/lib/text/parse";

// Regression guard for the URL_RE ReDoS: both nested quantifiers in the bare-domain
// alternatives were unbounded, so a long hyphen run ('a-'...) or dot run ('a.'...) drove
// O(n^2) backtracking. A single 100 KB message blocked the Node event loop for ~40 s.
// The fix bounds each label ({1,63}) and the label count ({0,15}), and extractUrls now
// scans at most the 20 KB that the body slice keeps anyway. Keep both pathological inputs here.
describe("URL_RE ReDoS guard", () => {
  // A generous ceiling: the pre-fix regex took tens of seconds, the fixed one is well under
  // 100 ms, so 500 ms detects a regression without being flaky on a loaded CI box.
  const BUDGET_MS = 500;

  it("stays fast on a long hyphen run (dotless)", () => {
    const input = "a-".repeat(50000); // 100 000 chars, the message mode maximum
    const t0 = performance.now();
    const out = extractUrls(input);
    const ms = performance.now() - t0;
    expect(out).toEqual([]);
    expect(ms).toBeLessThan(BUDGET_MS);
  });

  it("stays fast on a long dot run (dotted)", () => {
    const input = "a.".repeat(50000); // 100 000 chars
    const t0 = performance.now();
    const out = extractUrls(input);
    const ms = performance.now() - t0;
    expect(out).toEqual([]);
    expect(ms).toBeLessThan(BUDGET_MS);
  });

  it("stays fast when the whole payload goes through parseMessage", () => {
    const t0 = performance.now();
    parseMessage("a-".repeat(50000));
    parseMessage("a.".repeat(50000));
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(BUDGET_MS);
  });
});

// Detection logic must not regress with the bounded regex.
describe("extractUrls detection parity", () => {
  it("finds a scheme URL", () => {
    expect(extractUrls("visit http://evil.com/login now")).toEqual(["http://evil.com/login"]);
  });

  it("finds a www URL", () => {
    expect(extractUrls("go to www.paypal-secure.top/account please")).toEqual(["http://www.paypal-secure.top/account"]);
  });

  it("finds a bare domain with a path", () => {
    expect(extractUrls("bare domain example.com/path?x=1 end")).toEqual(["http://example.com/path?x=1"]);
  });

  it("refangs hxxp and [.]", () => {
    expect(extractUrls("hxxp://evil[.]com defanged")).toEqual(["http://evil.com"]);
  });

  it("finds multiple links, capped and de-duplicated", () => {
    expect(extractUrls("multi a.com/1 b.net/2 c.org/3 d.io/4")).toEqual([
      "http://a.com/1",
      "http://b.net/2",
      "http://c.org/3",
      "http://d.io/4",
    ]);
  });

  it("finds a long but legitimate subdomain chain (~10 labels)", () => {
    expect(extractUrls("deep a.b.c.d.e.f.g.h.i.j.example.com/path here")).toEqual(["http://a.b.c.d.e.f.g.h.i.j.example.com/path"]);
  });

  it("finds a defanged subdomain chain ending in a known TLD without a path", () => {
    expect(extractUrls("login.secure.account[.]paypal[.]com phishing")).toEqual(["http://login.secure.account.paypal.com"]);
  });

  it("does not treat an email domain as a standalone link", () => {
    expect(extractUrls("mail me max@firma.de thanks")).toEqual([]);
  });

  it("ignores a word with a slash that is not a domain", () => {
    expect(extractUrls("no tld justaword/path should? maybe")).toEqual([]);
  });
});
