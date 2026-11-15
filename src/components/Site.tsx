import Link from "next/link";
import { legalPagesLive } from "@/content/legal";
import type { Dict, Locale } from "@/i18n";
import { LangSwitch } from "./LangSwitch";
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
    [`/${locale}/kontakt`, t.nav.contact],
  ];
  return { home, pages };
}

/** Top menu bar, as on a classic desktop OS. */
export function SiteNav({ t, locale, path = "" }: { t: Dict; locale: Locale; path?: string }) {
  const other = locale === "de" ? "en" : "de";
  const { home, pages } = navGroups(t, locale);
  const current = (href: string) => href === `/${locale}${path}`;
  const item = "focus-ring navlink";
  return (
    <header className="sticky top-0 z-50 bg-void/90 backdrop-blur-md">
      <nav className="mx-auto flex h-11 max-w-[1400px] items-center justify-between gap-3 px-3 font-pixel text-[13px] sm:px-4">
        <div className="flex min-w-0 items-center gap-1">
          <Link href={`/${locale}`} className="focus-ring group flex shrink-0 items-center gap-2 px-1.5 py-1">
            <Mark size={22} className="text-fg transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110" />
            <span className="brand-gradient text-[15px] font-semibold drop-shadow-[0_0_10px_rgb(255_46_151/0.35)]">Mailharpoon</span>
          </Link>
          <span className="mx-1 hidden h-4 w-px bg-gradient-to-b from-harpoon to-violet xl:block" />
          <div className="hidden items-center xl:flex">
            {home.map(([href, label]) => (
              <Link key={href} href={href} className={item}>
                {label}
              </Link>
            ))}
            <span className="mx-2 h-4 w-px bg-gradient-to-b from-harpoon to-violet" aria-hidden />
            {pages.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                aria-current={current(href) ? "page" : undefined}
                className={item}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-muted">
          {/* Below desktop width the menu items collapse into a classic drop-down menu */}
          <details className="group relative xl:hidden">
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
            </div>
          </details>
          <span className="hidden items-center gap-1.5 xl:flex">
            <span className="size-1.5 animate-pulse rounded-full bg-ok shadow-[0_0_6px_var(--color-ok)]" aria-hidden />
            <Clock locale={locale} />
          </span>
          <Link href={`/${locale}#scanner`} className="focus-ring hidden border border-harpoon bg-harpoon px-3 py-1 text-void shadow-[0_0_14px_rgb(255_46_151/0.45)] transition-shadow hover:shadow-[0_0_22px_rgb(255_46_151/0.8)] sm:inline-block">
            {t.nav.scan}
          </Link>
          <a href={REPO} target="_blank" rel="noreferrer" aria-label="GitHub" title="GitHub" className="focus-ring p-1 transition-colors hover:text-harpoon">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden>
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
          </a>
          <ThemeToggle labels={{ light: t.nav.lightMode, dark: t.nav.darkMode }} />
          <LangSwitch to={other} href={`/${other}${path}`} />
        </div>
      </nav>
      {/* The logo's stripe colours as a slowly moving neon line under the bar */}
      <div className="neon-bar h-0.5 opacity-90" aria-hidden />
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
          {legalPagesLive() && (
            <>
              <li><Link className="hover:text-harpoon" href={`/${locale}/impressum`}>{t.footer.imprint}</Link></li>
              <li><Link className="hover:text-harpoon" href={`/${locale}/datenschutz`}>{t.footer.privacy}</Link></li>
            </>
          )}
          <li className="text-dim">{t.footer.rights}</li>
          <li className="text-dim">{t.footer.made}</li>
        </ul>
      </div>
    </footer>
  );
}
