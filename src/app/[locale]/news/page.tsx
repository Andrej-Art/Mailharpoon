import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { SiteFooter, SiteNav } from "@/components/Site";
import { Window } from "@/components/os/Window";
import { fill, getDict, isLocale } from "@/i18n";
import { getNews } from "@/lib/news/news";
import { NEWS_SOURCES } from "@/lib/news/sources";

// New items are summarised once and cached; the list itself refreshes hourly.
export const revalidate = 3600;

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
  const items = await getNews();
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
