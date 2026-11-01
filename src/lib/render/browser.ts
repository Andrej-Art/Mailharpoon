// Headless Chromium for the rendered page check. On Vercel the packaged @sparticuz/chromium
// build is used; locally an installed Chrome (or CHROME_PATH). Locally one browser is shared
// by all scans and every scan gets its own isolated context. The serverless build runs
// single-process, where extra contexts crash, so there every scan gets a fresh browser.
import { existsSync } from "node:fs";
import puppeteer, { type Browser, type Page } from "puppeteer-core";

const LOCAL_CANDIDATES: Record<string, string[]> = {
  darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium"],
  linux: ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"],
  win32: ["C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"],
};

const serverless = () => Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const localChrome = () => process.env.CHROME_PATH || LOCAL_CANDIDATES[process.platform]?.find((p) => existsSync(p));

export function renderEnabled(): boolean {
  if (process.env.RENDER_DISABLED === "1") return false;
  return serverless() || Boolean(localChrome());
}

// Network hardening. Every context gets its own vetted proxy (egress-proxy.ts); the browser
// default points at a closed port so nothing can leave unproxied. Chrome may not resolve any
// name itself, which rules out DNS rebinding behind the proxy's back.
const CLOSED_PROXY = "http://127.0.0.1:9";
const HARDENING = [
  "--proxy-bypass-list=<-loopback>",
  "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1",
  "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
  "--webrtc-ip-handling-policy=disable_non_proxied_udp",
  "--disable-background-networking",
  "--disable-component-update",
  "--disable-default-apps",
  "--disable-extensions",
  "--disable-sync",
  "--no-default-browser-check",
  "--no-first-run",
  "--mute-audio",
  // Kits hide from automated browsers via navigator.webdriver; the scan should see what a person sees.
  "--disable-blink-features=AutomationControlled",
];

// Lambda defaults that would make the scan browser less like a person's browser.
const DROP = new Set(["--disable-web-security", "--allow-running-insecure-content"]);

let browserP: Promise<Browser> | null = null;
let active = 0;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

async function launch(proxy: string): Promise<Browser> {
  const args = [`--proxy-server=${proxy}`, ...HARDENING];
  if (serverless()) {
    const chromium = (await import("@sparticuz/chromium")).default;
    chromium.setGraphicsMode = false;
    return puppeteer.launch({
      args: await puppeteer.defaultArgs({ args: [...chromium.args.filter((a) => !DROP.has(a)), ...args], headless: "shell" }),
      executablePath: await chromium.executablePath(),
      headless: "shell",
    });
  }
  return puppeteer.launch({ executablePath: localChrome(), headless: true, args });
}

export interface Lease {
  /** Opens a page whose traffic goes through the given egress proxy. */
  newPage(): Promise<Page>;
  release(): Promise<void>;
}

/** A browser session for one scan, all traffic through `proxy`. Release it when done. */
export async function acquireBrowser(proxy: string): Promise<Lease> {
  if (serverless()) {
    const browser = await launch(proxy);
    return {
      newPage: () => browser.newPage(),
      release: () => browser.close().catch(() => {}),
    };
  }
  if (idleTimer) clearTimeout(idleTimer);
  active++;
  if (!browserP) {
    // The shared browser's own default points at a closed port, so nothing leaves unproxied.
    browserP = launch(CLOSED_PROXY);
    browserP.then((b) => b.on("disconnected", () => (browserP = null))).catch(() => (browserP = null));
  }
  try {
    const browser = await browserP;
    const context = await browser.createBrowserContext({ proxyServer: proxy, proxyBypassList: ["<-loopback>"] });
    return {
      newPage: () => context.newPage(),
      release: async () => {
        await context.close().catch(() => {});
        release();
      },
    };
  } catch (e) {
    release();
    throw e;
  }
}

function release() {
  active = Math.max(0, active - 1);
  if (active === 0) {
    // Free the memory of an idle local browser.
    idleTimer = setTimeout(() => {
      const p = browserP;
      browserP = null;
      p?.then((b) => b.close()).catch(() => {});
    }, 60_000);
    idleTimer.unref?.();
  }
}
