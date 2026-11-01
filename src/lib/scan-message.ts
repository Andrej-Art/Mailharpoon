// Orchestrates a message scan: content and sender analysis run instantly, every link
// in the message goes through the full URL pipeline in parallel, then the AI layer.
import { analyzeMessageAi } from "./analyzers/ai";
import { fuse } from "./analyzers/fusion";
import { analyzeMessageContent, analyzeSender } from "./analyzers/message";
import { signal, type LayerResult, type Signal } from "./analyzers/types";
import { runScan, type LinkSummary, type MessageMeta, type Report, type ScanEvent } from "./scan";
import { parseMessage } from "./text/parse";
import { redact } from "./text/redact";

const MAX_SCANNED_LINKS = 3;

export class EmptyMessageError extends Error {}

export async function runMessageScan(
  raw: string,
  opts: { locale: "de" | "en"; ai: boolean; links?: boolean; intel?: boolean },
  emit: (e: ScanEvent) => void,
): Promise<Report> {
  const started = Date.now();
  const m = parseMessage(raw);
  if (!m.body.trim() && !m.links.length) throw new EmptyMessageError("empty");

  const meta: MessageMeta = {
    kind: m.kind,
    subject: m.subject,
    from: m.from,
    excerpt: m.body.slice(0, 280),
    linkCount: m.links.length,
  };
  emit({ type: "message", message: meta });

  const layers: LayerResult[] = [];
  const push = (l: LayerResult) => {
    layers.push(l);
    emit({ type: "layer", layer: l, preliminary: fuse(layers) });
  };

  const content = analyzeMessageContent(m);
  push(content);
  const sender = analyzeSender(m, content.data?.claimedBrands ?? []);
  if (sender) push(sender);

  // Scan the links (most suspicious-looking first would need a pre-score; the first N are a good proxy).
  const links: LinkSummary[] = [];
  if (opts.links !== false && m.links.length) {
    const started = Date.now();
    const targets = m.links.slice(0, MAX_SCANNED_LINKS);
    const results = await Promise.all(
      targets.map(async (l) => {
        try {
          const r = await runScan(l.url, { locale: opts.locale, ai: false, intel: opts.intel, render: false }, () => {});
          const summary: LinkSummary = {
            url: r.target!.href,
            text: l.text,
            score: r.result.score,
            verdict: r.result.verdict,
            top: r.result.topSignals.slice(0, 3),
            domain: r.target!.registrable,
          };
          emit({ type: "link", link: summary });
          return { summary, report: r };
        } catch {
          return null;
        }
      }),
    );

    const sigs: Signal[] = [];
    for (const res of results) {
      if (!res) continue;
      links.push(res.summary);
      const { result } = res.report;
      const malicious = result.topSignals.some((x) => x.override === "malicious");
      const w = result.verdict === "dangerous" ? 3.2 : result.verdict === "suspicious" ? 1.4 : -0.3;
      sigs.push({
        ...signal("links", `link_${result.verdict}`, w, { domain: res.summary.domain, score: result.score }),
        ...(malicious ? { override: "malicious" as const } : {}),
      });
    }
    // One dangerous link decides; several safe links should not add up to a lot of trust.
    const best = sigs.sort((a, b) => b.weight - a.weight);
    push({ layer: "links", status: "ok", ms: Date.now() - started, signals: best.filter((x, i) => x.weight > 0 || i === 0), data: links });
  }

  if (opts.ai) {
    const pre = fuse(layers);
    const facts = {
      kind: m.kind,
      sender: m.from ? { name: m.from.name, domain: m.from.domain } : null,
      reply_to_domain: m.replyTo?.domain ?? null,
      auth: m.auth,
      links: links.map((l) => ({ domain: l.domain, verdict: l.verdict, score: l.score })),
      preliminary_score: pre.score,
      signals: pre.topSignals.map((x) => x.id),
    };
    const ai = await analyzeMessageAi(redact(`${m.subject ? `Subject: ${m.subject}\n` : ""}${m.body}`), facts, opts.locale);
    // The "no call to action" heuristic is a crude stand-in for reading the text. Once the
    // model has read it, its judgement replaces the heuristic.
    if (ai.status === "ok") content.signals = content.signals.filter((x) => x.id !== "msg_no_call_to_action");
    ai.signals = ai.signals.map((x) => ({ ...x, id: x.id.replace(/^ai_/, "ai_msg_") }));
    push(ai);
  }

  const report: Report = {
    id: crypto.randomUUID(),
    mode: "message",
    scannedAt: new Date().toISOString(),
    message: meta,
    links,
    result: fuse(layers),
    layers,
    durationMs: Date.now() - started,
    version: "2.0.0",
  };
  emit({ type: "report", report });
  return report;
}
