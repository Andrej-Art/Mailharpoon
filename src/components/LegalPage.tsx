import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteNav } from "@/components/Site";
import { Window } from "@/components/os/Window";
import { legalPagesLive, type LegalSection } from "@/content/legal";
import type { Dict, Locale } from "@/i18n";

/** Impressum and privacy policy: plain sections in one window, readable width. */
export function LegalPage({ t, locale, path, title, lead, updated, sections }: { t: Dict; locale: Locale; path: string; title: string; lead: string; updated?: string; sections: LegalSection[] }) {
  if (!legalPagesLive()) notFound();
  const para = (text: string, key: string) => (
    <p key={key} className="mt-3 text-[15px] leading-relaxed whitespace-pre-line text-muted first:mt-0">
      {text}
    </p>
  );
  return (
    <>
      <SiteNav t={t} locale={locale} path={path} />
      <main className="mx-auto max-w-[1400px] space-y-8 px-3 pt-10 sm:px-4">
        <nav aria-label="Breadcrumb" className="label flex flex-wrap gap-2">
          <Link href={`/${locale}`} className="hover:text-fg">{t.nav.home}</Link>
          <span>/</span>
          <span>{title}</span>
        </nav>
        <Window title={title}>
          <div className="max-w-3xl">
            <h1 className="text-[clamp(1.9rem,4vw,3rem)] leading-[1.08] font-bold tracking-tight">{title}</h1>
            <p className="mt-4 text-lg leading-relaxed text-muted">{lead}</p>
            {updated && <p className="mt-3 font-mono text-[12px] text-dim">{updated}</p>}
            <div className="mt-10 space-y-9">
              {sections.map((s) => (
                <section key={s.h}>
                  <h2 className="mb-3 text-xl font-bold">{s.h}</h2>
                  {s.p?.map((x, i) => para(x, `p${i}`))}
                  {s.list && (
                    <ul className="mt-3 space-y-2">
                      {s.list.map((x) => (
                        <li key={x} className="flex gap-3 text-[15px] leading-relaxed text-muted">
                          <span className="mt-2.5 size-1.5 shrink-0 bg-harpoon" aria-hidden />
                          <span>{x}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {s.after?.map((x, i) => para(x, `a${i}`))}
                </section>
              ))}
            </div>
          </div>
        </Window>
      </main>
      <SiteFooter t={t} locale={locale} />
    </>
  );
}
