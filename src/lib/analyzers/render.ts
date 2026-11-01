// Rendered page check: open the link in a real (headless) browser, let its scripts run and
// inspect what a visitor actually sees. Phishing kits often build the login form in
// JavaScript or show scanners a harmless page (CrawlPhish, IEEE S&P 2021), which the plain
// HTML fetch in page.ts cannot see. All browser traffic passes the vetted egress proxy.
import type { BrowserContext } from "puppeteer-core";
import { parse } from "tldts";
import { startEgressProxy } from "@/lib/net/egress-proxy";
import { BROWSER_UA } from "@/lib/net/safe-fetch";
import { acquireBrowser, renderEnabled } from "@/lib/render/browser";
import { analyzeBrand } from "./brand";
import { emptyPageData, GATE_RE, inspectHtml, type PageData } from "./page";
import { signal, type LayerResult, type Signal } from "./types";
import { parseTarget, type ParsedTarget } from "./url";

export interface RenderData {
  finalUrl: string;
  finalDomain: string;
  title: string;
  /** JPEG of the first screen as data URI. */
  screenshot: string | null;
  /** Visible password fields in the page and all of its frames. */
  passwordFields: number;
  frames: number;
  requests: number;
  blockedRequests: number;
  page: PageData;
}

const MAX_REQUESTS = 250;
const MAX_HTML = 1_500_000;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const within = <T,>(ms: number, p: Promise<T>, fallback: T) => Promise.race([p, sleep(ms).then(() => fallback)]);
const reg = (u: string) => parse(u, { allowPrivateDomains: true }).domain ?? "";

export async function analyzeRender(t: ParsedTarget, fetched?: LayerResult<PageData>): Promise<LayerResult<RenderData>> {
  const start = Date.now();
  if (!renderEnabled()) return { layer: "render", status: "skipped", ms: 0, signals: [], note: "unavailable" };

  const proxy = await startEgressProxy();
  let lease: Awaited<ReturnType<typeof acquireBrowser>> | null = null;
  let context: BrowserContext | null = null;
  try {
    lease = await acquireBrowser();
    context = await lease.browser.createBrowserContext({ proxyServer: proxy.url, proxyBypassList: ["<-loopback>"] });
    const page = await context.newPage();
    await page.setUserAgent({ userAgent: BROWSER_UA });
    await page.setViewport({ width: 1280, height: 800 });
    await page.setExtraHTTPHeaders({ "accept-language": "en-US,en;q=0.9,de;q=0.8" });
    const cdp = await page.createCDPSession();
    await cdp.send("Page.setDownloadBehavior", { behavior: "deny" }).catch(() => {});

    let requests = 0;
    await page.setRequestInterception(true);
    page.on("request", (r) => {
      requests++;
      const ok = /^(https?|data|blob):/i.test(r.url()) && r.resourceType() !== "media" && requests <= MAX_REQUESTS;
      (ok ? r.continue() : r.abort()).catch(() => {});
    });
    page.on("dialog", (d) => d.dismiss().catch(() => {}));
    page.on("popup", (p) => p?.close().catch(() => {}));

    // Heavy legitimate sites may never fire "load" in time, so the budget is split: the
    // document first, then a short, bounded wait for scripts to settle.
    // One shared budget for loading. Bot-protected or slow sites may never finish, so whatever
    // is on screen when the budget runs out gets inspected.
    const deadline = Date.now() + 13_000;
    const left = (cap: number) => Math.max(0, Math.min(cap, deadline - Date.now()));
    await page.goto(t.href, { waitUntil: "domcontentloaded", timeout: 9000 }).catch(() => {});
    await page.waitForFunction(() => document.readyState === "complete", { timeout: left(3000) }).catch(() => {});
    await page.waitForNetworkIdle({ idleTime: 500, timeout: left(1500) }).catch(() => {});
    // Kits put a fake "verifying your browser" screen in front of the login. Wait it out once.
    const gated = await within(1000, page.evaluate(() => document.body?.innerText.slice(0, 2000) ?? "").then((x) => GATE_RE.test(x)), false).catch(() => false);
    if (gated && left(9999) > 3000) {
      await sleep(left(5500) - 1000);
      await page.waitForNetworkIdle({ idleTime: 500, timeout: left(1500) }).catch(() => {});
    }

    const finalUrl = page.url();
    if (!/^https?:/i.test(finalUrl)) return { layer: "render", status: "error", ms: Date.now() - start, signals: [], note: "not_loaded" };

    const html = (await within(2000, page.content(), "")).slice(0, MAX_HTML);
    let passwordFields = 0;
    // Empty frames can hold an evaluation for 30 s, so only loaded frames count and each gets a short budget.
    for (const frame of page.frames().filter((f) => !f.detached && /^https?:/i.test(f.url())).slice(0, 10)) {
      try {
        passwordFields += await within(800, frame.$$eval('input[type="password"]', (els) => els.filter((e) => (e as HTMLElement).offsetParent !== null).length), 0);
      } catch {}
    }
    const shot = await within(2500, page.screenshot({ type: "jpeg", quality: 55, encoding: "base64", optimizeForSpeed: true, captureBeyondViewport: false }), null).catch(() => null);

    const finalDomain = reg(finalUrl) || t.registrable;
    const rendered: PageData = { ...emptyPageData(finalUrl, finalDomain) };
    const found = inspectHtml(html, finalUrl, t, rendered);
    const data: RenderData = {
      finalUrl,
      finalDomain,
      title: rendered.title,
      screenshot: shot ? `data:image/jpeg;base64,${shot}` : null,
      passwordFields,
      frames: page.frames().length,
      requests,
      blockedRequests: proxy.blocked(),
      page: rendered,
    };
    return { layer: "render", status: "ok", ms: Date.now() - start, signals: renderSignals(t, fetched, data, found), data };
  } catch (e) {
    if (process.env.RENDER_DEBUG) console.error("render failed", e);
    return { layer: "render", status: "error", ms: Date.now() - start, signals: [], note: "failed" };
  } finally {
    await context?.close().catch(() => {});
    lease?.release();
    await proxy.close();
  }
}

/** Only evidence the plain fetch did not already report counts again, so nothing is counted twice. */
export function renderSignals(t: ParsedTarget, fetched: LayerResult<PageData> | undefined, r: RenderData, found: Signal[]): Signal[] {
  const R = "render" as const;
  const before = fetched?.data?.fetched ? fetched.data : undefined;
  const known = new Set(before ? fetched!.signals.map((s) => s.id) : []);
  const out: Signal[] = found.filter((s) => !known.has(s.id)).map((s) => ({ ...s, layer: R }));

  // A login form that exists only after the scripts ran: typical for kits that hide from scanners.
  const staticLogin = before?.forms.some((f) => f.hasPassword) ?? false;
  const renderedLogin = r.passwordFields > 0 || r.page.forms.some((f) => f.hasPassword);
  if (before && renderedLogin && !staticLogin) out.push(signal(R, "js_built_login", 0.4));
  if (r.passwordFields > 0 && !out.some((s) => s.id === "password_field") && !known.has("password_field")) out.push(signal(R, "password_field", 0.8));

  // The scripts sent the visitor to another site than the plain fetch did.
  const fetchedDomain = before?.finalDomain ?? t.registrable;
  if (r.finalDomain && r.finalDomain !== fetchedDomain && r.finalDomain !== t.registrable) {
    out.push(signal(R, "js_redirect", 0.7, { domain: r.finalDomain }));
    try {
      for (const s of analyzeBrand(parseTarget(r.finalUrl)).signals) if (s.weight > 0) out.push({ ...s, layer: R });
    } catch {}
  }
  return out;
}
