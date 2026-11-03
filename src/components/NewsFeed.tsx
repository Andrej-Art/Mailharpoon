"use client";

import clsx from "clsx";
import { ArrowUpRight, Bug, DatabaseZap, Fish, HandCoins, KeyRound, ShieldAlert, ShoppingCart, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Dict } from "@/i18n";
import type { TOPICS } from "@/lib/news/summarize";

type Topic = (typeof TOPICS)[number];

/** One news item, prepared on the server so dates render the same on server and client. */
export interface NewsCard {
  id: string;
  link: string;
  headline: string;
  summary: string | null;
  topic: Topic | null;
  source: string;
  /** Language note when the source is in the other language, e.g. "auf Englisch". */
  foreign: string | null;
  warning: boolean;
  published: string;
  month: string;
  day: string;
}

const TOPIC_STYLE: Record<Topic, { icon: LucideIcon; tone: string }> = {
  phishing: { icon: Fish, tone: "text-bad bg-bad/10 border-bad/30" },
  scam: { icon: HandCoins, tone: "text-warn bg-warn/10 border-warn/30" },
  fake_shop: { icon: ShoppingCart, tone: "text-amber bg-amber/10 border-amber/30" },
  malware: { icon: Bug, tone: "text-violet bg-violet/10 border-violet/30" },
  account: { icon: KeyRound, tone: "text-cyan bg-cyan/10 border-cyan/30" },
  data_leak: { icon: DatabaseZap, tone: "text-harpoon bg-harpoon/10 border-harpoon/30" },
  other: { icon: ShieldAlert, tone: "text-ok bg-ok/10 border-ok/30" },
};

const FEATURED = 3;
const PAGE = 8;

function Card({ item, n, featured }: { item: NewsCard; n: Dict["news"]; featured?: boolean }) {
  const style = TOPIC_STYLE[item.topic ?? "other"];
  const Icon = style.icon;
  return (
    <li>
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        className={clsx(
          "group grid grid-cols-[auto_minmax(0,1fr)] gap-4 border p-4 transition-[transform,box-shadow,border-color] hover:-translate-x-px hover:-translate-y-px hover:border-line-strong hover:shadow-[4px_4px_0_0_rgb(0_0_0/0.6)] focus-visible:outline-1 focus-visible:outline-harpoon sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:p-5",
          featured ? "border-line-strong bg-panel-2" : "border-line bg-panel-2/40",
        )}
      >
        <time dateTime={item.published} className="flex h-fit w-12 flex-col items-center border border-line-strong text-center">
          <span className="w-full bg-line px-1 py-0.5 font-pixel text-[11px] uppercase text-muted">{item.month}</span>
          <span className="py-1 font-mono text-lg leading-none text-fg">{item.day}</span>
        </time>
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-[17px] leading-snug font-bold text-fg group-hover:text-harpoon-2">{item.headline}</h3>
          {item.summary && <p className={clsx("mt-1.5 text-sm text-muted", featured ? "line-clamp-3" : "line-clamp-2")}>{item.summary}</p>}
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[12px] text-dim">
            <span>{item.source}</span>
            {item.topic && (
              <>
                <span aria-hidden>/</span>
                <span>{n.topics[item.topic]}</span>
              </>
            )}
            {item.foreign && (
              <>
                <span aria-hidden>/</span>
                <span>{item.foreign}</span>
              </>
            )}
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
          </p>
        </div>
        <span className={clsx("hidden size-20 place-items-center border sm:grid", style.tone)} aria-hidden>
          <Icon className="size-8" strokeWidth={1.5} />
        </span>
      </a>
    </li>
  );
}

function Heading({ id, title, lead, action }: { id: string; title: string; lead?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 id={id} className="flex scroll-mt-20 items-center gap-3 text-2xl font-bold">
          <span className="size-2.5 bg-harpoon" aria-hidden />
          {title}
        </h2>
        {lead && <p className="mt-1 text-sm text-muted">{lead}</p>}
      </div>
      {action}
    </div>
  );
}

export function NewsFeed({ items, n }: { items: NewsCard[]; n: Dict["news"] }) {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [shown, setShown] = useState(PAGE);

  // The newest warnings lead the page; everything else follows newest first.
  const featured = items.filter((i) => i.warning).slice(0, FEATURED);
  const rest = topic ? items.filter((i) => i.topic === topic) : items.filter((i) => !featured.includes(i));
  const counts = new Map<Topic, number>();
  for (const i of items) if (i.topic) counts.set(i.topic, (counts.get(i.topic) ?? 0) + 1);
  const topics = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  const pick = (t: Topic | null) => {
    setTopic(t);
    setShown(PAGE);
    picked.current = true;
  };

  // The list gets shorter when filtered, so after the render the reader is taken back to its start.
  const picked = useRef(false);
  useEffect(() => {
    if (!picked.current) return;
    picked.current = false;
    const heading = document.getElementById("news-all");
    if (heading && heading.getBoundingClientRect().top < 0) heading.scrollIntoView({ block: "start" });
  }, [topic]);

  const chip = (active: boolean) =>
    clsx(
      "border px-3 py-1.5 font-mono text-[12px] transition-colors",
      active ? "border-harpoon bg-harpoon text-void" : "border-line text-muted hover:border-line-strong hover:text-fg",
    );

  return (
    <div className="space-y-12">
      {!topic && featured.length > 0 && (
        <section aria-labelledby="news-featured">
          <Heading id="news-featured" title={n.groupWarnings} lead={n.groupWarningsLead} />
          <ol className="mt-5 space-y-3">
            {featured.map((item) => (
              <Card key={item.id} item={item} n={n} featured />
            ))}
          </ol>
        </section>
      )}

      <section aria-labelledby="news-all">
        <Heading id="news-all" title={n.allNews} lead={n.allNewsLead} />
        {topics.length > 1 && (
          <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label={n.filterLabel}>
            <button type="button" className={chip(!topic)} aria-pressed={!topic} onClick={() => pick(null)}>
              {n.filterAll} <span className="opacity-70">{items.length}</span>
            </button>
            {topics.map(([t, c]) => (
              <button key={t} type="button" className={chip(topic === t)} aria-pressed={topic === t} onClick={() => pick(t)}>
                {n.topics[t]} <span className="opacity-70">{c}</span>
              </button>
            ))}
          </div>
        )}
        <ol className="mt-5 space-y-3">
          {rest.slice(0, shown).map((item) => (
            <Card key={item.id} item={item} n={n} />
          ))}
        </ol>
        {rest.length > shown && (
          <div className="mt-6 flex justify-center">
            <button type="button" className="btn" onClick={() => setShown((s) => s + PAGE)}>
              {n.loadMore} <span className="text-dim">({rest.length - shown})</span>
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
