import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalPage } from "@/components/LegalPage";
import { legalNotice } from "@/content/legal";
import { getDict, isLocale, locales } from "@/i18n";

export const generateStaticParams = () => locales.map((locale) => ({ locale }));

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const c = legalNotice(locale);
  return { title: c.title, description: c.lead, alternates: { canonical: `/${locale}/impressum`, languages: { de: "/de/impressum", en: "/en/impressum" } }, robots: { index: false } };
}

export default async function ImpressumPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const c = legalNotice(locale);
  return <LegalPage t={getDict(locale)} locale={locale} path="/impressum" title={c.title} lead={c.lead} sections={c.sections} />;
}
