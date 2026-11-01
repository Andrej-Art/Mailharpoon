// Headless Chromium for the rendered page check. On Vercel the packaged @sparticuz/chromium
// build is used; locally an installed Chrome (or CHROME_PATH). One browser is shared by
// all scans of a warm instance, every scan gets its own isolated context.
import { existsSync } from "node:fs";
import puppeteer, { type Browser } from "puppeteer-core";

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
const HARDENING = [
  "--proxy-server=http://127.0.0.1:9",
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

let browserP: Promise<Browser> | null = null;
let active = 0;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

async function launch(): Promise<Browser> {
  if (serverless()) {
    const chromium = (await import("@sparticuz/chromium")).default;
    chromium.setGraphicsMode = false;
    return puppeteer.launch({
      args: await puppeteer.defaultArgs({ args: [...chromium.args, ...HARDENING], headless: "shell" }),
      executablePath: await chromium.executablePath(),
      headless: "shell",
    });
  }
  return puppeteer.launch({ executablePath: localChrome(), headless: true, args: HARDENING });
}

/** Borrow the shared browser. Call the returned release function when done. */
export async function acquireBrowser(): Promise<{ browser: Browser; release: () => void }> {
  if (idleTimer) clearTimeout(idleTimer);
  active++;
  if (!browserP) {
    browserP = launch();
    browserP.then((b) => b.on("disconnected", () => (browserP = null))).catch(() => (browserP = null));
  }
  try {
    const browser = await browserP;
    return { browser, release: release };
  } catch (e) {
    release();
    throw e;
  }
}

function release() {
  active = Math.max(0, active - 1);
  if (active === 0) {
    // Free the memory of an idle local browser; serverless instances are frozen anyway.
    idleTimer = setTimeout(() => {
      const p = browserP;
      browserP = null;
      p?.then((b) => b.close()).catch(() => {});
    }, 60_000);
    idleTimer.unref?.();
  }
}
