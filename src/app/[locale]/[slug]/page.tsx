import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { GUIDES, guideBySlug, guidePath } from "@/content/guides";
import { SiteFooter, SiteNav } from "@/components/Site";
import { ReadingProgress } from "@/components/ReadingProgress";
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
  // Headings like "3. Some step" are shown with the number set apart; a guide without numbers is numbered here.
  const numbered = c.sections.some((s) => /^\d+\.\s/.test(s.h2));
  const sections = c.sections.map((s, i) => {
    const m = s.h2.match(/^(\d+)\.\s+(.*)$/);
    const n = m ? m[1].padStart(2, "0") : numbered ? undefined : String(i + 1).padStart(2, "0");
    return { ...s, id: `${locale === "de" ? "abschnitt" : "section"}-${i + 1}`, n, title: m ? m[2] : s.h2 };
  });
  // With an odd number of numbered cards the last one spans both columns, so no empty cell is left.
  const numberedIdx = sections.flatMap((s, i) => (s.n ? [i] : []));
  const lastOdd = numberedIdx.length % 2 ? numberedIdx[numberedIdx.length - 1] : -1;

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

      <ReadingProgress target="guide" />
      <main className="mx-auto max-w-[1400px] space-y-8 px-3 pt-10 sm:space-y-12 sm:px-4">
        <nav aria-label="Breadcrumb" className="label flex flex-wrap gap-2">
          <Link href={`/${locale}`} className="hover:text-fg">{t.nav.home}</Link>
          <span>/</span>
          <Link href={`/${locale}#guides`} className="hover:text-fg">{t.nav.guides}</Link>
        </nav>

        <Window as="article" id="guide" title={t.os.windows.guide} bodyClassName="p-0">
          {/* Header: title and intro, with the table of contents beside it */}
          <header className="relative grid overflow-hidden border-b border-line lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_10%_0%,color-mix(in_srgb,var(--color-harpoon)_18%,transparent),transparent_55%)]" />
            <div className="relative p-6 sm:p-10 lg:p-12">
              <p className="flex flex-wrap items-center gap-3 font-mono text-xs text-dim">
                <span className="border border-harpoon/60 px-2 py-0.5 text-harpoon uppercase">{t.nav.guides}</span>
                {t.guides.updated} {date} · {g.minutes} {t.guides.minutes}
              </p>
              <h1 className="mt-5 text-[clamp(2rem,4.6vw,3.6rem)] leading-[1.05] font-bold tracking-tight">{c.h1}</h1>
              <p className="mt-6 max-w-3xl text-lg leading-relaxed text-fg">{c.intro}</p>
            </div>
            <nav aria-label={t.guides.toc} className="relative border-t border-line bg-panel-2/70 p-6 sm:p-10 lg:border-t-0 lg:border-l">
              <p className="label">{t.guides.toc}</p>
              <ol className="mt-4 space-y-1">
                {sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="group flex items-baseline gap-3 py-1.5 text-[15px] text-muted hover:text-fg">
                      <span className="w-6 shrink-0 font-vt text-lg text-harpoon/70 group-hover:text-harpoon">{s.n ?? "›"}</span>
                      <span className="group-hover:underline group-hover:decoration-harpoon group-hover:underline-offset-4">{s.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </header>

          {/* Sections as numbered cards across the full width; a closing summary spans both columns */}
          <div className="grid gap-px bg-line md:grid-cols-2">
            {sections.map((s, i) => (
              <section
                key={s.id}
                id={s.id}
                className={`group scroll-mt-16 bg-panel p-6 transition-colors hover:bg-panel-2 sm:p-8 ${s.n ? "" : "md:col-span-2 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-harpoon)_10%,var(--color-panel)),var(--color-panel))]"} ${i === lastOdd ? "md:col-span-2" : ""}`}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                  <span className={`shrink-0 font-vt text-5xl leading-none ${s.n ? "text-harpoon/80 group-hover:text-harpoon" : "text-ok"}`}>{s.n ?? "✓"}</span>
                  <div className="min-w-0">
                    <h2 className="text-xl leading-snug font-bold tracking-tight sm:text-2xl">{s.title}</h2>
                    {s.body.map((p) => (
                      <p key={p} className="mt-3 leading-relaxed text-muted">{p}</p>
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
                  </div>
                </div>
              </section>
            ))}
          </div>
        </Window>

        {/* Check a link right from the article; the form hands it to the scanner on the home page */}
        <Window as="aside" title={t.os.windows.alert} bodyClassName="relative overflow-hidden p-0">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_85%_50%,color-mix(in_srgb,var(--color-harpoon)_20%,transparent),transparent_60%)]" />
          <div className="relative grid items-center gap-6 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-12">
            <div>
              <p className="text-glow font-pixel text-[clamp(1.8rem,4vw,3rem)] leading-none text-fg">{t.cta.title}</p>
              <p className="mt-3 text-muted">{t.cta.sub}</p>
            </div>
            <form action={`/${locale}#scanner`} method="get" className="flex flex-col border border-line-strong bg-void focus-within:border-harpoon sm:flex-row">
              <label className="flex min-w-0 flex-1 items-center gap-3 px-4">
                <span className="font-mono text-harpoon" aria-hidden>
                  &gt;
                </span>
                <input
                  type="text"
                  name="url"
                  required
                  inputMode="url"
                  autoComplete="off"
                  placeholder={t.cta.placeholder}
                  aria-label={t.cta.placeholder}
                  className="min-w-0 flex-1 bg-transparent py-4 font-mono text-[15px] text-fg outline-none placeholder:text-dim"
                />
              </label>
              <button type="submit" className="btn btn-primary shrink-0 justify-center max-sm:border-x-0 max-sm:border-b-0">
                {t.guides.related} <ArrowRight className="size-4" />
              </button>
            </form>
          </div>
        </Window>

        <Window title={t.guides.more}>
          <ul className="grid gap-4 md:grid-cols-3">
            {others.map((o) => (
              <li key={o.id}>
                <Link href={guidePath(locale, o)} className="group flex h-full flex-col border border-line p-6 transition-colors hover:border-harpoon hover:bg-panel-2">
                  <span className="font-pixel text-[12px] text-dim">
                    {o.minutes} {t.guides.minutes}
                  </span>
                  <p className="mt-3 text-[17px] leading-snug font-semibold group-hover:text-harpoon">{o.content[locale].h1}</p>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{o.content[locale].description}</p>
                  <span className="mt-5 font-pixel text-[13px] text-harpoon">{t.guides.read} →</span>
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
