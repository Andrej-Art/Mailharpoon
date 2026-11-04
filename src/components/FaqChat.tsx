"use client";

import clsx from "clsx";
import Image from "next/image";
import { CornerDownLeft, Mail, Search } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

type Texts = { assistant: string; online: string; search: string; none: string; more: string; you: string; contactTitle: string; contactText: string };

const CONTACT = ["mailharpoon", "gmail.com"].join("@");

const WORD_MS = 28;
const TYPING_MS = 700;

/** The FAQ as a chat: pick or search a question, it is sent as your message and the answer types itself in. */
export function FaqChat({ items, t, children }: { items: [string, string][]; t: Texts; children?: ReactNode }) {
  const [active, setActive] = useState<number | null>(null);
  const [words, setWords] = useState(0);
  const [typing, setTyping] = useState(false);
  const [query, setQuery] = useState("");
  const [still, setStill] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const chat = useRef<HTMLDivElement>(null);

  // Ask the first question by itself the first time the section scrolls into view.
  useEffect(() => {
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      setActive((a) => a ?? 0);
      io.disconnect();
    }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const answer = active === null ? [] : items[active][1].split(" ");
  useEffect(() => {
    if (active === null) return;
    if (still) {
      setTyping(false);
      setWords(answer.length);
      return;
    }
    setWords(0);
    setTyping(true);
    const start = setTimeout(() => setTyping(false), TYPING_MS);
    return () => clearTimeout(start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, still]);
  useEffect(() => {
    if (typing || active === null || words >= answer.length) return;
    const id = setTimeout(() => setWords((w) => w + 1), WORD_MS);
    return () => clearTimeout(id);
  }, [typing, words, active, answer.length]);

  const ask = (i: number) => {
    setActive(i);
    // On phones the chat sits above the list; bring it back into view when its top is off screen.
    const box = chat.current?.getBoundingClientRect();
    if (box && (box.top < 0 || box.top > window.innerHeight * 0.6)) chat.current?.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
  };

  const q = query.trim().toLowerCase();
  const shown = items.map((it, i) => [it, i] as const).filter(([[question, a]]) => !q || question.toLowerCase().includes(q) || a.toLowerCase().includes(q));
  const next = active === null ? [] : [1, 2].map((d) => (active + d) % items.length);
  const done = active !== null && !typing && words >= answer.length;

  return (
    <div ref={ref} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-8 [&>*]:min-w-0">
      <div className="lg:col-start-1">
        {children}
        <label className="mt-6 flex items-center gap-3 border border-line-strong bg-void px-4 py-3 focus-within:border-harpoon">
          <Search className="size-4 shrink-0 text-dim" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search}
            aria-label={t.search}
            className="min-w-0 flex-1 bg-transparent font-mono text-[14px] text-fg outline-none placeholder:text-dim"
          />
        </label>
      </div>

      <div ref={chat} className="flex min-h-[26rem] scroll-mt-14 flex-col border border-line-strong bg-void shadow-[4px_4px_0_0_rgb(0_0_0/0.5)] max-lg:order-2 lg:sticky lg:top-20 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <Image src="/logo.png" alt="" width={512} height={438} className="h-7 w-auto" />
          <div className="leading-tight">
            <p className="text-sm font-semibold">{t.assistant}</p>
            <p className="flex items-center gap-1.5 font-mono text-[11px] text-ok">
              <span className="size-1.5 animate-pulse rounded-full bg-ok" aria-hidden /> {t.online}
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5" aria-live="polite">
          {active !== null && (
            <>
              <div key={`q${active}`} className="ml-auto max-w-[85%] animate-[rise_.3s_ease-out]">
                <p className="mb-1 text-right font-mono text-[10px] text-dim uppercase">{t.you}</p>
                <p className="rounded-2xl rounded-br-sm bg-harpoon px-4 py-2.5 text-[15px] font-semibold text-void">{items[active][0]}</p>
              </div>
              <div key={`a${active}`} className="max-w-[92%] animate-[rise_.3s_ease-out]">
                <p className="mb-1 font-mono text-[10px] text-dim uppercase">{t.assistant}</p>
                <div className="rounded-2xl rounded-bl-sm border border-line bg-panel-2 px-4 py-3 text-[15px] leading-relaxed text-fg">
                  {typing ? (
                    <span className="flex gap-1 py-1.5" aria-hidden>
                      {[0, 1, 2].map((d) => (
                        <span key={d} className="size-2 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${d * 120}ms` }} />
                      ))}
                    </span>
                  ) : (
                    <>
                      <span aria-hidden>{answer.slice(0, words).join(" ")}</span>
                      {!done && <span className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 animate-[blink_1s_steps(1)_infinite] bg-harpoon" aria-hidden />}
                      <span className="sr-only">{items[active][1]}</span>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
          <div className={clsx("mt-auto transition-opacity duration-500", done ? "opacity-100" : "pointer-events-none opacity-0")}>
            <p className="mb-2 font-mono text-[10px] text-dim uppercase">{t.more}</p>
            <div className="flex flex-wrap gap-2">
              {next.map((i) => (
                <button key={i} type="button" onClick={() => ask(i)} className="focus-ring border border-line px-3 py-1.5 text-left text-[13px] text-muted hover:border-harpoon hover:text-fg">
                  {items[i][0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <a href={`mailto:${CONTACT}`} className="group flex items-center gap-3 border-t border-line px-4 py-3.5 hover:bg-panel-2 sm:px-5">
          <span className="grid size-9 shrink-0 place-items-center border border-chrome text-harpoon group-hover:bg-harpoon group-hover:text-void">
            <Mail className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 leading-snug">
            <span className="block text-sm font-semibold">{t.contactTitle}</span>
            <span className="block text-[13px] text-muted">
              {t.contactText} <span className="font-mono break-all text-harpoon group-hover:underline">{CONTACT}</span>
            </span>
          </span>
        </a>
      </div>

      <div className="max-lg:order-3 lg:col-start-1">
        <ol className="space-y-1">
          {shown.map(([[question, a], i]) => (
            <li key={question}>
              <button
                type="button"
                onClick={() => ask(i)}
                aria-pressed={i === active}
                className={clsx(
                  "focus-ring group flex w-full items-start gap-3 border px-4 py-3 text-left transition-colors",
                  i === active ? "border-harpoon/60 bg-panel-2" : "border-transparent hover:border-line hover:bg-panel-2/60",
                )}
              >
                <span className={clsx("font-mono text-[14px] leading-6", i === active ? "text-harpoon" : "text-dim group-hover:text-harpoon")}>&gt;</span>
                <span className="flex-1 text-[15px] leading-6 font-semibold">{question}</span>
                <CornerDownLeft className={clsx("mt-1 size-4 shrink-0 transition-opacity", i === active ? "text-harpoon opacity-100" : "text-dim opacity-0 group-hover:opacity-100")} aria-hidden />
              </button>
              {/* The answer stays in the page for search engines and readers without the chat. */}
              <p className="sr-only">{a}</p>
            </li>
          ))}
        </ol>
        {!shown.length && (
          <p className="px-4 py-3 font-mono text-[13px] text-dim">
            {t.none}{" "}
            <a href={`mailto:${CONTACT}`} className="text-harpoon hover:underline">
              {CONTACT}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
