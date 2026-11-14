"use client";

import Link from "next/link";
import type { Locale } from "@/i18n";

/** Name of the only cookie the site sets: the language picked with this switch. */
export const LANG_COOKIE = "mh-lang";

/** Language switch. Clicking it stores the choice so the bare domain opens in that language next time. */
export function LangSwitch({ to, href }: { to: Locale; href: string }) {
  return (
    <Link
      href={href}
      hrefLang={to}
      onClick={() => {
        document.cookie = `${LANG_COOKIE}=${to}; path=/; max-age=31536000; samesite=lax; secure`;
      }}
      className="focus-ring border border-line-strong px-1.5 uppercase hover:border-harpoon hover:text-fg"
      aria-label={to === "de" ? "Deutsch" : "English"}
    >
      {to}
    </Link>
  );
}
