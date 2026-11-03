import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Rss } from "lucide-react";
import { NewsFeed, type NewsCard } from "@/components/NewsFeed";
import { ScrollList } from "@/components/ScrollList";
import { SiteFooter, SiteNav } from "@/components/Site";
import { Window } from "@/components/os/Window";
import { fill, getDict, isLocale } from "@/i18n";
import { getNews } from "@/lib/news/news";
import { NEWS_SOURCES } from "@/lib/news/sources";
import { abs, JsonLd, ogLocale, SITE_NAME } from "@/lib/seo";
import { cachedTrends, trendEvidence } from "@/lib/trends/cached";
import { defang, type TrendEntry } from "@/lib/trends/store";

// New items are summarised once and cached; feeds and the page refresh every 15 minutes.
export const revalidate = 900;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const n = getDict(locale).news;
  const url = `/${locale}/news`;
  return {
    title: n.metaTitle,
    description: n.description,
    alternates: {
      canonical: url,
      languages: { de: "/de/news", en: "/en/news", "x-default": "/en/news" },
      types: { "application/rss+xml": [{ url: `${url}/feed.xml`, title: n.feedTitle }] },
    },
    openGraph: { siteName: SITE_NAME, title: n.metaTitle, description: n.description, locale: ogLocale[locale], type: "website", url },
    twitter: { card: "summary_large_image", title: n.metaTitle, description: n.description },
  };
}

export default async function News({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDict(locale);
  const n = t.news;
  const [items, trends] = await Promise.all([getNews(), cachedTrends().catch(() => null)]);
  const tz = { timeZone: "Europe/Berlin" } as const;
  const month = new Intl.DateTimeFormat(locale, { ...tz, month: "short" });
  const dayOf = new Intl.DateTimeFormat(locale, { ...tz, day: "numeric" });
  const ymd = new Intl.DateTimeFormat("en-CA", tz);
  const today = items.filter((i) => ymd.format(new Date(i.published)) === ymd.format(new Date())).length;
  const cards: NewsCard[] = items.map((item) => {
    const s = item.summary;
    return {
      id: item.id,
      link: item.link,
      headline: s ? (locale === "de" ? s.headline_de : s.headline_en) : item.title,
      summary: s ? (locale === "de" ? s.summary_de : s.summary_en) : null,
      topic: s?.topic ?? null,
      source: item.sourceName,
      foreign: item.sourceLang === locale ? null : locale === "de" ? n.sourceEn : n.sourceDe,
      warning: item.warning,
      published: item.published,
      month: month.format(new Date(item.published)).replace(/\.$/, ""),
      day: dayOf.format(new Date(item.published)).replace(/\.$/, ""),
    };
  });
  // Domains are text, never links, so nobody opens them by accident.
  const domainRow = (e: TrendEntry) => (
    <li key={e.name} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2">
      <span className="font-mono break-all text-bad">
        {defang(e.name)}
        {e.brand && <span className="ml-2 font-sans text-xs text-dim">{e.brand}</span>}
      </span>
      <span className="flex flex-wrap gap-x-3 font-mono text-xs text-dim">
        {trendEvidence(n, e).map((x) => (
          <span key={x}>{x}</span>
        ))}
      </span>
    </li>
  );
  const stamp = new Intl.DateTimeFormat(locale, { ...tz, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date());

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "CollectionPage",
              name: n.metaTitle,
              description: n.description,
              url: abs(`/${locale}/news`),
              inLanguage: locale,
              dateModified: new Date().toISOString(),
              isPartOf: { "@type": "WebSite", name: SITE_NAME, url: abs(`/${locale}`) },
              about: ["Phishing", "Cybersecurity", n.topics.scam, n.topics.fake_shop, n.topics.data_leak],
              mainEntity: {
                "@type": "ItemList",
                itemListElement: items.map((item, i) => ({
                  "@type": "ListItem",
                  position: i + 1,
                  url: item.link,
                  name: item.summary ? (locale === "de" ? item.summary.headline_de : item.summary.headline_en) : item.title,
                })),
              },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: SITE_NAME, item: abs(`/${locale}`) },
                { "@type": "ListItem", position: 2, name: t.nav.news, item: abs(`/${locale}/news`) },
              ],
            },
          ],
        }}
      />
      <SiteNav t={t} locale={locale} path="/news" />
      <main className="mx-auto max-w-6xl px-4 pt-10">
        <Window as="article" title={t.os.windows.news} bodyClassName="p-0">
          <div className="grid lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)]">
            <aside className="space-y-8 border-line p-5 sm:p-8 lg:border-r">
              <div>
                <p className="label flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="flex items-center gap-2">
                    <span className="size-2 animate-pulse bg-ok" aria-hidden />
                    {fill(n.updated, { time: stamp })}
                  </span>
                </p>
                <h1 className="mt-4 text-[clamp(2rem,4vw,2.6rem)] leading-[1.08] font-bold tracking-tight">{n.title}</h1>
                <p className="mt-4 text-muted">{n.lead}</p>
              </div>

              <dl className="grid grid-cols-3 border border-line text-center">
                {[
                  [n.statToday, today],
                  [n.statWarnings, items.filter((i) => i.warning).length],
                  [n.statSources, NEWS_SOURCES.length],
                ].map(([label, value], i) => (
                  <div key={label} className={i > 0 ? "border-l border-line p-3" : "p-3"}>
                    <dd className="font-mono text-2xl text-fg">{value}</dd>
                    <dt className="label mt-1 text-[10px]">{label}</dt>
                  </div>
                ))}
              </dl>

              {/* The intro scrolls away; the tools stay in view next to the feed. */}
              <div className="space-y-6 lg:sticky lg:top-20">
                {trends && (
                  <section className="panel p-4" aria-labelledby="trends">
                    <h2 id="trends" className="flex items-center gap-2 font-bold">
                      <span className="size-2 bg-bad" aria-hidden />
                      {n.trendTitle}
                    </h2>
                    <p className="mt-1 text-xs text-muted">{n.trendShort}</p>
                    {trends.domains.length === 0 ? (
                      <p className="mt-3 text-sm text-dim">{fill(n.trendEmpty, { n: trends.minPeople })}</p>
                    ) : (
                      <ScrollList label={n.trendTitle} className="mt-3 max-h-[11rem] divide-y divide-line pr-2 text-[13px]">
                        {trends.domains.map(domainRow)}
                      </ScrollList>
                    )}
                    <details className="group mt-3 text-xs">
                      <summary className="cursor-pointer text-muted underline decoration-harpoon/60 underline-offset-4 hover:text-fg">{n.trendHow}</summary>
                      {trends.brands.length > 0 && (
                        <p className="mt-3">
                          <span className="label mr-2">{n.trendBrands}</span>
                          {trends.brands.map((e, i) => (
                            <span key={e.name}>
                              {i > 0 && ", "}
                              <b>{e.name}</b> <span className="text-dim">({fill(n.trendPeople, { n: e.people })})</span>
                            </span>
                          ))}
                        </p>
                      )}
                      <p className="mt-3 text-dim">
                        {fill(n.trendLead, {
                          n: trends.minPeople,
                          days: trends.days,
                        })}
                      </p>
                    </details>
                  </section>
                )}

                <div className="panel space-y-3 p-4">
                  <p className="font-bold">{n.ctaTitle}</p>
                  <Link href={`/${locale}#scanner`} className="btn btn-primary w-full">
                    {n.cta} <ArrowRight className="size-4" />
                  </Link>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-muted">{n.subscribeText}</p>
                  <a href={`/${locale}/news/feed.xml`} className="btn w-full">
                    <Rss className="size-4" aria-hidden /> {n.rss}
                  </a>
                </div>
              </div>
            </aside>

            <div className="border-t border-line p-5 sm:p-8 lg:border-t-0">
              {cards.length === 0 ? <p className="panel p-5 text-muted">{n.empty}</p> : <NewsFeed items={cards} n={n} />}
              {items.some((i) => i.summary) && <p className="mt-10 text-xs text-dim">{n.aiNote}</p>}
            </div>
          </div>
        </Window>
      </main>
      <SiteFooter t={t} locale={locale} />
    </>
  );
}
