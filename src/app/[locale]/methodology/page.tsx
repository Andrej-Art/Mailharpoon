import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  BrainCircuit,
  Eye,
  FlaskConical,
  Fingerprint,
  Globe,
  KeyRound,
  Layers,
  Link2,
  Radar,
  RefreshCw,
  Scale,
  Server,
  ShieldQuestion,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import card from "../../../../ml/model-card.json";
import kb from "@/lib/data/brand-kb.json";
import { evalHistory, latestEval } from "@/lib/eval";
import { PRIOR, fuse } from "@/lib/analyzers/fusion";
import { signal } from "@/lib/analyzers/types";
import { wilson } from "@/lib/eval-stats";
import { SiteFooter, SiteNav } from "@/components/Site";
import { Window } from "@/components/os/Window";
import { fill, getDict, isLocale } from "@/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const m = getDict(locale).methodology;
  return {
    title: m.title,
    description: m.description,
    alternates: { canonical: `/${locale}/methodology`, languages: { de: "/de/methodology", en: "/en/methodology", "x-default": "/en/methodology" } },
  };
}

const SOURCES = [
  ["UCI 2024", "Prasad & Chandra: PhiUSIIL, a diverse security profile empowered phishing URL detection framework", "https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset"],
  ["USENIX Security 2021", "Lin et al.: Phishpedia, reference-based visual phishing detection", "https://www.usenix.org/conference/usenixsecurity21/presentation/lin"],
  ["USENIX Security 2022", "Liu et al.: PhishIntention, intention-based phishing detection", "https://www.usenix.org/conference/usenixsecurity22/presentation/liu-ruofan"],
  ["USENIX Security 2024", "Li et al.: KnowPhish, LLM and brand knowledge for phishing detection", "https://www.usenix.org/conference/usenixsecurity24/presentation/li-yuexin"],
  ["NDSS 2019", "Le Pochat et al.: Tranco, a research-oriented top sites ranking", "https://tranco-list.eu/"],
  ["arXiv 2026", "Hasan & BusiReddyGari: Benchmarking LLMs for zero- and few-shot phishing URL detection", "https://arxiv.org/abs/2602.02641"],
  ["Unicode UTS #39", "Unicode security mechanisms: confusable characters", "https://www.unicode.org/reports/tr39/"],
] as const;

// The fusion worked example: a 12-day-old domain asking for a password over valid TLS.
const EXAMPLE = [
  ["young", "reputation", 1.9],
  ["login", "page", 0.8],
  ["tls", "network", -0.2],
] as const;
const example = fuse(EXAMPLE.map(([id, layer, w]) => ({ layer, status: "ok", ms: 0, signals: [signal(layer, id, w)] })));
const signed = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x).toFixed(1)}`;

const LAYERS = [
  ["intel", Radar],
  ["reputation", Globe],
  ["lexical", Link2],
  ["brand", Fingerprint],
  ["page", KeyRound],
  ["network", Server],
  ["visual", Eye],
  ["ai", Sparkles],
] as const;

const LOOP_ICONS = [FlaskConical, Scale, BrainCircuit, ShieldQuestion];

/** Small caps label in a bracket frame, the section marker of this page. */
function Kicker({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  const corner = "absolute size-2 border-line-strong";
  return (
    <p className="relative inline-flex items-center gap-2 px-3 py-1.5 font-pixel text-[12px] tracking-[0.08em] text-muted uppercase">
      <span className={`${corner} top-0 left-0 border-t border-l`} aria-hidden />
      <span className={`${corner} top-0 right-0 border-t border-r`} aria-hidden />
      <span className={`${corner} bottom-0 left-0 border-b border-l`} aria-hidden />
      <span className={`${corner} right-0 bottom-0 border-r border-b`} aria-hidden />
      <Icon className="size-3.5 text-harpoon" aria-hidden />
      {children}
    </p>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-4 text-[clamp(1.6rem,3.4vw,2.4rem)] leading-[1.15] font-bold tracking-tight">{children}</h2>;
}

// A dot raster in the accent colour, the halftone look of the reference design in the site's own palette.
const HALFTONE = "bg-[radial-gradient(color-mix(in_srgb,var(--color-harpoon)_45%,transparent)_1px,transparent_1.4px)] [background-size:7px_7px]";

export default async function Methodology({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDict(locale);
  const m = t.methodology;
  const num = new Intl.NumberFormat(locale);
  const pct = (x: number) => `${num.format(Math.round(x * 1000) / 10)} %`;
  const date = (d: string, month: "long" | "short" = "long") =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month, year: month === "long" ? "numeric" : undefined, timeZone: "UTC" }).format(new Date(d));

  const at = (threshold: number) => latestEval.metrics.find((r) => r.threshold === threshold)!;
  // The 95 % Wilson range of a rate measured on n links, so a small sample is never overstated.
  const range = (rate: number, n: number) => {
    const w = wilson(Math.round(rate * n), n);
    return fill(m.interval, { low: pct(w.low), high: pct(w.high) });
  };
  const { phishing, legitimate } = latestEval.sample;
  const candidate = latestEval.candidate;
  const kbCount = num.format(Math.floor(kb.orgs.length / 1000) * 1000);
  const train = num.format(card.train_size);
  // The first live run from the model card, then every stored weekly run.
  const history = [{ date: card.live_eval.date, metrics: card.live_eval.rows }, ...evalHistory()];

  const log = [
    [fill(m.log.caught, { caught: Math.round(at(70).recall * phishing), phishing }), fill(m.log.week, { date: date(latestEval.date, "short") })],
    [fill(m.log.falseAlarms, { n: legitimate - Math.round(at(70).fpr * legitimate), legitimate }), fill(m.log.week, { date: date(latestEval.date, "short") })],
    [fill(m.log.train, { n: train }), m.log.model],
    [fill(m.log.kb, { n: kbCount }), "Wikidata"],
    [m.log.layers, m.log.perLink],
  ];

  return (
    <>
      <SiteNav t={t} locale={locale} path="/methodology" />
      <main className="mx-auto max-w-6xl space-y-10 px-4 pt-10 pb-4">
        {/* ---------- Intro ---------- */}
        <Window as="article" title={t.os.windows.methodology} bodyClassName="p-0">
          <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div className="p-5 sm:p-10">
              <Kicker icon={BookOpen}>{m.label}</Kicker>
              <h1 className="mt-5 text-[clamp(2.2rem,5.4vw,3.6rem)] leading-[1.05] font-bold tracking-tight">{m.title}</h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">{m.lead}</p>
            </div>
            <div className={`relative border-t border-line p-5 sm:p-8 lg:border-t-0 lg:border-l ${HALFTONE} bg-panel-2`}>
              <ol className="relative space-y-2.5">
                {log.map(([text, meta], i) => (
                  <li key={text} className="flex items-center gap-3 border border-line-strong bg-panel/95 px-4 py-3 shadow-[3px_3px_0_0_rgb(0_0_0/0.5)]">
                    <span className={i < 2 ? "size-2 shrink-0 bg-ok" : "size-2 shrink-0 bg-harpoon"} aria-hidden />
                    <span className="min-w-0 flex-1 font-mono text-[12px] tracking-wide text-fg uppercase">{text}</span>
                    <span className="shrink-0 font-mono text-[11px] text-dim">{meta}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Results row */}
          <div className="border-t border-line p-5 sm:p-10">
            <Kicker icon={FlaskConical}>{m.resultsLabel}</Kicker>
            <div className="grid gap-4 lg:grid-cols-2 lg:items-end">
              <H2>{m.resultsTitle}</H2>
              <p className="max-w-xl text-muted lg:justify-self-end">{m.resultsLead}</p>
            </div>
            <dl className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
              {[
                [at(70).recall, phishing, m.results.dangerous],
                [at(35).recall, phishing, m.results.flagged],
                [at(70).fpr, legitimate, m.results.falseAlarms],
                [card.openphish_fresh_recall, card.openphish_fresh_n, m.results.model],
              ].map(([rate, n, label]) => (
                <div key={label} className="flex min-h-40 flex-col justify-between bg-panel p-5">
                  <dd>
                    <span className="block font-mono text-[clamp(2rem,4vw,2.8rem)] leading-none font-bold text-fg">{pct(rate as number)}</span>
                    <span className="mt-2 block font-mono text-[11px] text-dim">{range(rate as number, n as number)}</span>
                  </dd>
                  <dt className="mt-6 text-sm text-muted">{label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </Window>

        {/* ---------- Layers: sticky heading, cards stacking on scroll (on phones each card slides over the last, leaving a sliver) ---------- */}
        <Window title={m.layersLabel}>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
            <div className="h-fit lg:sticky lg:top-20">
              <Kicker icon={Layers}>{m.layersLabel}</Kicker>
              <H2>{m.layersTitle}</H2>
              <p className="mt-4 text-muted">{m.layersLead}</p>
            </div>
            <ol className="space-y-6 lg:space-y-10">
              {LAYERS.map(([key, Icon], i) => {
                const layer = m.layers[key];
                return (
                  <li
                    key={key}
                    className="sticky top-[calc(3rem+var(--i)*0.75rem)] border border-line-strong bg-panel-2 max-lg:shadow-[0_-10px_24px_rgb(0_0_0/0.45)] lg:top-[calc(5rem+var(--i)*2.6rem)]"
                    style={{ "--i": i } as React.CSSProperties}
                  >
                    {/* Tab strip: every card shows all eight, with its own one lit, so the stack reads like a file folder. */}
                    <div className="grid h-[2.6rem] grid-cols-8 border-b border-line-strong bg-panel" aria-hidden>
                      {LAYERS.map(([k], j) => (
                        <span
                          key={k}
                          className={
                            j === i
                              ? "grid place-items-center bg-harpoon font-mono text-[12px] text-void"
                              : "grid place-items-center border-l border-line font-mono text-[12px] text-dim first:border-l-0"
                          }
                        >
                          0{j + 1}
                        </span>
                      ))}
                    </div>
                    <div className="grid gap-6 p-5 sm:p-7 md:grid-cols-[minmax(0,1fr)_15rem]">
                      <div>
                        <h3 className="flex items-center gap-3 text-xl font-bold">
                          <span className="font-vt text-2xl text-harpoon">0{i + 1}</span>
                          {layer.name}
                        </h3>
                        <p className="mt-3 leading-relaxed text-muted">{fill(layer.text, { kb: kbCount })}</p>
                        <p className="mt-5 flex flex-wrap gap-1.5">
                          {layer.tech.map((x) => (
                            <span key={x} className="tag">
                              {x}
                            </span>
                          ))}
                        </p>
                      </div>
                      <div className={`relative flex flex-col justify-end border border-line p-3 ${HALFTONE} md:min-h-44`}>
                        <span className="absolute top-3 left-3 hidden size-11 place-items-center md:grid border border-harpoon bg-panel text-harpoon shadow-[3px_3px_0_0_rgb(0_0_0/0.5)]">
                          <Icon className="size-5" aria-hidden />
                        </span>
                        <dl className="border border-line-strong bg-panel/95 p-3 font-mono text-[11px]">
                          <p className="mb-1.5 font-pixel text-[10px] text-dim uppercase">{m.example}</p>
                          {layer.readout.map(([k, v]) => (
                            <div key={k} className="flex justify-between gap-3 py-0.5">
                              <dt className="text-dim">{k}</dt>
                              <dd className="truncate text-right text-fg">{v}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </Window>

        {/* ---------- Fusion ---------- */}
        <Window title={m.fusionLabel}>
          <div className="grid gap-10 lg:grid-cols-2 [&>*]:min-w-0">
            <div>
              <Kicker icon={Scale}>{m.fusionLabel}</Kicker>
              <H2>{m.fusionTitle}</H2>
              <p className="mt-4 leading-relaxed text-muted">{m.fusion}</p>
            </div>
            <div className="space-y-5 self-end">
              {/* A worked example, scored by the live fusion code so the numbers can never drift from it. */}
              <div className="border border-line bg-void p-4 font-mono text-[13px] sm:p-5">
                <p className="mb-3 font-pixel text-[10px] text-dim uppercase">{m.fusionExample.title}</p>
                <dl>
                  {[[m.fusionExample.start, PRIOR] as const, ...EXAMPLE.map(([k, , w]) => [m.fusionExample[k], w] as const)].map(([label, w]) => (
                    <div key={label} className="flex justify-between gap-4 border-b border-line py-1.5">
                      <dt className="text-muted">{label}</dt>
                      <dd className={w > 0 ? "text-bad" : "text-ok"}>{signed(w)}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between gap-4 pt-2 text-fg">
                    <dt>{m.fusionExample.sum}</dt>
                    <dd>{signed(example.logit)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 pt-1 text-fg">
                    <dt>{m.fusionExample.result}</dt>
                    <dd className="font-bold text-bad">
                      {example.score} · {m.bands[example.verdict]}
                    </dd>
                  </div>
                </dl>
              </div>
              <div>
                <div className="relative grid h-3 grid-cols-[35fr_35fr_30fr] border border-line-strong">
                  <span className="bg-ok/70" />
                  <span className="border-x border-void bg-warn/80" />
                  <span className="bg-bad/80" />
                  <span className="absolute -top-1.5 -bottom-1.5 w-0.5 bg-fg" style={{ left: `${example.score}%` }} aria-hidden />
                </div>
                <div className="mt-2 grid grid-cols-[35fr_35fr_30fr] gap-1 font-mono text-[11px] text-muted">
                  <span className="flex flex-col sm:block">
                    <span className="text-fg">0</span> <span className="max-sm:hidden">·</span> {m.bands.safe}
                  </span>
                  <span className="flex flex-col sm:block">
                    <span className="text-fg">35</span> <span className="max-sm:hidden">·</span> {m.bands.suspicious}
                  </span>
                  <span className="flex flex-col sm:block">
                    <span className="text-fg">70</span> <span className="max-sm:hidden">·</span> {m.bands.dangerous}
                  </span>
                </div>
              </div>
              <details className="group border border-line">
                <summary className="cursor-pointer px-4 py-2.5 font-mono text-[12px] text-muted hover:text-fg">{m.fusionExample.formula}</summary>
                <pre className="overflow-x-auto border-t border-line bg-void p-4 font-mono text-[12px] leading-relaxed text-fg">
                  {`logit   = prior + Σ_layer clamp(Σ weights, −4, 4.5)
p       = 1 / (1 + e^(−logit))
          // list hit ⇒ p ≥ 0.98
verdict = dangerous  if p ≥ .70
          suspicious if p ≥ .35`}
                </pre>
              </details>
            </div>
          </div>
        </Window>

        {/* ---------- Model ---------- */}
        <Window title={m.modelLabel} bodyClassName="p-0">
          <div className="grid lg:grid-cols-2">
            <div className="p-5 sm:p-10">
              <Kicker icon={BrainCircuit}>{m.modelLabel}</Kicker>
              <H2>{m.modelTitle}</H2>
              {m.model.map((p) => (
                <p key={p} className="mt-4 leading-relaxed text-muted">
                  {p}
                </p>
              ))}
              <ul className="mt-6 space-y-2">
                {m.modelFacts.map((f) => (
                  <li key={f} className="flex items-stretch border border-line">
                    <span className="grid w-10 shrink-0 place-items-center border-r border-line text-harpoon">
                      <ArrowRight className="size-4" aria-hidden />
                    </span>
                    <span className="px-4 py-2.5 text-sm text-fg">{fill(f, { n: train, features: card.features.length })}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={`flex flex-col justify-center gap-5 border-t border-line p-5 sm:p-10 lg:border-t-0 lg:border-l ${HALFTONE} bg-panel-2`}>
              <div className="border border-line-strong bg-panel/95 p-5 shadow-[4px_4px_0_0_rgb(0_0_0/0.5)]">
                {[
                  [m.modelBars.fresh, card.openphish_fresh_recall, pct(card.openphish_fresh_recall)],
                  [m.modelBars.auc, card.test.roc_auc, card.test.roc_auc.toFixed(3)],
                ].map(([label, value, shown]) => (
                  <div key={label as string} className="mb-5 last:mb-0">
                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-muted">{label}</span>
                      <span className="font-mono text-fg">{shown}</span>
                    </div>
                    <div className="mt-2 h-2 bg-line">
                      <div className="h-full bg-harpoon" style={{ width: `${(value as number) * 100}%` }} />
                    </div>
                  </div>
                ))}
                <p className="mt-5 border-t border-line pt-4 font-mono text-[11px] text-dim">
                  {fill(m.modelLine, { trees: card.iterations, features: card.features.length, n: train })}
                </p>
              </div>
              <div className="border border-line-strong bg-panel/95 p-5">
                <p className="label">{m.featuresLabel}</p>
                <p className="mt-3 flex flex-wrap gap-1.5">
                  {card.features.map((f) => (
                    <code key={f} className="tag bg-panel">
                      {f}
                    </code>
                  ))}
                </p>
              </div>
            </div>
          </div>
        </Window>

        {/* ---------- Improvement loop ---------- */}
        <Window title={m.loopLabel}>
          <Kicker icon={RefreshCw}>{m.loopLabel}</Kicker>
          <div className="grid gap-4 lg:grid-cols-2 lg:items-end">
            <H2>{m.loopTitle}</H2>
            <p className="max-w-xl text-muted lg:justify-self-end">{m.loopLead}</p>
          </div>
          <ol className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {m.loop.map(([title, text], i) => {
              const Icon = LOOP_ICONS[i];
              return (
                <li key={title} className="bg-panel">
                  <p className="flex items-center gap-3 border-b border-line bg-panel-2 px-5 py-2.5 font-mono text-[12px] tracking-wide text-muted uppercase">
                    <span className="grid size-6 place-items-center border border-line-strong text-fg">{i + 1}</span>
                    {title}
                  </p>
                  <div className="p-5">
                    <Icon className="size-6 text-harpoon" strokeWidth={1.5} aria-hidden />
                    <p className="mt-4 text-[15px] leading-relaxed text-muted">{fill(text, { phishing, legitimate })}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div>
              <h3 className="text-xl font-bold">{m.historyTitle}</h3>
              <p className="mt-3 leading-relaxed text-muted">{fill(m.historyLead, { phishing, legitimate })}</p>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full border border-line text-left font-mono text-sm">
                  <caption className="mb-2 text-left font-mono text-[11px] text-dim">{date(latestEval.date)}</caption>
                  <thead className="bg-panel-2 text-[11px] text-muted uppercase">
                    <tr>
                      <th className="p-3 font-normal">{m.threshold}</th>
                      <th className="p-3 font-normal">{m.recall}</th>
                      <th className="p-3 font-normal">{m.fpr}</th>
                      {candidate && <th className="p-3 font-normal text-violet">{m.candidate}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {latestEval.metrics.map((r, i) => (
                      <tr key={r.threshold} className="border-t border-line">
                        <td className="p-3 text-harpoon">
                          {r.threshold} <span className="text-dim">{m.thresholdNames[r.threshold]}</span>
                        </td>
                        <td className="p-3">{pct(r.recall)}</td>
                        <td className="p-3">{pct(r.fpr)}</td>
                        {candidate && (
                          <td className="p-3 text-violet">
                            {pct(candidate[i].recall)} / {pct(candidate[i].fpr)}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {candidate && <p className="mt-3 text-sm leading-relaxed text-muted">{m.candidateNote}</p>}
            </div>
            <figure className={`flex flex-col border border-line p-5 ${HALFTONE} bg-panel-2`}>
              <div className="flex flex-1 flex-col border border-line-strong bg-panel/95 p-5">
                <figcaption className="flex flex-wrap gap-4 font-mono text-[11px] text-muted">
                  <span className="flex items-center gap-2">
                    <span className="size-2.5 bg-harpoon" aria-hidden /> {m.historyCaught}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="size-2.5 bg-amber" aria-hidden /> {m.historyFalse}
                  </span>
                </figcaption>
                <ol className="mt-4 flex min-h-56 flex-1 items-end gap-6 border-b border-line-strong">
                  {history.map((run) => {
                    const r = run.metrics.find((x) => x.threshold === 70)!;
                    return (
                      <li key={run.date} className="flex h-full flex-1 flex-col justify-end">
                        <div className="flex flex-1 items-end justify-center gap-1.5">
                          {[
                            [r.recall, "bg-harpoon", "text-fg"],
                            [r.fpr, "bg-amber", "text-muted"],
                          ].map(([v, bar, text]) => (
                            <div key={bar as string} className="flex h-full w-full max-w-10 flex-col justify-end">
                              <span className={`mb-1 text-center font-mono text-[11px] ${text}`}>{Math.round((v as number) * 100)}</span>
                              <span className={`block ${bar}`} style={{ height: `${Math.max((v as number) * 100, 1)}%` }} />
                            </div>
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ol>
                <ol className="mt-2 flex gap-6">
                  {history.map((run) => (
                    <li key={run.date} className="flex-1 text-center font-mono text-[11px] text-dim">
                      {date(run.date, "short")}
                    </li>
                  ))}
                </ol>
              </div>
            </figure>
          </div>

          <div className="mt-12 border-t border-line pt-10">
            <h3 className="text-xl font-bold">{m.changelogTitle}</h3>
            <p className="mt-2 text-muted">{m.changelogLead}</p>
            <ol className="mt-6 border-l border-line-strong">
              {m.changelog.map(([day, text]) => (
                <li key={text} className="relative pb-5 pl-6 last:pb-0">
                  <span className="absolute top-1.5 -left-[5px] size-2.5 bg-harpoon" aria-hidden />
                  <time dateTime={day} className="font-mono text-[12px] text-dim">
                    {date(day)}
                  </time>
                  <p className="mt-1 text-[15px] leading-relaxed text-muted">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </Window>

        {/* ---------- Limits ---------- */}
        <Window title={m.limitsLabel}>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
            <div>
              <Kicker icon={ShieldQuestion}>{m.limitsLabel}</Kicker>
              <H2>{m.limitsTitle}</H2>
              <p className="mt-4 text-muted">{m.limitsLead}</p>
            </div>
            <ul className="grid gap-px border border-line bg-line sm:grid-cols-2">
              {m.limits.map(([title, text]) => (
                <li key={title} className="bg-panel p-5">
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted">{fill(text, { kb: kbCount })}</p>
                </li>
              ))}
            </ul>
          </div>
        </Window>

        {/* ---------- Research ---------- */}
        <Window title={m.sourcesLabel}>
          <Kicker icon={BookOpen}>{m.sourcesLabel}</Kicker>
          <div className="grid gap-4 lg:grid-cols-2 lg:items-end">
            <H2>{m.sourcesTitle}</H2>
            <p className="max-w-xl text-muted lg:justify-self-end">{m.sourcesLead}</p>
          </div>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SOURCES.map(([venue, label, href]) => (
              <li key={href} className="sm:last:col-span-2 lg:last:col-span-3">
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex h-full flex-col justify-between gap-6 border border-line bg-panel-2/40 p-5 transition-[transform,box-shadow,border-color] hover:-translate-x-px hover:-translate-y-px hover:border-line-strong hover:shadow-[4px_4px_0_0_rgb(0_0_0/0.6)] focus-visible:outline-1 focus-visible:outline-harpoon"
                >
                  <span className="text-[15px] leading-snug text-fg group-hover:text-harpoon-2">{label}</span>
                  <span className="flex items-center justify-between font-mono text-[11px] text-dim uppercase">
                    {venue}
                    <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Window>
      </main>
      <SiteFooter t={t} locale={locale} />
    </>
  );
}
