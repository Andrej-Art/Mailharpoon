import Link from "next/link";
import type { Dict, Locale } from "@/i18n";
import { Clock } from "./os/Clock";
import { ThemeToggle } from "./os/ThemeToggle";

const REPO = "https://github.com/Andrej-Art/Mailharpoon";

/** Logo mark: a harpoon fired out of a terminal bracket pair. */
export function Mark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} shapeRendering="crispEdges" aria-hidden>
      <defs>
        <linearGradient id="mh-neon" x1="16" y1="48" x2="48" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff2e97" />
          <stop offset="1" stopColor="#9d5cff" />
        </linearGradient>
      </defs>
      <path d="M14 10H6v44h8M50 10h8v44h-8" fill="none" stroke="currentColor" strokeWidth="5" />
      <path d="M18 46 44 20" stroke="url(#mh-neon)" strokeWidth="6" strokeLinecap="square" />
      <path d="M32 18h14v14" fill="none" stroke="url(#mh-neon)" strokeWidth="6" />
      <path d="M24 46h-8v-8" fill="none" stroke="url(#mh-neon)" strokeWidth="5" />
    </svg>
  );
}

export function SectionLabel({ name, n }: { name: string; n: number }) {
  return (
    <p className="label">
      [ <span className="text-fg">{name}</span> / {String(n).padStart(3, "0")} ]
    </p>
  );
}

/** Menu entries in two groups: sections of the home page in the order they appear there, then pages of their own. */
function navGroups(t: Dict, locale: Locale) {
  const home: [string, string][] = [
    [`/${locale}#scanner`, t.nav.scanner],
    [`/${locale}#how`, t.nav.how],
    [`/${locale}#help`, t.nav.help],
    [`/${locale}#guides`, t.nav.guides],
    [`/${locale}#faq`, t.nav.faq],
  ];
  const pages: [string, string][] = [
    [`/${locale}/news`, t.nav.news],
    [`/${locale}/methodology`, t.nav.methodology],
  ];
  return { home, pages };
}

/** Top menu bar, as on a classic desktop OS. */
export function SiteNav({ t, locale, path = "" }: { t: Dict; locale: Locale; path?: string }) {
  const other = locale === "de" ? "en" : "de";
  const { home, pages } = navGroups(t, locale);
  const current = (href: string) => href === `/${locale}${path}`;
  const item = "focus-ring px-2 py-1 hover:bg-harpoon hover:text-void";
  return (
    <header className="sticky top-0 z-50 border-b border-chrome bg-void/95 backdrop-blur-sm">
      <nav className="mx-auto flex h-9 max-w-[1400px] items-center justify-between gap-3 px-3 font-pixel text-[13px] sm:px-4">
        <div className="flex min-w-0 items-center gap-1">
          <Link href={`/${locale}`} className="focus-ring flex shrink-0 items-center gap-2 px-1.5 py-1 hover:bg-harpoon hover:text-void">
            <Mark size={18} className="text-fg" />
            <span className="font-semibold">Mailharpoon</span>
          </Link>
          <span className="mx-1 hidden h-4 w-px bg-line-strong lg:block" />
          <div className="hidden items-center lg:flex">
            {home.map(([href, label]) => (
              <Link key={href} href={href} className={item}>
                {label}
              </Link>
            ))}
            <span className="mx-2 h-4 w-px bg-line-strong" aria-hidden />
            {pages.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                aria-current={current(href) ? "page" : undefined}
                className={`${item} ${current(href) ? "text-harpoon underline decoration-2 underline-offset-[6px]" : ""}`}
              >
                {label}
              </Link>
            ))}
            <a href={REPO} target="_blank" rel="noreferrer" className={`${item} text-muted`}>
              {t.nav.github} ↗
            </a>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-muted">
          {/* Phones and tablets: the menu items collapse into a classic drop-down menu */}
          <details className="group relative lg:hidden">
            <summary className="focus-ring cursor-pointer list-none border border-line-strong px-2 py-0.5 text-fg group-open:bg-harpoon group-open:text-void">
              {t.nav.menu}
            </summary>
            <div className="win absolute right-0 mt-2 w-60 py-1">
              <p className="px-4 pt-2 pb-1 text-[11px] text-dim uppercase">{t.nav.home}</p>
              {home.map(([href, label]) => (
                <Link key={href} href={href} className="block px-4 py-2.5 text-fg hover:bg-harpoon hover:text-void">
                  {label}
                </Link>
              ))}
              <p className="mt-1 border-t border-line px-4 pt-3 pb-1 text-[11px] text-dim uppercase">{t.nav.pages}</p>
              {pages.map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={current(href) ? "page" : undefined}
                  className={`block px-4 py-2.5 hover:bg-harpoon hover:text-void ${current(href) ? "text-harpoon" : "text-fg"}`}
                >
                  {label}
                </Link>
              ))}
              <a href={REPO} target="_blank" rel="noreferrer" className="block px-4 py-2.5 text-muted hover:bg-harpoon hover:text-void">
                {t.nav.github} ↗
              </a>
            </div>
          </details>
          <span className="hidden sm:inline">
            <Clock locale={locale} />
          </span>
          <ThemeToggle labels={{ light: t.nav.lightMode, dark: t.nav.darkMode }} />
          <Link
            href={`/${other}${path}`}
            hrefLang={other}
            className="focus-ring border border-line-strong px-1.5 uppercase hover:border-harpoon hover:text-fg"
            aria-label={other === "de" ? "Deutsch" : "English"}
          >
            {other}
          </Link>
        </div>
      </nav>
    </header>
  );
}

/** Bottom status bar. */
export function SiteFooter({ t, locale }: { t: Dict; locale: Locale }) {
  return (
    <footer className="mt-20 border-t border-chrome bg-void">
      <div className="mx-auto grid max-w-[1400px] gap-8 px-4 py-10 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5 font-pixel text-lg">
            <Mark size={28} className="text-fg" />
            Mailharpoon
          </div>
          <p className="mt-3 max-w-sm text-sm text-muted">{t.footer.tagline}</p>
          <p className="mt-3 max-w-sm text-xs text-dim">{t.footer.disclaimer}</p>
        </div>
        <ul className="space-y-1.5 font-pixel text-[13px] text-muted">
          {[...navGroups(t, locale).home, ...navGroups(t, locale).pages].map(([href, label]) => (
            <li key={href}>
              <Link className="hover:text-harpoon" href={href}>
                {label}
              </Link>
            </li>
          ))}
        </ul>
        <ul className="space-y-1.5 font-pixel text-[13px] text-muted">
          <li><a className="hover:text-harpoon" href={REPO} target="_blank" rel="noreferrer">GitHub ↗</a></li>
          <li className="text-dim">{t.footer.rights}</li>
          <li className="text-dim">{t.footer.made}</li>
        </ul>
      </div>
    </footer>
  );
}
