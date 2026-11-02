import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { SiteFooter, SiteNav } from "@/components/Site";
import { Window } from "@/components/os/Window";
import { fill, getDict, isLocale } from "@/i18n";
import { unstable_cache } from "next/cache";
import { getNews } from "@/lib/news/news";
import { NEWS_SOURCES } from "@/lib/news/sources";
import { defang, readTrends, trendsEnabled } from "@/lib/trends/store";

// New items are summarised once and cached; the page itself refreshes every 15 minutes.
export const revalidate = 900;

const cachedTrends = unstable_cache(() => readTrends(), ["trends-v1"], { revalidate: 600 });

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
  const [items, trends] = await Promise.all([getNews(), trendsEnabled() ? cachedTrends() : Promise.resolve(null)]);
  const tz = { timeZone: "Europe/Berlin" } as const;
  const day = new Intl.DateTimeFormat(locale, { ...tz, day: "numeric", month: "short", year: "numeric" });
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
              <p className="mt-1 text-sm text-muted">{fill(n.trendLead, { n: trends.minPeople, days: trends.days })}</p>
              {trends.domains.length === 0 && trends.brands.length === 0 ? (
                <p className="mt-4 text-sm text-dim">{fill(n.trendEmpty, { n: trends.minPeople })}</p>
              ) : (
                <>
                  <div className="mt-4 grid gap-6 sm:grid-cols-2">
                    {([
                      [n.trendDomains, trends.domains, true],
                      [n.trendBrands, trends.brands, false],
                    ] as const).map(([title, list, isDomain]) =>
                      list.length ? (
                        <div key={title}>
                          <h3 className="label">{title}</h3>
                          <ol className="mt-2 space-y-1.5 text-sm">
                            {list.map((e) => (
                              <li key={e.name} className="flex items-baseline justify-between gap-3">
                                <span className={isDomain ? "font-mono break-all text-bad" : "font-bold"}>
                                  {isDomain ? defang(e.name) : e.name}
                                  {isDomain && e.brand && <span className="ml-2 font-sans text-xs text-dim">{e.brand}</span>}
                                </span>
                                <span className="shrink-0 font-mono text-xs text-dim">{fill(n.trendPeople, { n: e.people })}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      ) : null,
                    )}
                  </div>
                  {trends.domains.length > 0 && <p className="mt-4 text-xs text-dim">{n.trendNote}</p>}
                </>
              )}
            </section>
          )}

          {items.length === 0 ? (
            <p className="panel mt-10 p-5 text-muted">{n.empty}</p>
          ) : (
            <ol className="mt-10 divide-y divide-line border-y border-line">
              {items.map((item) => {
                const s = item.summary;
                const foreign = item.sourceLang !== locale;
                return (
                  <li key={item.id} className="py-6">
                    <p className="flex flex-wrap items-center gap-2 text-xs text-dim">
                      {s && <span className="tag text-harpoon">{n.topics[s.topic]}</span>}
                      <time dateTime={item.published}>{day.format(new Date(item.published))}</time>
                      <span>{item.sourceName}</span>
                    </p>
                    <h2 className="mt-2 text-lg font-bold leading-snug">{s ? (locale === "de" ? s.headline_de : s.headline_en) : item.title}</h2>
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
          )}

          {items.some((i) => i.summary) && <p className="mt-6 text-xs text-dim">{n.aiNote}</p>}

          <div className="panel mt-10 flex flex-wrap items-center justify-between gap-4 p-5">
            <p className="font-bold">{n.ctaTitle}</p>
            <Link href={`/${locale}#scanner`} className="btn btn-primary">
              {n.cta} <ArrowRight className="size-4" />
            </Link>
          </div>

          <section className="mt-12">
            <h2 className="text-sm font-bold">{n.sourcesTitle}</h2>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {NEWS_SOURCES.map((s) => (
                <li key={s.id}>
                  <a className="text-muted underline decoration-harpoon/60 underline-offset-4 hover:text-fg" href={s.site} target="_blank" rel="noopener noreferrer">
                    {s.name}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </Window>
      </main>
      <SiteFooter t={t} locale={locale} />
    </>
  );
}
