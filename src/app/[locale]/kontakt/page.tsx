import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail } from "lucide-react";
import { ContactForm } from "@/components/ContactForm";
import { SiteFooter, SiteNav } from "@/components/Site";
import { Window } from "@/components/os/Window";
import { OPERATOR } from "@/content/legal";
import { getDict, isLocale, locales } from "@/i18n";

export const generateStaticParams = () => locales.map((locale) => ({ locale }));

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const c = getDict(locale).contact;
  return { title: c.title, description: c.lead, alternates: { canonical: `/${locale}/kontakt`, languages: { de: "/de/kontakt", en: "/en/kontakt" } }, robots: { index: false } };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDict(locale);
  const c = t.contact;
  return (
    <>
      <SiteNav t={t} locale={locale} path="/kontakt" />
      <main className="mx-auto max-w-[1400px] space-y-8 px-3 pt-10 sm:px-4">
        <nav aria-label="Breadcrumb" className="label flex flex-wrap gap-2">
          <Link href={`/${locale}`} className="hover:text-fg">{t.nav.home}</Link>
          <span>/</span>
          <span>{c.title}</span>
        </nav>
        <Window title={c.title}>
          <div className="relative max-w-2xl">
            <h1 className="text-[clamp(1.9rem,4vw,3rem)] leading-[1.08] font-bold tracking-tight">{c.title}</h1>
            <p className="mt-4 text-lg leading-relaxed text-muted">{c.lead}</p>
            <div className="mt-8">
              <ContactForm t={c} locale={locale} email={OPERATOR.email} />
            </div>
            <p className="mt-8 flex flex-wrap items-center gap-2 border-t border-line pt-5 text-sm text-muted">
              <Mail className="size-4 text-harpoon" aria-hidden />
              {c.direct}
              <a href={`mailto:${OPERATOR.email}`} className="font-mono text-fg hover:text-harpoon">{OPERATOR.email}</a>
            </p>
          </div>
        </Window>
      </main>
      <SiteFooter t={t} locale={locale} />
    </>
  );
}
