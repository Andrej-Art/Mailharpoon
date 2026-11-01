"use client";

import {
  AlertTriangle, ArrowDown, ArrowUp, Bot, Camera, Check, ChevronDown, Copy, Globe, KeyRound, Loader2, Lock, Radar,
  Mail, RotateCcw, ShieldAlert, ShieldCheck, ShieldQuestion, Sparkles,
} from "lucide-react";
import clsx from "clsx";
import { useState, type ReactNode } from "react";
import type { AiVerdict } from "@/lib/analyzers/ai";
import type { BrandData } from "@/lib/analyzers/brand";
import type { IntelData } from "@/lib/analyzers/intel";
import type { LexicalData } from "@/lib/analyzers/lexical";
import type { NetworkData } from "@/lib/analyzers/network";
import type { PageData } from "@/lib/analyzers/page";
import type { RenderData } from "@/lib/analyzers/render";
import type { ReputationData } from "@/lib/analyzers/reputation";
import type { Layer, LayerResult, Signal } from "@/lib/analyzers/types";
import type { VisualData } from "@/lib/analyzers/visual";
import { fill, type Dict } from "@/i18n";
import { brandName } from "@/lib/data/brand-display";
import type { ScanState } from "./Scanner";

const LAYER_ORDER: Layer[] = ["intel", "reputation", "lexical", "brand", "page", "render", "redirect", "network", "ai", "visual"];
// Shown only when they ran: not every link redirects, and the browser and brand check depend on the setup.
const OPTIONAL_LAYERS: Layer[] = ["render", "redirect", "visual"];
const MESSAGE_LAYERS: Layer[] = ["message", "sender", "links", "ai"];

const VERDICT = {
  safe: { icon: ShieldCheck, text: "text-ok", border: "border-ok", bg: "bg-ok", tint: "bg-ok/[0.07]" },
  suspicious: { icon: ShieldQuestion, text: "text-warn", border: "border-warn", bg: "bg-warn", tint: "bg-warn/[0.07]" },
  dangerous: { icon: ShieldAlert, text: "text-bad", border: "border-bad", bg: "bg-bad", tint: "bg-bad/[0.08]" },
} as const;

export function signalText(t: Dict, s: Signal): string {
  const tpl = t.signals[s.id] ?? s.id;
  const params = s.params?.brand ? { ...s.params, brand: brandName(String(s.params.brand)) } : s.params;
  const text = fill(tpl, params);
  return s.id.startsWith("ai_") && s.params?.brand ? `${text} ${fill(t.report.aiBrand, params)}` : text;
}

/** 20-segment block meter, like a terminal progress bar. */
function Meter({ score, colour }: { score: number; colour: string }) {
  const filled = Math.round(score / 5);
  return (
    <div className="flex gap-[3px]" role="meter" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}>
      {Array.from({ length: 20 }, (_, i) => (
        <span key={i} className={clsx("h-6 flex-1 transition-colors duration-500", i < filled ? colour : "bg-white/[0.07]")} />
      ))}
    </div>
  );
}

function Box({ title, icon, children, className }: { title: string; icon: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={clsx("bg-void p-5", className)}>
      <h4 className="label mb-4 flex items-center gap-2 text-fg">
        <span className="text-harpoon">{icon}</span>
        {title}
      </h4>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-line py-1.5 text-[13px] last:border-0">
      <dt className="shrink-0 text-dim">{k}</dt>
      <dd className="min-w-0 text-right font-mono break-words text-muted">{v ?? "-"}</dd>
    </div>
  );
}

const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : null;

export function Report({ state, t, onReset }: { state: ScanState; t: Dict; onReset: () => void }) {
  const [copied, setCopied] = useState(false);
  const [shot, setShot] = useState(false);
  const r = t.report;

  if (state.phase === "error") {
    return (
      <div className="panel flex items-start gap-4 border-bad/60 p-6" role="alert">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-bad" />
        <div>
          <p className="font-medium">{r.errors[(state.error ?? "scan_failed") as keyof typeof r.errors]}</p>
          <button onClick={onReset} className="label mt-3 text-harpoon hover:text-harpoon-2">{r.newScan} →</button>
        </div>
      </div>
    );
  }

  const res = state.result;
  const done = state.phase === "done";
  const verdict = res?.verdict ?? "safe";
  const V = VERDICT[verdict];
  const byLayer = new Map(state.layers.map((l) => [l.layer, l]));
  const get = <T,>(l: Layer) => byLayer.get(l) as LayerResult<T> | undefined;

  const lex = get<LexicalData>("lexical")?.data;
  const brand = get<BrandData>("brand")?.data;
  const rep = get<ReputationData>("reputation")?.data;
  const net = get<NetworkData>("network")?.data;
  const page = get<PageData>("page")?.data;
  const intel = get<IntelData>("intel")?.data;
  const aiL = get<AiVerdict>("ai");
  const rendered = get<RenderData>("render")?.data;
  const visual = get<VisualData>("visual")?.data;
  const signals = (res?.topSignals ?? []).slice(0, 6);
  const isMsg = state.mode === "message";
  const visibleLayers = isMsg
    ? MESSAGE_LAYERS.filter((l) => (l !== "sender" && l !== "links") || byLayer.has(l) || !done)
    : LAYER_ORDER.filter((l) => !OPTIONAL_LAYERS.includes(l) || byLayer.has(l) || (l === "render" && !done));
  const lead = isMsg ? r.messageLead : r.verdictLead;
  const progressDone = visibleLayers.filter((l) => byLayer.has(l)).length;
  // Explain empty registration fields instead of showing a bare dash.
  const tld = state.target?.registrable.split(".").pop() ?? "";
  const reasonFor = (note: string | undefined) =>
    note === "no_dates" ? fill(r.notPublished, { tld })
    : note === "skipped_popular" ? r.skippedPopular
    : note === "failed" ? r.unavailable
    : note === "not_applicable" ? r.notApplicable
    : null;
  const rdapReason = reasonFor(rep?.rdapNote);
  const ctReason = reasonFor(rep?.ctNote);
  const actions = isMsg ? r.messageActions : r.actions;
  const sender = get<{ from: { name: string; address: string } | null; replyTo: { address: string } | null; auth: { spf: string | null; dkim: string | null; dmarc: string | null } }>("sender")?.data;

  return (
    <article className="win animate-rise" aria-live="polite" aria-busy={!done}>
      <div className="win-bar" aria-hidden>
        <span className="win-box left-2" />
        <span className="win-title">{t.os.windows.report}</span>
        <span className="win-box right-2">
          <span className="absolute inset-[2px] border border-chrome" />
        </span>
      </div>
      <div className="p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
        <div className="flex gap-2">
          {done && !isMsg && (
            <button
              className="tag focus-ring hover:border-fg hover:text-fg"
              onClick={() =>
                navigator.clipboard.writeText(window.location.href).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                })
              }
            >
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />} {copied ? r.copied : r.copy}
            </button>
          )}
          <button className="tag focus-ring hover:border-fg hover:text-fg" onClick={onReset}>
            <RotateCcw className="size-3" /> {r.newScan}
          </button>
        </div>
      </div>

      {/* Verdict */}
      <div className={clsx("reticle relative border", res ? V.border : "border-line", res ? V.tint : "bg-panel")}>
        {!done && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="h-1/2 w-full animate-scan bg-gradient-to-b from-transparent via-white/[0.04] to-transparent" />
          </div>
        )}
        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              {res ? <V.icon className={clsx("size-10", V.text)} strokeWidth={1.8} /> : <Loader2 className="size-10 animate-spin text-muted" />}
              <h2 className={clsx("text-[clamp(2rem,5vw,3rem)] leading-none font-bold tracking-tight", res && V.text)}>
                {res ? r.verdicts[verdict] : "…"}
              </h2>
            </div>
            {res && <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-fg">{lead[verdict]}</p>}

            <div className="mt-6">
              <div className="mb-2 flex items-baseline justify-between font-mono text-xs text-muted">
                <span>{r.score}</span>
                <span className={clsx("font-vt text-4xl", res && V.text)}>{res?.score ?? "--"}<span className="text-sm text-dim">/100</span></span>
              </div>
              <Meter score={res?.score ?? 0} colour={res ? V.bg : "bg-line-strong"} />
              <p className="mt-2 font-mono text-[11px] text-dim">
                {!done ? <>{fill(r.progress, { done: progressDone, total: visibleLayers.length })} <span className="animate-blink">_</span></> : `${res ? r.confidence[res.confidence] : ""}, ${r.finishedIn} ${((state.report?.durationMs ?? 0) / 1000).toFixed(1)} s`}
              </p>
            </div>
          </div>

          {res && (
            <div className="border-t border-line pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
              <p className="label mb-4 text-fg">{r.actionsTitle}</p>
              <ul className="space-y-3">
                {actions[verdict].map((a, i) => (
                  <li key={a} className="flex gap-3 text-base">
                    <span className={clsx("font-mono text-sm", V.text)}>{String(i + 1).padStart(2, "0")}</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {isMsg && state.message && (
          <div className="relative space-y-1 border-t border-line px-6 py-3 font-mono text-[12px] text-muted sm:px-8">
            <span className="flex items-center gap-2 text-dim">
              <Mail className="size-3.5" /> {r.checkedMessage}
            </span>
            {state.message.from && (
              <span className="block">
                <span className="text-dim">{r.sender}: </span>
                {state.message.from.name ? `${state.message.from.name} <${state.message.from.address}>` : state.message.from.address}
              </span>
            )}
            {state.message.subject && (
              <span className="block">
                <span className="text-dim">{r.subject}: </span>
                {state.message.subject}
              </span>
            )}
            <span className="line-clamp-2 block text-dim">{state.message.excerpt}</span>
          </div>
        )}
        {state.target && (
          <div className="relative border-t border-line px-6 py-3 font-mono text-[12px] text-muted sm:px-8">
            {state.target.wrapper && (
              <span className="mb-1 block text-ok">{fill(r.unwrapped, { wrapper: state.target.wrapper })}</span>
            )}
            <span className="text-dim">{r.target}: </span>
            <span className="break-all">{state.target.href}</span>
            {state.target.unicodeHost !== state.target.hostname && (
              <span className="block text-warn">
                {r.shown}: {state.target.unicodeHost}
              </span>
            )}
            {page?.finalUrl && page.finalUrl !== state.target.href && (
              <span className="block">
                <span className="text-dim">{r.finalUrl}: </span>
                <span className="break-all">{page.finalUrl}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Why + log */}
      <div className="mt-px border border-t-0 border-line bg-line">
        <section className="bg-void p-6">
          <h3 className="label mb-5 text-fg">{r.why}</h3>
          {signals.length === 0 ? (
            <p className="text-muted">{done ? r.noEvidence : "…"}</p>
          ) : (
            <ul className="space-y-3.5">
              {signals.map((s, i) => {
                const risk = s.weight > 0;
                return (
                  <li key={`${s.layer}-${s.id}-${i}`} className="flex gap-3">
                    <span
                      className={clsx("mt-0.5 grid size-5 shrink-0 place-items-center border", risk ? "border-bad/60 text-bad" : "border-ok/60 text-ok")}
                      title={risk ? r.raises : r.lowers}
                    >
                      {risk ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                    </span>
                    <span className="text-base leading-snug">{signalText(t, s)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

      </div>

      {isMsg && (done || state.links.length > 0) && (
        <section className="mt-px border border-t-0 border-line bg-void p-6">
          <h3 className="label mb-4 text-fg">{r.linksTitle}</h3>
          {state.links.length === 0 ? (
            <p className="text-sm text-dim">{done ? r.noLinks : "…"}</p>
          ) : (
            <ul className="space-y-2">
              {state.links.map((l) => (
                <li key={l.url} className="space-y-1.5 border border-line px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className={clsx("font-mono text-xs font-bold uppercase", VERDICT[l.verdict].text)}>{r.verdicts[l.verdict]}</span>
                    <span className="font-mono text-xs text-dim">
                      {r.linkScore} {l.score}/100
                    </span>
                  </div>
                  <p className="font-mono text-[13px] break-all text-muted">{l.url}</p>
                  {l.top[0] && <p className="text-sm text-muted">{signalText(t, l.top[0])}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Nerd details */}
      <details className="group mt-6 border border-line">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 hover:bg-panel">
          <span>
            <span className="label text-fg">{r.nerd}</span>
            <span className="mt-1 block text-sm text-dim">{r.nerdHint}</span>
          </span>
          <ChevronDown className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180" />
        </summary>

        <div className="grid gap-px border-t border-line bg-line md:grid-cols-2 lg:grid-cols-3">
          <Box title={r.log} icon={<Radar className="size-3.5" />}>
          <ul className="space-y-1.5 font-mono text-[12px]">
            {visibleLayers.map((l) => {
              const lr = byLayer.get(l);
              const status = lr?.status ?? (done ? "skipped" : "pending");
              return (
                <li key={l} className="flex items-center justify-between gap-3" title={lr?.note}>
                  <span className="flex items-center gap-2">
                    <span
                      className={clsx(
                        "w-11",
                        status === "ok" && "text-ok",
                        status === "pending" && "text-harpoon",
                        (status === "skipped" || status === "error") && "text-dim",
                      )}
                    >
                      [{r.layerStatus[status]}]
                    </span>
                    <span className={status === "ok" ? "text-fg" : "text-dim"}>{t.layerNames[l]}</span>
                  </span>
                  <span className="text-dim">{status === "pending" ? <Loader2 className="size-3 animate-spin" /> : lr && status === "ok" ? `${lr.ms}ms` : ""}</span>
                </li>
              );
            })}
          </ul>
          </Box>
          {isMsg && (
            <Box title={r.sender} icon={<Mail className="size-3.5" />} className="lg:col-span-2">
              <dl>
                <Row k={r.sender} v={sender?.from?.address ?? state.message?.from?.address ?? null} />
                <Row k={r.replyTo} v={sender?.replyTo?.address ?? null} />
                <Row k="SPF" v={sender?.auth.spf ?? null} />
                <Row k="DKIM" v={sender?.auth.dkim ?? null} />
                <Row k="DMARC" v={sender?.auth.dmarc ?? null} />
              </dl>
            </Box>
          )}
          {!isMsg && (<>
          <Box title={r.domain} icon={<Globe className="size-3.5" />}>
            <dl>
              <Row k={r.domain} v={state.target?.registrable} />
              <Row k={r.popularity} v={rep ? (rep.trancoRank ? `#${rep.trancoRank.toLocaleString()}` : r.notRanked) : null} />
              <Row k={r.registered} v={fmtDate(rep?.registeredAt) ?? rdapReason} />
              <Row k={r.age} v={rep?.ageDays != null ? `${rep.ageDays.toLocaleString()} ${r.days}` : rdapReason} />
              <Row k={r.registrar} v={rep?.registrar ?? (rep?.rdapNote === "ok" ? fill(r.notPublished, { tld }) : rdapReason)} />
              <Row k={r.firstCert} v={fmtDate(rep?.firstCertAt) ?? ctReason} />
            </dl>
          </Box>

          <Box title={r.tls} icon={<Lock className="size-3.5" />}>
            <dl>
              <Row k={r.issuer} v={net?.tls?.issuer} />
              <Row k="subject" v={net?.tls?.subject} />
              <Row k={r.validTo} v={fmtDate(net?.tls?.validTo)} />
              <Row k="protocol" v={net?.tls?.protocol} />
              <Row k={r.hosting} v={net?.asn ? `${net.asn.org ?? "?"} ${net.asn.asn ?? ""} ${net.asn.countryCode ?? ""}` : null} />
              <Row k={r.mail} v={net ? ["MX", "SPF", "DMARC"].filter((_, i) => [net.mx, net.spf, net.dmarc][i]).join(", ") || "-" : null} />
            </dl>
          </Box>

          <Box title={r.model} icon={<Bot className="size-3.5" />}>
            {lex?.modelProbability != null ? (
              <>
                <p className="font-mono text-3xl font-bold">{(lex.modelProbability * 100).toFixed(1)}%</p>
                <p className="text-xs text-dim">p(phishing | domain name)</p>
                <dl className="mt-3">
                  {(["sld_entropy", "sld_ngram_llr", "tld_risk", "sld_len", "is_free_hosting"] as const).map((k) => (
                    <Row key={k} k={k} v={lex.features?.[k] != null ? Number(lex.features[k]).toFixed(k.startsWith("is_") || k === "sld_len" ? 0 : 3) : null} />
                  ))}
                </dl>
              </>
            ) : (
              <p className="text-sm text-dim">-</p>
            )}
          </Box>

          <Box title={r.forms} icon={<KeyRound className="size-3.5" />} className="lg:col-span-2">
            <dl className="mb-3"><Row k={r.pageTitle} v={page?.title || null} /></dl>
            {page?.forms.length ? (
              <ul className="space-y-1.5 font-mono text-[12px]">
                {page.forms.slice(0, 4).map((f, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2 border border-line px-3 py-2">
                    <span className="text-dim uppercase">{f.method}</span>
                    {f.hasPassword && <span className="border border-bad/60 px-1.5 text-bad">{r.password}</span>}
                    {f.hasCard && <span className="border border-bad/60 px-1.5 text-bad">{r.card}</span>}
                    <span className="text-dim">{r.sendsTo}</span>
                    <span className={f.external ? "text-bad" : "text-muted"}>{f.actionDomain ?? f.action ?? "-"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-dim">{page ? r.noForms : "…"}</p>
            )}
            {page?.techniques.length ? (
              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className="text-xs text-dim">{r.techniques}:</span>
                {page.techniques.map((x) => <span key={x} className="tag border-warn/50 text-warn">{x}</span>)}
              </div>
            ) : null}
            {page?.hops && page.hops.length > 1 && (
              <div className="mt-4">
                <p className="mb-1.5 text-xs text-dim">{r.redirects}</p>
                <ol className="space-y-1 font-mono text-[12px]">
                  {page.hops.map((h, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="w-8 shrink-0 text-harpoon">{h.status}</span>
                      <span className="break-all text-muted">{h.url}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </Box>

          <Box title={r.sources} icon={<Radar className="size-3.5" />}>
            <ul className="space-y-1.5 font-mono text-[12px]">
              {(intel?.sources ?? []).map((s) => (
                <li key={s.name} className="flex items-center justify-between gap-2">
                  <span className="text-muted">{s.name}</span>
                  <span className={clsx(s.status === "hit" ? "text-bad" : s.status === "clean" ? "text-ok" : "text-dim")}>
                    [{s.status.toUpperCase()}]
                  </span>
                </li>
              ))}
              {!intel && <li className="text-dim">…</li>}
            </ul>
            {brand?.claimedBrands.length ? <p className="mt-4 text-xs text-dim">brands: <span className="text-warn">{brand.claimedBrands.join(", ")}</span></p> : null}
          </Box>

          </>)}

          <Box title={r.ai} icon={<Sparkles className="size-3.5" />} className={isMsg ? "" : "lg:col-span-2"}>
            {aiL?.status === "ok" && aiL.data ? (
              <>
                <p className="font-mono text-sm text-fg">
                  verdict={aiL.data.verdict} risk={Math.round(aiL.data.risk * 100)}%
                  {aiL.data.impersonated_brand ? ` brand=${aiL.data.impersonated_brand}` : ""}
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">{aiL.data.reasons.map((x, i) => <li key={i}>{x}</li>)}</ul>
                {visual?.brand && visual.outcome !== "no_brand" && (
                  <p className={clsx("mt-3 text-sm", visual.outcome === "mismatch" ? "text-bad" : visual.outcome === "official" ? "text-ok" : "text-muted")}>
                    {fill(visual.outcome === "mismatch" ? r.visualMismatch : visual.outcome === "official" ? r.visualOfficial : r.visualUnverified, {
                      brand: visual.brand,
                      domain: visual.domain,
                    })}
                  </p>
                )}
              </>
            ) : aiL?.status === "error" ? (
              <p className="font-mono text-sm text-dim">{aiL.note}</p>
            ) : done ? (
              <p className="text-sm text-dim">{r.aiOff}</p>
            ) : (
              <Loader2 className="size-4 animate-spin text-muted" />
            )}
          </Box>

          {!isMsg && done && rendered?.screenshot ? (
            <Box title="screenshot" icon={<Camera className="size-3.5" />}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={rendered.screenshot} alt="Screenshot" className="w-full border border-line" />
              <p className="mt-3 text-xs text-dim">{r.screenshotOwn}</p>
            </Box>
          ) : !isMsg && done && page?.fetched && (
            <Box title="screenshot" icon={<Camera className="size-3.5" />}>
              {shot ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://api.microlink.io/?url=${encodeURIComponent(page.finalUrl)}&screenshot=true&meta=false&embed=screenshot.url`}
                  alt="Screenshot"
                  className="w-full border border-line"
                  loading="lazy"
                />
              ) : (
                <button className="btn w-full" onClick={() => setShot(true)}>
                  <Camera className="size-4" /> {r.screenshot}
                </button>
              )}
              <p className="mt-3 text-xs text-dim">{r.screenshotNote}</p>
            </Box>
          )}
        </div>
      </details>
      </div>
    </article>
  );
}
