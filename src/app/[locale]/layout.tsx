import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Pixelify_Sans, VT323 } from "next/font/google";
import { notFound } from "next/navigation";
import { getDict, isLocale, locales } from "@/i18n";
import { ogLocale, REPO_URL, SITE_NAME, SITE_URL } from "@/lib/seo";
import { Notice } from "@/components/os/Notice";
import "../globals.css";

const geist = Geist({ subsets: ["latin", "latin-ext"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin", "latin-ext"], variable: "--font-geist-mono", display: "swap" });
const pixelify = Pixelify_Sans({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"], variable: "--font-pixelify", display: "swap" });
const vt323 = VT323({ subsets: ["latin", "latin-ext"], weight: "400", variable: "--font-vt323", display: "swap" });

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDict(locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t.meta.title, template: "%s | Mailharpoon" },
    description: t.meta.description,
    applicationName: SITE_NAME,
    authors: [{ name: "Andrej Artuschenko", url: REPO_URL }],
    alternates: { canonical: `/${locale}`, languages: { de: "/de", en: "/en", "x-default": "/en" } },
    openGraph: { siteName: SITE_NAME, title: t.meta.ogTitle, description: t.meta.description, locale: ogLocale[locale], type: "website", url: `/${locale}` },
    twitter: { card: "summary_large_image", title: t.meta.ogTitle, description: t.meta.description },
    robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    formatDetection: { telephone: false, email: false },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#120d1a" },
    { media: "(prefers-color-scheme: light)", color: "#ebe5f1" },
  ],
};

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html suppressHydrationWarning lang={locale} className={`${geist.variable} ${geistMono.variable} ${pixelify.variable} ${vt323.variable}`}>
      <head>
        {/* Apply a stored light/dark choice before first paint so the page never flashes. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("mh-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-dvh overflow-x-hidden">
        {children}
        <Notice n={getDict(locale).notice} locale={locale} />
        <div className="crt" aria-hidden />
      </body>
    </html>
  );
}
