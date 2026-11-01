// Orchestrates all layers. Fast, offline layers run first so the UI can show
// a preliminary verdict instantly; network layers stream in as they finish.
import { analyzeAi, type AiVerdict } from "./analyzers/ai";
import { analyzeBrand, ownsBrand, type BrandData } from "./analyzers/brand";
import { fuse, type Fused } from "./analyzers/fusion";
import { analyzeIntel } from "./analyzers/intel";
import { analyzeLexical } from "./analyzers/lexical";
import { analyzeNetwork } from "./analyzers/network";
import { analyzePage, type PageData } from "./analyzers/page";
import { analyzeRender, type RenderData } from "./analyzers/render";
import { isUserContentHost, trancoRank } from "./analyzers/reputation";
import { analyzeReputation } from "./analyzers/reputation";
import { signal, type LayerResult } from "./analyzers/types";
import { unwrapUrl } from "./analyzers/unwrap";
import { analyzeVisual } from "./analyzers/visual";
import { parseTarget, type ParsedTarget } from "./analyzers/url";

export type ScanTarget = Pick<ParsedTarget, "href" | "hostname" | "unicodeHost" | "registrable" | "scheme" | "isIp"> & {
  /** Set when the pasted link was wrapped by a security gateway (Safe Links, Proofpoint ...). */
  wrapper?: string;
  original?: string;
};

export interface MessageMeta {
  kind: "email" | "text";
  subject: string | null;
  from: { name: string; address: string; domain: string } | null;
  excerpt: string;
  linkCount: number;
}

export interface LinkSummary {
  url: string;
  text?: string;
  score: number;
  verdict: Fused["verdict"];
  top: Report["result"]["topSignals"];
  domain: string;
}

export interface Report {
  id: string;
  mode: "url" | "message";
  scannedAt: string;
  target?: ScanTarget;
  message?: MessageMeta;
  links?: LinkSummary[];
  result: Fused;
  layers: LayerResult[];
  durationMs: number;
  version: string;
}

export type ScanEvent =
  | { type: "target"; target: ScanTarget }
  | { type: "message"; message: MessageMeta }
  | { type: "link"; link: LinkSummary }
  | { type: "layer"; layer: LayerResult; preliminary: Fused }
  | { type: "report"; report: Report }
  | { type: "error"; code: string };

const timeout = <T,>(p: Promise<T>, ms: number, fallback: T) =>
  Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);

const timedOut = (layer: LayerResult["layer"]): LayerResult => ({ layer, status: "error", ms: 0, signals: [], note: "timeout" });

export async function runScan(raw: string, opts: { locale: "de" | "en"; ai: boolean; intel?: boolean; render?: boolean }, emit: (e: ScanEvent) => void): Promise<Report> {
  const started = Date.now();
  // Check the real destination, not the security gateway that rewrote the link.
  const pasted = parseTarget(raw);
  const unwrapped = unwrapUrl(pasted.href);
  const t = unwrapped.wrapper ? parseTarget(unwrapped.url) : pasted;
  const target: ScanTarget = {
    href: t.href,
    hostname: t.hostname,
    unicodeHost: t.unicodeHost,
    registrable: t.registrable,
    scheme: t.scheme,
    isIp: t.isIp,
    ...(unwrapped.wrapper ? { wrapper: unwrapped.wrapper, original: pasted.href } : {}),
  };
  emit({ type: "target", target });

  const layers: LayerResult[] = [];
  const push = (l: LayerResult) => {
    layers.push(l);
    emit({ type: "layer", layer: l, preliminary: fuse(layers) });
    return l;
  };

  push(analyzeLexical(t));
  push(analyzeBrand(t));

  const pageP = timeout(analyzePage(t), 14_000, timedOut("page")).then(push);
  // The browser run starts once the plain fetch is in, so it only reports what the fetch missed.
  const renderP =
    opts.render === false
      ? Promise.resolve(undefined)
      : pageP.then((p) => timeout(analyzeRender(t, p as LayerResult<PageData>), 24_000, timedOut("render"))).then((r) => (r.status === "skipped" ? undefined : push(r)));
  const [, , , page, render] = await Promise.all([
    timeout(analyzeReputation(t), 9_000, timedOut("reputation")).then(push),
    timeout(analyzeNetwork(t), 9_000, timedOut("network")).then(push),
    // Intel also checks the final URL after redirects, so it waits for the page fetch.
    pageP.then((p) => {
      if (opts.intel === false) return push({ layer: "intel", status: "skipped", ms: 0, signals: [], note: "disabled" });
      const final = (p.data as PageData | undefined)?.finalUrl;
      return timeout(analyzeIntel(t, final && final !== t.href ? [final] : []), 6_000, timedOut("intel")).then(push);
    }),
    pageP,
    renderP,
  ]);
  const rendered = render?.status === "ok" ? (render.data as RenderData) : undefined;

  // Where the visitor actually lands matters more than the link they clicked (shorteners,
  // open redirects, cloaking). Re-run the offline layers on the destination.
  const finalUrl = (page.data as PageData | undefined)?.finalUrl;
  if (finalUrl) {
    try {
      const dest = parseTarget(finalUrl);
      if (dest.registrable !== t.registrable) {
        const started = Date.now();
        const sigs = [...analyzeLexical(dest).signals, ...analyzeBrand(dest).signals];
        const rank = trancoRank(dest.registrable);
        if (rank && rank <= 10_000 && !isUserContentHost(dest)) sigs.push(signal("redirect", "dest_popular", -2.0, { domain: dest.registrable, rank }));
        // A link that only forwards to the official site of the brand in its name is harmless:
        // the visitor ends up at the real bank (volksbank-mittelhessen.de to vb-mittelhessen.de).
        const claimed = (layers.find((l) => l.layer === "brand")?.data as BrandData | undefined)?.claimedBrands ?? [];
        const owned = claimed.find((b) => ownsBrand(dest.registrable, b));
        if (owned && !isUserContentHost(dest)) sigs.push(signal("redirect", "dest_official_brand", -2.6, { brand: owned, domain: dest.registrable }));
        push({
          layer: "redirect",
          status: "ok",
          ms: Date.now() - started,
          signals: sigs.map((x) => ({ ...x, layer: "redirect" as const })),
          data: { destination: dest.href, domain: dest.registrable },
        });
      }
    } catch {}
  }

  if (opts.ai) {
    const pre = fuse(layers);
    const facts = {
      preliminary_score: pre.score,
      signals: pre.topSignals.map((s) => ({ id: s.id, ...s.params })),
    };
    // The rendered DOM shows what the visitor sees, including forms built by scripts.
    const pageData = rendered ? { ...rendered.page, hops: (page.data as PageData | undefined)?.hops ?? [] } : (page.data as PageData | undefined);
    const ai = push(await timeout(analyzeAi(t, pageData, facts, opts.locale, rendered?.screenshot), 22_000, timedOut("ai")));
    const landed = rendered?.finalUrl ?? (page.data as PageData | undefined)?.finalUrl;
    if (ai.status === "ok" && ai.data && landed && (rendered || (page.data as PageData | undefined)?.fetched)) {
      try {
        push(analyzeVisual(ai.data as AiVerdict, landed));
      } catch {}
    }
  }

  const report: Report = {
    id: crypto.randomUUID(),
    mode: "url",
    scannedAt: new Date().toISOString(),
    target,
    result: fuse(layers),
    layers,
    durationMs: Date.now() - started,
    version: "2.0.0",
  };
  emit({ type: "report", report });
  return report;
}
