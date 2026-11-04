import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { FaqChat } from "@/components/FaqChat";
import { ChecksDemo, HowDemo, RescuePlan, SpotDemo } from "@/components/HomeDemos";
import { Scanner } from "@/components/Scanner";
import { SiteFooter, SiteNav } from "@/components/Site";
import { DesktopIcons, type DesktopItem } from "@/components/os/DesktopIcons";
import { Window } from "@/components/os/Window";
import { GUIDES, guidePath } from "@/content/guides";
import { fill, getDict, isLocale } from "@/i18n";
import { abs, JsonLd, REPO_URL, SITE_NAME } from "@/lib/seo";
import { evalCounts, latestEval } from "@/lib/eval";
import { wilson } from "@/lib/eval-stats";
import { getThreatStats } from "@/lib/threat-stats";
import { cachedTrends, trendEvidence } from "@/lib/trends/cached";
import { defang } from "@/lib/trends/store";

// Matches the trends cache, so the list in the side window stays current.
export const revalidate = 600;

function H2({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="text-[clamp(1.6rem,3.4vw,2.4rem)] leading-[1.15] font-bold tracking-tight">
      {children}
    </h2>
  );
}

/** One half of the weekly test: a 10 × 10 grid with one square per link, coloured by verdict. */
function TestPanel({
  kicker,
  title,
  cell,
  date,
  value,
  label,
  range,
  total,
  locale,
  parts,
}: {
  kicker: string;
  title: string;
  cell: string;
  date: string;
  value: string;
  label: string;
  range: string;
  total: number;
  locale: string;
  parts: [number, string, string][];
}) {
  const percent = new Intl.NumberFormat(locale, { style: "percent" });
  // One square per percent, whatever the sample size; rounding leftovers go to the largest part.
  const pcts = parts.map(([n]) => Math.round((n / Math.max(total, 1)) * 100));
  pcts[pcts.indexOf(Math.max(...pcts))] += 100 - pcts.reduce((a, b) => a + b, 0);
  const cells = parts.flatMap(([, cls], i) => Array.from({ length: Math.max(pcts[i], 0) }, () => cls));
  return (
    <div className="bg-void p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-pixel text-[12px] tracking-wide text-harpoon uppercase">{kicker}</p>
        <span className="font-mono text-[11px] text-dim">{date}</span>
      </div>
      <h3 className="mt-2 text-xl font-bold">{title}</h3>
      <p className="mt-1 text-sm text-muted">{cell}</p>
      <div className="mt-5 grid items-center gap-6 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
        <div className="grid w-full max-w-52 grid-cols-10 gap-[3px]" role="img" aria-label={parts.map(([, , name], i) => `${name}: ${percent.format(pcts[i] / 100)}`).join(", ")}>
          {cells.map((cls, i) => (
            <span key={i} className={`aspect-square ${cls}`} />
          ))}
        </div>
        <div>
          <p className="phosphor font-vt text-6xl leading-none">{value}</p>
          <p className="mt-2 text-[15px] leading-snug text-fg">{label}</p>
          <p className="mt-1 text-[12px] leading-snug text-dim">{range}</p>
          <ul className="mt-4 space-y-1.5">
            {parts.map(([, cls, name], i) => (
              <li key={name} className="flex items-center gap-2 font-mono text-[12px] text-muted">
                <span className={`size-2.5 ${cls}`} aria-hidden />
                <span className="flex-1">{name}</span>
                <span className="text-fg">{percent.format(pcts[i] / 100)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Example text in which the part in [brackets] is the warning sign, underlined like a spelling mistake. */
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
  // The 95 % Wilson range in whole percent, so the weekly sample is not shown as more precise than it is.
  const percent = new Intl.NumberFormat(locale, { style: "percent" });
  const share = (k: number, n: number) => percent.format(n ? k / n : 0);
  const range = (k: number, n: number) => {
    const w = wilson(k, n);
    return fill(t.stats.range, { low: percent.format(w.low), high: percent.format(w.high) });
  };

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
              featureList: [t.hero.tabs.url, t.hero.tabs.message, t.hero.tabs.qr, ...Object.values(t.layers.items).map((x) => x.title)],
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
            <HowDemo t={t.how}>
              <H2>{t.how.title}</H2>
            </HowDemo>
          </Window>

          {/* ---------- Checks ---------- */}
          <Window title={os.windows.layers}>
            <ChecksDemo t={t.layers}>
              <H2>{t.layers.title}</H2>
              <p className="mt-4 text-muted">{t.layers.lead}</p>
            </ChecksDemo>
            <Link href={`/${locale}/methodology`} className="mt-6 inline-flex items-center gap-2 font-mono text-[13px] text-muted hover:text-harpoon">
              {t.layers.link} <ArrowRight className="size-4" />
            </Link>
          </Window>

          {/* ---------- Stats ---------- */}
          <Window title={os.windows.stats}>
            <div className="grid gap-4 lg:grid-cols-2 lg:items-end">
              <H2>{t.stats.title}</H2>
              <p className="max-w-xl text-muted lg:justify-self-end">{fill(t.stats.lead, evalVars)}</p>
            </div>
            <div className="mt-8 grid gap-px border border-line bg-line lg:grid-cols-2">
              <TestPanel
                kicker={t.stats.phish.kicker}
                title={fill(t.stats.phish.title, evalVars)}
                cell={t.stats.cell}
                date={fill(t.stats.date, evalVars)}
                value={share(counts.flagged, counts.phishing)}
                label={t.stats.phish.label}
                range={range(counts.flagged, counts.phishing)}
                total={counts.phishing}
                locale={locale}
                parts={[
                  [counts.caught, "bg-bad", t.stats.phish.legend[0]],
                  [counts.caughtSuspicious, "bg-warn", t.stats.phish.legend[1]],
                  [counts.missed, "border border-line-strong", t.stats.phish.legend[2]],
                ]}
              />
              <TestPanel
                kicker={t.stats.legit.kicker}
                title={fill(t.stats.legit.title, evalVars)}
                cell={t.stats.cell}
                date={fill(t.stats.date, evalVars)}
                value={share(counts.notDangerous, counts.legitimate)}
                label={t.stats.legit.label}
                range={range(counts.notDangerous, counts.legitimate)}
                total={counts.legitimate}
                locale={locale}
                parts={[
                  [counts.legitSafe, "bg-ok", t.stats.legit.legend[0]],
                  [counts.falseSuspicious, "bg-warn", t.stats.legit.legend[1]],
                  [counts.falseAlarms, "bg-bad", t.stats.legit.legend[2]],
                ]}
              />
            </div>
            <div className="grid gap-px border-x border-b border-line bg-line sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.3fr]">
              {t.stats.more.map(({ value, label }) => (
                <div key={label} className="bg-void p-6">
                  <p className="phosphor font-vt text-5xl leading-none">{value}</p>
                  <p className="mt-3 text-sm leading-snug text-muted">{label}</p>
                </div>
              ))}
              <div className="flex flex-col justify-between gap-5 bg-panel-2 p-6 sm:col-span-2 lg:col-span-1">
                <div>
                  <p className="flex items-center gap-2 font-semibold">
                    <span className="size-2.5 bg-harpoon" aria-hidden /> {t.stats.ctaTitle}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{t.stats.ctaText}</p>
                </div>
                <Link href={`/${locale}/methodology`} className="btn btn-primary self-start">
                  {t.stats.link} <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </Window>

          {/* ---------- Spot phishing + incident response, each with a small animated example ---------- */}
          <Window id="learn" title={os.windows.learn}>
            <SpotDemo t={t.learn}>
              <H2>{t.learn.title}</H2>
            </SpotDemo>
          </Window>

          <Window id="help" title={os.windows.help}>
            <RescuePlan t={t.help}>
              <H2>{t.help.title}</H2>
              <p className="mt-3 text-muted">{t.help.lead}</p>
              <Link href={guidePath(locale, clicked)} className="btn mt-6">
                {t.help.more} <ArrowRight className="size-4" />
              </Link>
            </RescuePlan>
          </Window>

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
          <Window id="faq" title={os.windows.faq}>
            <FaqChat items={t.faq.items as [string, string][]} t={t.faq.chat}>
              <H2>{t.faq.title}</H2>
            </FaqChat>
          </Window>

          {/* ---------- Closing call to action: paste a link right here, it opens in the scanner above ---------- */}
          <Window title={os.windows.alert} bodyClassName="relative overflow-hidden p-0">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,color-mix(in_srgb,var(--color-harpoon)_22%,transparent),transparent_60%)]" />
            <div className="relative grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-14 lg:px-14 lg:py-12">
              <div className="relative mx-auto w-48 sm:w-60 lg:w-full">
                <div aria-hidden className="absolute inset-[12%] animate-pulse rounded-full bg-harpoon/25 blur-3xl" />
                <Image src="/logo.png" alt="" width={512} height={438} className="relative w-full drop-shadow-[0_10px_30px_rgb(0_0_0/0.6)]" />
              </div>
              <div className="min-w-0">
                <p className="text-glow font-pixel text-[clamp(2rem,5.5vw,4rem)] leading-[1] text-fg">{t.cta.title}</p>
                <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{t.cta.sub}</p>
                {/* A plain form: works without JavaScript and hands the link to the scanner, which checks ?url= on load. */}
                <form action={`/${locale}#scanner`} method="get" className="mt-7 flex max-w-3xl flex-col border border-line-strong bg-void focus-within:border-harpoon sm:flex-row">
                  <label className="flex min-w-0 flex-1 items-center gap-3 px-4">
                    <span className="font-mono text-harpoon" aria-hidden>
                      &gt;
                    </span>
                    <input
                      type="text"
                      name="url"
                      required
                      inputMode="url"
                      autoComplete="off"
                      placeholder={t.cta.placeholder}
                      aria-label={t.cta.placeholder}
                      className="min-w-0 flex-1 bg-transparent py-4 font-mono text-[15px] text-fg outline-none placeholder:text-dim"
                    />
                  </label>
                  <button type="submit" className="btn btn-primary shrink-0 justify-center max-sm:border-x-0 max-sm:border-b-0">
                    {t.cta.button} <ArrowRight className="size-4" />
                  </button>
                </form>
              </div>
            </div>
          </Window>
        </div>
      </main>

      <SiteFooter t={t} locale={locale} />
    </>
  );
}
