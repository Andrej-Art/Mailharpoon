import type { Locale } from "@/i18n";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://mailharpoon.vercel.app").replace(/\/$/, "");
export const SITE_NAME = "Mailharpoon";
export const REPO_URL = "https://github.com/Andrej-Art/Mailharpoon";

export const abs = (path: string) => `${SITE_URL}${path}`;
export const ogLocale: Record<Locale, string> = { de: "de_DE", en: "en_US" };

/** Serialises JSON-LD safely for a <script> tag. */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
