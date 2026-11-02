import type { Metadata } from "next";
import { notFound } from "next/navigation";
import card from "../../../../ml/model-card.json";
import kb from "@/lib/data/brand-kb.json";
import { latestEval } from "@/lib/eval";
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
  ["Prasad & Chandra (2024): PhiUSIIL, a diverse security profile empowered phishing URL detection framework", "https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset"],
  ["Hasan & BusiReddyGari (2026): Benchmarking LLMs for zero- and few-shot phishing URL detection", "https://arxiv.org/abs/2602.02641"],
  ["Lin et al. (USENIX Security 2021): Phishpedia, reference-based visual phishing detection", "https://www.usenix.org/conference/usenixsecurity21/presentation/lin"],
  ["Liu et al. (USENIX Security 2022): PhishIntention, intention-based phishing detection", "https://www.usenix.org/conference/usenixsecurity22/presentation/liu-ruofan"],
  ["Li et al. (USENIX Security 2024): KnowPhish, LLM + brand knowledge for phishing detection", "https://www.usenix.org/conference/usenixsecurity24/presentation/li-yuexin"],
  ["Le Pochat et al. (NDSS 2019): Tranco, a research-oriented top sites ranking", "https://tranco-list.eu/"],
  ["Unicode Technical Standard #39: Security mechanisms (confusables)", "https://www.unicode.org/reports/tr39/"],
] as const;

export default async function Methodology({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDict(locale);
  const m = t.methodology;
  const pct = (x: number) => `${Math.round(x * 100)}%`;

  return (
    <>
      <SiteNav t={t} locale={locale} path="/methodology" />
      <main className="mx-auto max-w-4xl px-4 pt-10">
        <Window as="article" title={t.os.windows.methodology}>
        <h1 className="text-[clamp(2rem,5vw,3.2rem)] leading-[1.08] font-bold tracking-tight">{m.title}</h1>
        <p className="mt-6 text-lg text-muted">{m.lead}</p>

        <section className="mt-14">
          <h2 className="text-xl font-bold">{m.dataTitle}</h2>
          <ul className="mt-4 space-y-3 text-muted">
            {m.data.map((x) => <li key={x} className="flex gap-3"><span className="text-harpoon">›</span>{x}</li>)}
          </ul>
        </section>

        <section className="mt-14">
          <h2 className="text-xl font-bold">{m.modelTitle}</h2>
          <p className="mt-3 font-mono text-xs text-dim">{fill(m.modelLine, { trees: card.iterations, features: card.features.length, n: card.train_size.toLocaleString(locale) })}</p>
          <div className="mt-5 grid gap-px border border-line bg-line sm:grid-cols-4">
            {[
              ["ROC-AUC", card.test.roc_auc.toFixed(3)],
              ["PR-AUC", card.test.pr_auc.toFixed(3)],
              ["OpenPhish recall", pct(card.openphish_fresh_recall)],
              ["Brier", card.test.brier.toFixed(3)],
            ].map(([k, v]) => (
              <div key={k} className="bg-void p-5">
                <p className="font-mono text-2xl font-bold">{v}</p>
                <p className="mt-1 text-xs text-dim">{k}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 flex flex-wrap gap-1.5">
            {card.features.map((f) => <code key={f} className="tag">{f}</code>)}
          </p>
        </section>

        <section className="mt-14">
          <h2 className="text-xl font-bold">{m.fusionTitle}</h2>
          <p className="mt-3 text-muted">{m.fusion}</p>
          <pre className="panel mt-4 overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-fg">
{`logit   = prior + Σ_layer clamp(Σ weights, −4, 4.5)
p       = 1 / (1 + e^(−logit))      // scam-list hit ⇒ p ≥ 0.98
verdict = dangerous if p ≥ .70, suspicious if p ≥ .35, else safe`}
          </pre>
        </section>

        <section className="mt-14">
          <h2 className="text-xl font-bold">{m.evalTitle}</h2>
          <p className="mt-3 text-muted">{fill(m.evalLead, latestEval.sample)}</p>
          <p className="mt-3 font-mono text-xs text-dim">
            {fill(m.evalDate, { date: new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(latestEval.date)) })}
          </p>
          <div className="overflow-x-auto"><table className="mt-5 w-full border border-line text-left font-mono text-sm">
            <thead className="bg-panel text-xs text-muted uppercase">
              <tr><th className="p-3 font-normal">{m.threshold}</th><th className="p-3 font-normal">{m.recall}</th><th className="p-3 font-normal">{m.fpr}</th></tr>
            </thead>
            <tbody>
              {latestEval.metrics.map((r) => (
                <tr key={r.threshold} className="border-t border-line">
                  <td className="p-3 text-harpoon">
                    {r.threshold} <span className="text-dim">{m.thresholdNames[r.threshold]}</span>
                  </td>
                  <td className="p-3">{pct(r.recall)}</td>
                  <td className="p-3">{pct(r.fpr)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </section>

        <section className="mt-14">
          <h2 className="text-xl font-bold">{m.limitsTitle}</h2>
          <ul className="mt-4 space-y-3 text-muted">
            {m.limits.map((x) => <li key={x} className="flex gap-3"><span className="text-warn">!</span>{fill(x, { kb: new Intl.NumberFormat(locale).format(Math.floor(kb.orgs.length / 1000) * 1000) })}</li>)}
          </ul>
        </section>

        <section className="mt-14">
          <h2 className="text-xl font-bold">{m.sourcesTitle}</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {SOURCES.map(([label, href]) => (
              <li key={href}><a className="text-muted underline decoration-harpoon/60 underline-offset-4 hover:text-fg" href={href} target="_blank" rel="noreferrer">{label}</a></li>
            ))}
          </ul>
        </section>
        </Window>
      </main>
      <SiteFooter t={t} locale={locale} />
    </>
  );
}
