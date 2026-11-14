import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalPage } from "@/components/LegalPage";
import { privacyPolicy } from "@/content/legal";
import { getDict, isLocale, locales } from "@/i18n";

export const generateStaticParams = () => locales.map((locale) => ({ locale }));

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const c = privacyPolicy(locale);
  return { title: c.title, description: c.lead, alternates: { canonical: `/${locale}/datenschutz`, languages: { de: "/de/datenschutz", en: "/en/datenschutz" } }, robots: { index: false } };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const c = privacyPolicy(locale);
  return <LegalPage t={getDict(locale)} locale={locale} path="/datenschutz" title={c.title} lead={c.lead} updated={c.updated} sections={c.sections} />;
}
