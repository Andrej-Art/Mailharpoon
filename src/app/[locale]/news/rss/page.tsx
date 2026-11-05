import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ExternalLink, Rss } from "lucide-react";
import { CopyField } from "@/components/CopyField";
import { SiteFooter, SiteNav } from "@/components/Site";
import { Window } from "@/components/os/Window";
import { getDict, isLocale, locales } from "@/i18n";
import { abs } from "@/lib/seo";

export const generateStaticParams = () => locales.map((locale) => ({ locale }));

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const r = getDict(locale).news.rssPage;
  return { title: r.title, description: r.lead, alternates: { canonical: `/${locale}/news/rss` }, robots: { index: false } };
}

/** Explains the RSS feed to people who have never used one; the feed itself stays plain XML for reader apps. */
export default async function RssPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDict(locale);
  const r = t.news.rssPage;
  const feed = abs(`/${locale}/news/feed.xml`);
  // Subscribe links of common readers: one click and the reader shows the feed ready to follow.
  const apps: [string, string, string][] = [
    ["Feedly", `https://feedly.com/i/subscription/feed/${encodeURIComponent(feed)}`, r.apps.feedly],
    ["Inoreader", `https://www.inoreader.com/?add_feed=${encodeURIComponent(feed)}`, r.apps.inoreader],
  ];

  return (
    <>
      <SiteNav t={t} locale={locale} path="/news/rss" />
      <main className="mx-auto max-w-[1400px] space-y-8 px-3 pt-10 sm:px-4">
        <nav aria-label="Breadcrumb" className="label flex flex-wrap gap-2">
          <Link href={`/${locale}`} className="hover:text-fg">{t.nav.home}</Link>
          <span>/</span>
          <Link href={`/${locale}/news`} className="hover:text-fg">{t.nav.news}</Link>
        </nav>

        <Window title={t.news.rss} bodyClassName="p-0">
          <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] [&>*]:min-w-0">
            <div className="p-6 sm:p-10">
              <span className="grid size-12 place-items-center border border-harpoon bg-harpoon/10 text-harpoon">
                <Rss className="size-6" aria-hidden />
              </span>
              <h1 className="mt-5 text-[clamp(1.9rem,4vw,3rem)] leading-[1.08] font-bold tracking-tight">{r.title}</h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{r.lead}</p>

              <p className="mt-8 label">{r.addressLabel}</p>
              <div className="mt-2">
                <CopyField value={feed} label={r.copy} copied={r.copied} />
              </div>
              <p className="mt-3 text-sm text-dim">{r.addressHint}</p>
            </div>

            <div className="border-t border-line bg-panel-2/60 p-6 sm:p-10 lg:border-t-0 lg:border-l">
              <p className="label">{r.oneClick}</p>
              <ul className="mt-4 space-y-2">
                {apps.map(([name, href, note]) => (
                  <li key={name}>
                    <a href={href} target="_blank" rel="noreferrer" className="group flex items-center justify-between gap-4 border border-line p-4 hover:border-harpoon hover:bg-panel">
                      <span>
                        <span className="block font-semibold group-hover:text-harpoon">{name}</span>
                        <span className="block text-sm text-muted">{note}</span>
                      </span>
                      <ExternalLink className="size-4 shrink-0 text-dim group-hover:text-harpoon" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>

              <p className="mt-8 label">{r.stepsLabel}</p>
              <ol className="mt-4 space-y-3">
                {r.steps.map((s, i) => (
                  <li key={s} className="flex gap-3 text-muted">
                    <span className="font-vt text-xl leading-6 text-harpoon">0{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Window>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link href={`/${locale}/news`} className="btn">
            {r.back} <ArrowRight className="size-4" />
          </Link>
          <a href={`/${locale}/news/feed.xml`} className="font-mono text-[13px] text-dim hover:text-harpoon">
            {r.raw}
          </a>
        </div>
      </main>
      <SiteFooter t={t} locale={locale} />
    </>
  );
}
