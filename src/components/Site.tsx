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

/** Top menu bar, as on a classic desktop OS. */
export function SiteNav({ t, locale, path = "" }: { t: Dict; locale: Locale; path?: string }) {
  const other = locale === "de" ? "en" : "de";
  const links: [string, string][] = [
    [`/${locale}#scanner`, t.nav.scanner],
    [`/${locale}/news`, t.nav.news],
    [`/${locale}#how`, t.nav.how],
    [`/${locale}#guides`, t.nav.guides],
    [`/${locale}#help`, t.nav.help],
    [`/${locale}#faq`, t.nav.faq],
    [`/${locale}/methodology`, t.nav.methodology],
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-chrome bg-void/95 backdrop-blur-sm">
      <nav className="mx-auto flex h-9 max-w-[1400px] items-center justify-between gap-3 px-3 font-pixel text-[13px] sm:px-4">
        <div className="flex min-w-0 items-center gap-1">
          <Link href={`/${locale}`} className="focus-ring flex shrink-0 items-center gap-2 px-1.5 py-1 hover:bg-harpoon hover:text-void">
            <Mark size={18} className="text-fg" />
            <span className="font-semibold">Mailharpoon</span>
          </Link>
          <span className="mx-1 hidden h-4 w-px bg-line-strong md:block" />
          <div className="hidden items-center md:flex">
            {links.map(([href, label]) => (
              <Link key={href} href={href} className="focus-ring px-2 py-1 hover:bg-harpoon hover:text-void">
                {label}
              </Link>
            ))}
            <a href={REPO} target="_blank" rel="noreferrer" className="focus-ring px-2 py-1 hover:bg-harpoon hover:text-void">
              {t.nav.github}
            </a>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-muted">
          {/* Phones: the menu items collapse into a classic drop-down menu */}
          <details className="group relative md:hidden">
            <summary className="focus-ring cursor-pointer list-none border border-line-strong px-2 py-0.5 text-fg group-open:bg-harpoon group-open:text-void">
              {t.nav.menu}
            </summary>
            <div className="win absolute right-0 mt-2 w-56 py-1">
              {links.map(([href, label]) => (
                <Link key={href} href={href} className="block px-4 py-2.5 text-fg hover:bg-harpoon hover:text-void">
                  {label}
                </Link>
              ))}
              <a href={REPO} target="_blank" rel="noreferrer" className="block px-4 py-2.5 text-fg hover:bg-harpoon hover:text-void">
                {t.nav.github}
              </a>
            </div>
          </details>
          <span className="hidden items-center gap-1.5 lg:flex">
            <span className="size-2 bg-ok" />
            {t.status.layers}
          </span>
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
          <li><Link className="hover:text-harpoon" href={`/${locale}#scanner`}>{t.nav.scanner}</Link></li>
          <li><Link className="hover:text-harpoon" href={`/${locale}/news`}>{t.nav.news}</Link></li>
          <li><Link className="hover:text-harpoon" href={`/${locale}#guides`}>{t.nav.guides}</Link></li>
          <li><Link className="hover:text-harpoon" href={`/${locale}#help`}>{t.nav.help}</Link></li>
          <li><Link className="hover:text-harpoon" href={`/${locale}#faq`}>{t.nav.faq}</Link></li>
          <li><Link className="hover:text-harpoon" href={`/${locale}/methodology`}>{t.nav.methodology}</Link></li>
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
