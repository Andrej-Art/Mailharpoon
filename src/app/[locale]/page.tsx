import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Eye, Fingerprint, Globe, KeyRound, Link2, Radar, Server, Sparkles } from "lucide-react";
import { Scanner } from "@/components/Scanner";
import { SiteFooter, SiteNav } from "@/components/Site";
import { DesktopIcons, type DesktopItem } from "@/components/os/DesktopIcons";
import { Window } from "@/components/os/Window";
import { GUIDES, guidePath } from "@/content/guides";
import { fill, getDict, isLocale } from "@/i18n";
import { abs, JsonLd, REPO_URL, SITE_NAME } from "@/lib/seo";
import { evalCounts, latestEval } from "@/lib/eval";
import { getThreatStats } from "@/lib/threat-stats";
import { cachedTrends, trendEvidence } from "@/lib/trends/cached";
import { defang } from "@/lib/trends/store";

// Matches the trends cache, so the list in the side window stays current.
export const revalidate = 600;

const LAYERS = [
  ["intel", Radar],
  ["reputation", Globe],
  ["lexical", Link2],
  ["brand", Fingerprint],
  ["page", KeyRound],
  ["network", Server],
  ["visual", Eye],
  ["ai", Sparkles],
] as const;

function H2({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="text-[clamp(1.6rem,3.4vw,2.4rem)] leading-[1.15] font-bold tracking-tight">
      {children}
    </h2>
  );
}

/** The wordmark as a pixel logotype with stripes in the logo's colours. */
function PixelWordmark({ tagline }: { tagline: string }) {
  return (
    <div className="select-none" aria-hidden>
      <p className="text-glow font-pixel text-[clamp(2.3rem,8vw,6.2rem)] leading-[0.9] font-bold tracking-tight text-fg">
        Mailharpoon
      </p>
      <div className="mt-2 flex w-[min(100%,34rem)] flex-col gap-[2px] sm:gap-[3px]">
        {["#ff2e97", "#d94bd8", "#9d5cff", "var(--color-chrome)", "#33e6ef"].map((c) => (
          <span key={c} className="h-[3px] w-full" style={{ background: c }} />
        ))}
      </div>
      <p className="mt-2 font-vt text-[19px] text-muted sm:mt-3 sm:text-[22px]">{tagline}</p>
    </div>
  );
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDict(locale);
  const os = t.os;
  const [threats, trends] = await Promise.all([getThreatStats(), cachedTrends().catch(() => null)]);
  const stamp = new Intl.DateTimeFormat(locale, { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" }).format(new Date());
  const clicked = GUIDES.find((g) => g.id === "clicked")!;
  const counts = evalCounts();
  const evalDate = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(latestEval.date));
  const evalVars = { ...counts, date: evalDate };

  const icons: DesktopItem[] = [
    { icon: "link", label: os.icons.link, href: "#scanner", mode: "url" },
    { icon: "mail", label: os.icons.message, href: "#scanner", mode: "message" },
    { icon: "doc", label: os.icons.how, href: "#how" },
    { icon: "book", label: os.icons.guides, href: "#guides" },
    { icon: "alert", label: os.icons.help, href: "#help" },
    { icon: "help", label: os.icons.faq, href: "#faq" },
    { icon: "chart", label: os.icons.methodology, href: `/${locale}/methodology` },
  ];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebApplication",
              name: SITE_NAME,
              url: abs(`/${locale}`),
              description: t.meta.description,
              applicationCategory: "SecurityApplication",
              operatingSystem: "Any",
              browserRequirements: "Requires JavaScript",
              inLanguage: locale,
              isAccessibleForFree: true,
              offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
              featureList: [t.hero.tabs.url, t.hero.tabs.message, t.hero.tabs.qr, ...Object.values(t.layers.items).map((x) => x[0])],
            },
            { "@type": "Organization", name: SITE_NAME, url: abs("/"), logo: abs("/mark.svg"), sameAs: [REPO_URL] },
            {
              "@type": "FAQPage",
              mainEntity: t.faq.items.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
            },
          ],
        }}
      />
      <SiteNav t={t} locale={locale} />

      <main>
        {/* ---------- Desktop ---------- */}
        <section id="scanner" className="relative scroll-mt-10 overflow-x-clip">
          <div className="glow pointer-events-none absolute -top-40 left-1/3 size-[760px]" />
          <div className="relative mx-auto grid max-w-[1400px] gap-8 px-3 pt-5 pb-10 sm:px-4 sm:pt-8 lg:grid-cols-[260px_minmax(0,1fr)_96px] lg:gap-10 lg:pt-10 lg:pb-14">
            {/* Left: system widget */}
            <aside className="hidden space-y-6 lg:order-1 lg:block">
              <Window title={os.windows.system} bodyClassName="p-4">
                <p className="label flex items-center gap-2">
                  <span className="size-2 animate-blink bg-bad" /> {os.threatTitle}
                </p>
                <p className="mt-1 font-mono text-[11px] text-dim">{fill(os.updated, { time: stamp })}</p>
                {trends?.domains.length ? (
                  // Domains are text, never links, so nobody opens them by accident.
                  <ol className="mt-3 divide-y divide-line">
                    {trends.domains.slice(0, 3).map((e) => (
                      <li key={e.name} className="py-2.5">
                        <p className="font-mono text-[13px] break-all text-bad">{defang(e.name)}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-dim">{[e.brand, ...trendEvidence(t.news, e)].filter(Boolean).join(" · ")}</p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-3 text-sm leading-snug">
                    {threats ? fill(os.threatLine, { n: threats.activePhishing.toLocaleString(locale) }) : os.threatUnknown}
                  </p>
                )}
                <Link href={`/${locale}/news`} className="mt-3 flex items-center gap-1.5 border-t border-line pt-3 font-pixel text-[12px] text-harpoon hover:underline">
                  <ArrowRight className="size-3.5" /> {os.trendsAll}
                </Link>
              </Window>
              <Image src="/logo.png" alt="" width={512} height={438} className="mx-auto w-full max-w-[240px]" />
            </aside>

            {/* Center: wordmark + scanner window */}
            <div className="min-w-0 animate-rise lg:order-2">
              <PixelWordmark tagline={os.tagline} />
              <Window title={os.windows.scanner} className="mt-5 sm:mt-8" bodyClassName="p-3.5 sm:p-6">
                <h1 className="text-[clamp(1.6rem,3.4vw,2.3rem)] leading-[1.15] font-bold tracking-tight">
                  {t.hero.title1} <span className="text-harpoon">{t.hero.title2}</span>
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">{t.hero.lead}</p>
                <div className="mt-6">
                  <Scanner t={t} locale={locale} />
                </div>
                <p className="mt-4 flex max-w-2xl items-start gap-2 text-xs text-dim">
                  <span className="mt-1 size-1.5 shrink-0 bg-ok" /> {t.hero.privacy}
                </p>
              </Window>
              {threats && (
                <p className="mt-4 flex items-center gap-2 font-pixel text-[12px] text-muted lg:hidden">
                  <span className="size-2 animate-blink bg-bad" />
                  {fill(os.threatLine, { n: threats.activePhishing.toLocaleString(locale) })}
                </p>
              )}
            </div>

            {/* Right: desktop icons */}
            <DesktopIcons
              items={icons}
              className="hidden lg:order-3 lg:flex lg:flex-col lg:items-center lg:gap-5"
            />
          </div>
          <div id="report-slot" className="relative mx-auto max-w-[1400px] scroll-mt-12 px-4 pb-14 empty:hidden" />
        </section>

        <div className="mx-auto max-w-[1400px] space-y-8 px-3 pt-10 sm:space-y-14 sm:px-4 sm:pt-16">
          {/* ---------- How it works ---------- */}
          <Window id="how" title={os.windows.how}>
            <H2>{t.how.title}</H2>
            <ol className="mt-8 grid gap-6 md:grid-cols-3">
              {t.how.steps.map(([title, body], i) => (
                <li key={title} className="border border-line p-5">
                  <span className="font-vt text-3xl text-harpoon">0{i + 1}_</span>
                  <h3 className="mt-3 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 leading-relaxed text-muted">{body}</p>
                </li>
              ))}
            </ol>
          </Window>

          {/* ---------- Checks ---------- */}
          <Window title={os.windows.layers}>
            <div className="grid gap-4 lg:grid-cols-2 lg:items-end">
              <H2>{t.layers.title}</H2>
              <p className="max-w-xl text-muted lg:justify-self-end">{t.layers.lead}</p>
            </div>
            <ul className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
              {LAYERS.map(([key, Icon], i) => (
                <li key={key} className="group bg-panel p-5 transition-colors hover:bg-panel-2">
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center border border-chrome text-harpoon group-hover:bg-harpoon group-hover:text-void">
                      <Icon className="size-[18px]" />
                    </span>
                    <span className="font-vt text-xl text-dim">0{i + 1}</span>
                  </div>
                  <h3 className="mt-5 text-[17px] font-semibold">{t.layers.items[key][0]}</h3>
                  <p className="mt-1.5 text-base leading-relaxed text-muted">{t.layers.items[key][1]}</p>
                  <p className="mt-3 font-mono text-[11px] text-dim">{t.layers.items[key][2]}</p>
                </li>
              ))}
            </ul>
          </Window>

          {/* ---------- Stats ---------- */}
          <Window title={os.windows.stats}>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <H2>{t.stats.title}</H2>
                <p className="mt-2 max-w-3xl text-muted">{fill(t.stats.lead, evalVars)}</p>
              </div>
              <Link href={`/${locale}/methodology`} className="btn">
                {t.stats.link} <ArrowRight className="size-4" />
              </Link>
            </div>
            <ul className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
              {t.stats.items.map(({ value, label, note }, i) => {
                const more = [counts.caughtSuspicious, counts.falseSuspicious][i];
                return (
                  <li key={label} className="bg-void p-6">
                    <p className="phosphor font-vt text-6xl leading-none">{fill(value, evalVars)}</p>
                    <p className="mt-3 text-sm leading-snug text-muted">{label}</p>
                    {note && more > 0 && <p className="mt-2 font-mono text-xs text-dim">{fill(note, { n: more })}</p>}
                  </li>
                );
              })}
            </ul>
          </Window>

          {/* ---------- Spot phishing + incident response ---------- */}
          <div className="grid gap-8 sm:gap-14 lg:grid-cols-2">
            <Window id="learn" title={os.windows.learn}>
              <H2>{t.learn.title}</H2>
              <ol className="mt-6 space-y-5">
                {t.learn.items.map(([title, body], i) => (
                  <li key={title} className="grid grid-cols-[auto_1fr] gap-4">
                    <span className="font-vt text-2xl leading-none text-harpoon">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <h3 className="text-[16px] font-semibold">{title}</h3>
                      <p className="mt-1 text-base leading-relaxed text-muted">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Window>

            <Window id="help" title={os.windows.help}>
              <H2>{t.help.title}</H2>
              <p className="mt-3 text-muted">{t.help.lead}</p>
              <ol className="mt-6 space-y-5">
                {t.help.steps.map(([title, body], i) => (
                  <li key={title} className="grid grid-cols-[auto_1fr] gap-4">
                    <span className="font-vt text-2xl leading-none text-bad">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <h3 className="text-[16px] font-semibold">{title}</h3>
                      <p className="mt-1 text-base leading-relaxed text-muted">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <Link href={guidePath(locale, clicked)} className="btn mt-8">
                {t.help.more} <ArrowRight className="size-4" />
              </Link>
            </Window>
          </div>

          {/* ---------- Guides ---------- */}
          <Window id="guides" title={os.windows.guides}>
            <H2>{t.guides.title}</H2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {GUIDES.map((g) => (
                <li key={g.id}>
                  <Link href={guidePath(locale, g)} className="group flex h-full flex-col border border-line p-5 hover:border-harpoon">
                    <span className="font-pixel text-[12px] text-dim">
                      {g.minutes} {t.guides.minutes}
                    </span>
                    <h3 className="mt-4 text-[17px] leading-snug font-semibold group-hover:text-harpoon">{g.content[locale].h1}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{g.content[locale].description}</p>
                    <span className="mt-5 font-pixel text-[13px] text-harpoon">{t.guides.read} →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Window>

          {/* ---------- FAQ ---------- */}
          <Window id="faq" title={os.windows.faq} className="mx-auto max-w-4xl">
            <H2>{t.faq.title}</H2>
            <div className="mt-6 border border-line">
              {t.faq.items.map(([q, a]) => (
                <details key={q} className="group border-b border-line last:border-0">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 p-5 hover:bg-panel-2">
                    <h3 className="text-[16px] font-semibold">{q}</h3>
                    <span className="font-vt text-2xl text-harpoon group-open:hidden">+</span>
                    <span className="hidden font-vt text-2xl text-harpoon group-open:inline">-</span>
                  </summary>
                  <p className="px-5 pb-5 leading-relaxed text-muted">{a}</p>
                </details>
              ))}
            </div>
          </Window>

          {/* ---------- Alert dialog CTA ---------- */}
          <Window title={os.windows.alert} className="mx-auto max-w-2xl" bodyClassName="flex flex-col items-center gap-5 p-8 text-center sm:flex-row sm:text-left">
            <Image src="/logo.png" alt="" width={512} height={438} className="w-40 shrink-0" />
            <div className="flex-1">
              <p className="text-2xl font-bold">{t.cta.title}</p>
              <p className="mt-1 text-muted">{t.cta.sub}</p>
            </div>
            <Link href={`/${locale}#scanner`} className="btn btn-primary shrink-0">
              {t.cta.button}
            </Link>
          </Window>
        </div>
      </main>

      <SiteFooter t={t} locale={locale} />
    </>
  );
}
