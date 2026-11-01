import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { GUIDES, guideBySlug, guidePath } from "@/content/guides";
import { SiteFooter, SiteNav } from "@/components/Site";
import { Window } from "@/components/os/Window";
import { getDict, isLocale, locales } from "@/i18n";
import { abs, JsonLd, ogLocale, SITE_NAME } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.flatMap((locale) => GUIDES.map((g) => ({ locale, slug: g.content[locale].slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const g = guideBySlug(locale, slug);
  if (!g) return {};
  const c = g.content[locale];
  return {
    title: { absolute: c.title },
    description: c.description,
    alternates: {
      canonical: guidePath(locale, g),
      languages: { de: guidePath("de", g), en: guidePath("en", g), "x-default": guidePath("en", g) },
    },
    openGraph: { type: "article", title: c.title, description: c.description, url: guidePath(locale, g), locale: ogLocale[locale], modifiedTime: g.updated },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const g = guideBySlug(locale, slug);
  if (!g) notFound();
  const t = getDict(locale);
  const c = g.content[locale];
  const others = GUIDES.filter((x) => x.id !== g.id);
  const date = new Date(g.updated).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Article",
              headline: c.h1,
              description: c.description,
              inLanguage: locale,
              dateModified: g.updated,
              datePublished: g.updated,
              mainEntityOfPage: abs(guidePath(locale, g)),
              author: { "@type": "Person", name: "Andrej Artuschenko" },
              publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: abs("/mark.svg") } },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: SITE_NAME, item: abs(`/${locale}`) },
                { "@type": "ListItem", position: 2, name: t.nav.guides, item: abs(`/${locale}#guides`) },
                { "@type": "ListItem", position: 3, name: c.h1, item: abs(guidePath(locale, g)) },
              ],
            },
          ],
        }}
      />
      <SiteNav t={t} locale={locale} path={`/${g.content[locale === "de" ? "en" : "de"].slug}`} />

      <main className="mx-auto max-w-3xl px-4 pt-12">
        <nav aria-label="Breadcrumb" className="label flex flex-wrap gap-2">
          <Link href={`/${locale}`} className="hover:text-fg">{t.nav.home}</Link>
          <span>/</span>
          <Link href={`/${locale}#guides`} className="hover:text-fg">{t.nav.guides}</Link>
        </nav>

        <Window as="article" title={t.os.windows.guide} className="mt-6">
          <h1 className="text-[clamp(1.9rem,4.6vw,2.9rem)] leading-[1.12] font-bold tracking-tight">{c.h1}</h1>
          <p className="mt-4 font-mono text-xs text-dim">
            {t.guides.updated} {date}, {g.minutes} {t.guides.minutes}
          </p>
          <p className="mt-8 text-lg leading-relaxed text-fg">{c.intro}</p>

          {c.sections.map((s) => (
            <section key={s.h2} className="mt-12">
              <h2 className="text-2xl font-bold tracking-tight">{s.h2}</h2>
              {s.body.map((p) => (
                <p key={p} className="mt-4 leading-relaxed text-muted">{p}</p>
              ))}
              {s.list && (
                <ul className="mt-4 space-y-2">
                  {s.list.map((li) => (
                    <li key={li} className="flex gap-3 text-muted">
                      <span className="text-harpoon">›</span>
                      {li}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </Window>

        <Window as="aside" title={t.os.windows.alert} className="mt-12" bodyClassName="p-8 text-center">
          <p className="text-2xl font-bold">{t.cta.title}</p>
          <p className="mt-2 text-muted">{t.cta.sub}</p>
          <Link href={`/${locale}#scanner`} className="btn btn-primary mt-6">
            {t.guides.related} <ArrowRight className="size-4" />
          </Link>
        </Window>

        <Window title={t.os.windows.guides} className="mt-12">
          <ul className="grid gap-px border border-line bg-line sm:grid-cols-2">
            {others.map((o) => (
              <li key={o.id} className="bg-panel p-6">
                <Link href={guidePath(locale, o)} className="group block">
                  <p className="font-semibold group-hover:text-harpoon">{o.content[locale].h1}</p>
                  <p className="mt-2 text-sm text-muted">{o.content[locale].description}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Window>
      </main>

      <SiteFooter t={t} locale={locale} />
    </>
  );
}
