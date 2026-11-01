import { describe, expect, it } from "vitest";
import { emptyPageData, inspectHtml, type PageData } from "@/lib/analyzers/page";
import { renderSignals, type RenderData } from "@/lib/analyzers/render";
import type { LayerResult } from "@/lib/analyzers/types";
import { parseTarget } from "@/lib/analyzers/url";

const t = parseTarget("https://secure-docs.example-host.net/login");
const inspect = (html: string, url = t.href) => {
  const base = emptyPageData(url, t.registrable);
  return { signals: inspectHtml(html, url, t, base).map((s) => s.id), base };
};

describe("page inspection: cloaking and host warnings", () => {
  it("recognises Cloudflare's phishing interstitial", () => {
    const { signals } = inspect("<title>Suspected Phishing | Cloudflare</title><body>Warning. This website has been reported for potential phishing.</body>");
    expect(signals).toContain("host_phishing_warning");
  });

  it("flags a home-made browser check, more so in front of a login", () => {
    const gate = "<body><p>Verifying your browser, please wait...</p></body>";
    expect(inspect(gate).signals).toContain("fake_browser_check");
    const withLogin = inspectHtml(`${gate}<form><input type="password" name="pw"></form>`, t.href, t, emptyPageData(t.href, t.registrable));
    expect(withLogin.find((s) => s.id === "fake_browser_check")?.weight).toBeGreaterThan(1);
  });

  it("does not read a reCAPTCHA notice as a Google login", () => {
    const html = '<form><input type="password"></form><p>This page is protected by Google reCAPTCHA. The Google Privacy Policy and Terms of Service apply.</p>';
    expect(inspect(html).signals).not.toContain("brand_login_mismatch");
  });

  it("leaves genuine Cloudflare challenges alone", () => {
    const html = '<body>Checking your browser before accessing the site.<script src="https://challenges.cloudflare.com/cdn-cgi/challenge-platform/x.js"></script></body>';
    expect(inspect(html).signals).not.toContain("fake_browser_check");
  });
});

describe("rendered page: only what the plain fetch missed", () => {
  const fetchedEmpty: LayerResult<PageData> = {
    layer: "page",
    status: "ok",
    ms: 1,
    signals: [],
    data: { ...emptyPageData(t.href, t.registrable), textSample: "Loading" },
  };
  const rendered = (html: string, extra: Partial<RenderData> = {}): RenderData => {
    const page = emptyPageData(t.href, t.registrable);
    inspectHtml(html, t.href, t, page);
    return { finalUrl: t.href, finalDomain: t.registrable, title: page.title, screenshot: null, passwordFields: 0, frames: 1, requests: 3, blockedRequests: 0, page, ...extra };
  };

  it("reports a login form that only scripts created", () => {
    const html = '<title>PayPal</title><form><input type="email" name="email"><input type="password" name="pw"></form>';
    const r = rendered(html, { passwordFields: 1 });
    const ids = renderSignals(t, fetchedEmpty, r, inspectHtml(html, t.href, t, emptyPageData(t.href, t.registrable))).map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(["js_built_login", "password_field", "brand_login_mismatch"]));
  });

  it("does not count evidence twice", () => {
    const html = '<form><input type="password" name="pw"></form>';
    const fetched: LayerResult<PageData> = { ...fetchedEmpty, signals: [{ id: "password_field", layer: "page", weight: 0.8, severity: "low" }] };
    fetched.data = { ...fetchedEmpty.data!, forms: [{ action: "", actionDomain: null, method: "post", hasPassword: true, hasEmail: false, hasCard: false, external: false }] };
    const ids = renderSignals(t, fetched, rendered(html, { passwordFields: 1 }), inspectHtml(html, t.href, t, emptyPageData(t.href, t.registrable))).map((s) => s.id);
    expect(ids).not.toContain("password_field");
    expect(ids).not.toContain("js_built_login");
  });

  it("notices a script redirect to another site", () => {
    const r = rendered("<p>hi</p>", { finalUrl: "https://paypal-login-check.top/", finalDomain: "paypal-login-check.top" });
    const ids = renderSignals(t, fetchedEmpty, r, []).map((s) => s.id);
    expect(ids).toContain("js_redirect");
    expect(ids).toContain("brand_in_host");
  });
});
