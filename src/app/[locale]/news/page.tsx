import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { SiteFooter, SiteNav } from "@/components/Site";
import { Window } from "@/components/os/Window";
import { fill, getDict, isLocale } from "@/i18n";
import { unstable_cache } from "next/cache";
import { getNews } from "@/lib/news/news";
import { externalCounts } from "@/lib/trends/external";
import { defang, readTrends, reportTotal, type TrendEntry } from "@/lib/trends/store";

// New items are summarised once and cached; the page itself refreshes every 15 minutes.
export const revalidate = 900;

const TOP = 5;

const cachedTrends = unstable_cache(async () => readTrends({ external: await externalCounts() }), ["trends-v2"], { revalidate: 600 });

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const n = getDict(locale).news;
  return {
    title: n.title,
    description: n.description,
    alternates: { canonical: `/${locale}/news`, languages: { de: "/de/news", en: "/en/news", "x-default": "/en/news" } },
  };
}

export default async function News({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDict(locale);
  const n = t.news;
  const [items, trends] = await Promise.all([getNews(), cachedTrends().catch(() => null)]);
  const tz = { timeZone: "Europe/Berlin" } as const;
  const day = new Intl.DateTimeFormat(locale, { ...tz, day: "numeric", month: "short", year: "numeric" });
  const evidence = (e: TrendEntry) => [
    ...(e.people > 0 ? [e.people === 1 ? n.trendPerson : fill(n.trendPeople, { n: e.people })] : []),
    ...(reportTotal(e) > 0 ? [reportTotal(e) === 1 ? n.trendReport : fill(n.trendReports, { n: reportTotal(e) })] : []),
  ];
  // Domains are text, never links, so nobody opens them by accident.
  const domainRow = (e: TrendEntry) => (
    <li key={e.name} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2">
      <span className="font-mono break-all text-bad">
        {defang(e.name)}
        {e.brand && <span className="ml-2 font-sans text-xs text-dim">{e.brand}</span>}
      </span>
      <span className="flex flex-wrap gap-x-3 font-mono text-xs text-dim">
        {evidence(e).map((x) => (
          <span key={x}>{x}</span>
        ))}
      </span>
    </li>
  );
  const stamp = new Intl.DateTimeFormat(locale, { ...tz, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date());

  return (
    <>
      <SiteNav t={t} locale={locale} path="/news" />
      <main className="mx-auto max-w-4xl px-4 pt-10">
        <Window as="article" title={t.os.windows.news}>
          <p className="label">{fill(n.updated, { time: stamp })}</p>
          <h1 className="mt-3 text-[clamp(2rem,5vw,3.2rem)] leading-[1.08] font-bold tracking-tight">{n.title}</h1>
          <p className="mt-6 text-lg text-muted">{n.lead}</p>

          {trends && (
            <section className="panel mt-10 p-5" aria-labelledby="trends">
              <h2 id="trends" className="text-lg font-bold">{n.trendTitle}</h2>
              <p className="mt-1 text-sm text-muted">{n.trendShort}</p>
              {trends.domains.length === 0 ? (
                <p className="mt-4 text-sm text-dim">{fill(n.trendEmpty, { n: trends.minPeople })}</p>
              ) : (
                <ol className="mt-4 divide-y divide-line text-sm">{trends.domains.slice(0, TOP).map(domainRow)}</ol>
              )}
              <details className="group mt-3 text-sm">
                <summary className="cursor-pointer text-muted underline decoration-harpoon/60 underline-offset-4 hover:text-fg">
                  {trends.domains.length > TOP ? fill(n.trendMore, { n: trends.domains.length }) : n.trendHow}
                </summary>
                {trends.domains.length > TOP && <ol className="divide-y divide-line">{trends.domains.slice(TOP).map(domainRow)}</ol>}
                {trends.brands.length > 0 && (
                  <p className="mt-4">
                    <span className="label mr-2">{n.trendBrands}</span>
                    {trends.brands.map((e, i) => (
                      <span key={e.name}>
                        {i > 0 && ", "}
                        <b>{e.name}</b> <span className="text-xs text-dim">({fill(n.trendPeople, { n: e.people })})</span>
                      </span>
                    ))}
                  </p>
                )}
                <p className="mt-4 text-xs text-dim">{fill(n.trendLead, { n: trends.minPeople, days: trends.days })}</p>
              </details>
            </section>
          )}

          {items.length === 0 ? (
            <p className="panel mt-10 p-5 text-muted">{n.empty}</p>
          ) : (
            ([
              [n.groupWarnings, n.groupWarningsLead, items.filter((i) => i.warning)],
              [n.groupNews, n.groupNewsLead, items.filter((i) => !i.warning)],
            ] as const).map(([title, lead, list]) =>
              list.length ? (
                <section key={title} className="mt-12">
                  <h2 className="text-2xl font-bold">{title}</h2>
                  <p className="mt-1 text-sm text-muted">{lead}</p>
                  <ol className="mt-4 divide-y divide-line border-y border-line">
                    {list.map((item) => {
                      const s = item.summary;
                      const foreign = item.sourceLang !== locale;
                      return (
                        <li key={item.id} className="py-6">
                          <p className="flex flex-wrap items-center gap-2 text-xs text-dim">
                            {s && <span className="tag text-harpoon">{n.topics[s.topic]}</span>}
                            <time dateTime={item.published}>{day.format(new Date(item.published))}</time>
                            <span>{item.sourceName}</span>
                          </p>
                          <h3 className="mt-2 text-lg font-bold leading-snug">{s ? (locale === "de" ? s.headline_de : s.headline_en) : item.title}</h3>
                          {s && <p className="mt-2 text-muted">{locale === "de" ? s.summary_de : s.summary_en}</p>}
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex items-center gap-1 text-sm text-fg underline decoration-harpoon/60 underline-offset-4 hover:text-harpoon"
                          >
                            {fill(n.readMore, { source: item.sourceName })}
                            {foreign && <span className="text-dim">({locale === "de" ? n.sourceEn : n.sourceDe})</span>}
                            <ArrowUpRight className="size-3.5" aria-hidden />
                          </a>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ) : null,
            )
          )}

          {items.some((i) => i.summary) && <p className="mt-6 text-xs text-dim">{n.aiNote}</p>}

          <div className="panel mt-10 flex flex-wrap items-center justify-between gap-4 p-5">
            <p className="font-bold">{n.ctaTitle}</p>
            <Link href={`/${locale}#scanner`} className="btn btn-primary">
              {n.cta} <ArrowRight className="size-4" />
            </Link>
          </div>
        </Window>
      </main>
      <SiteFooter t={t} locale={locale} />
    </>
  );
}
