"use client";

import clsx from "clsx";
import { ArrowDown, Check, ClipboardCheck, Copy, Eye, Fingerprint, Globe, KeyRound, Link2, Lock, Radar, Search, Server, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Dict } from "@/i18n/en";

/** True once the element is on screen, and whether the visitor asked for less motion. */
function useStage() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [still, setStill] = useState(false);
  useEffect(() => {
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, visible, still };
}

/** A beat counter for the current scene: counts up every `ms` while visible, then moves on to the next scene unless paused. */
function useScenes(count: number, beats: (scene: number) => number, ms: number, visible: boolean, still: boolean) {
  const [scene, setScene] = useState(0);
  const [beat, setBeat] = useState(0);
  const [paused, setPaused] = useState(false);
  const last = beats(scene);
  useEffect(() => {
    if (still) return setBeat(last);
    if (!visible) return;
    if (beat >= last && paused) return;
    const id = setTimeout(() => {
      if (beat < last) setBeat(beat + 1);
      else {
        setScene((scene + 1) % count);
        setBeat(0);
      }
    }, beat < last ? ms : ms * 4);
    return () => clearTimeout(id);
  }, [beat, last, visible, still, paused, scene, count, ms]);
  const pick = (i: number) => {
    setPaused(true);
    setScene(i);
    setBeat(0);
  };
  return { scene, beat, pick, paused };
}

const Mark = ({ on, tone = "bad", children }: { on: boolean; tone?: "bad" | "ok"; children: ReactNode }) => (
  <span className={clsx("transition-colors duration-500", on && (tone === "bad" ? "bg-bad/20 text-bad" : "bg-ok/15 text-ok"))}>{children}</span>
);

const Note = ({ on, children, tone = "bad" }: { on: boolean; children: ReactNode; tone?: "bad" | "ok" }) => (
  <p className={clsx("mt-3 font-mono text-[12px] transition-all duration-500", on ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0", tone === "bad" ? "text-bad" : "text-ok")}>
    {children}
  </p>
);

/** Highlights each phrase in `text` once `beat` passes its position in the list. */
function hot(text: string, phrases: string[], beat: number) {
  const out: ReactNode[] = [];
  let rest = text;
  let key = 0;
  while (rest) {
    const hits = phrases.map((p, i) => ({ i, at: rest.indexOf(p), p })).filter((h) => h.at >= 0).sort((a, b) => a.at - b.at);
    if (!hits.length) {
      out.push(rest);
      break;
    }
    const h = hits[0];
    out.push(rest.slice(0, h.at));
    out.push(
      <Mark key={key++} on={beat > h.i}>
        {h.p}
      </Mark>,
    );
    rest = rest.slice(h.at + h.p.length);
  }
  return out;
}

type Learn = Dict["learn"];

function Scene({ i, beat, d }: { i: number; beat: number; d: Learn["demo"] }) {
  if (i === 0) {
    const { address, real } = d.url;
    const prefix = address.slice(0, address.length - real.length);
    return (
      <div>
        <p className="font-mono text-[clamp(0.95rem,3.6vw,1.35rem)] break-all">
          <span className={clsx("transition-all duration-700", beat >= 2 && "text-dim line-through decoration-dim")}>{prefix}</span>
          <Mark on={beat >= 1}>{real}</Mark>
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-[12px]">
          <span className={clsx("border-t border-dashed border-dim pt-2 text-dim transition-opacity duration-500", beat >= 2 ? "opacity-100" : "opacity-0")}>← {d.url.disguise}</span>
          <span className={clsx("border-t-2 border-bad pt-2 text-right text-bad transition-opacity duration-500", beat >= 1 ? "opacity-100" : "opacity-0")}>{d.url.real_label} ↗</span>
        </div>
        <p className={clsx("mt-5 font-mono text-[11px] text-dim transition-opacity", beat >= 1 ? "opacity-100" : "opacity-0")}>{d.url.rule}</p>
      </div>
    );
  }
  if (i === 1) {
    const pairs = [
      ["paypa1.com", "paypal.com", 5, 6, 5, 6],
      ["rnicrosoft.com", "microsoft.com", 0, 2, 0, 1],
      ["аpple.com", "apple.com", 0, 1, 0, 1],
    ] as const;
    return (
      <ul className="space-y-3">
        {pairs.map(([fake, real, fa, fb, ra, rb], k) => (
          <li key={real} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 border-b border-line pb-3 font-mono last:border-0">
            <span className="text-[clamp(0.95rem,3.4vw,1.2rem)]">
              {fake.slice(0, fa)}
              <Mark on={beat > k}>{fake.slice(fa, fb)}</Mark>
              {fake.slice(fb)}
            </span>
            <span className="text-[11px] text-dim uppercase">{d.look.fake}</span>
            <span className="text-[clamp(0.95rem,3.4vw,1.2rem)] text-muted">
              {real.slice(0, ra)}
              <Mark on={beat > k} tone="ok">
                {real.slice(ra, rb)}
              </Mark>
              {real.slice(rb)}
            </span>
            <span className="text-[11px] text-dim uppercase">{d.look.real}</span>
            <span className={clsx("col-span-2 text-[12px] text-bad transition-opacity duration-500", beat > k ? "opacity-100" : "opacity-0")}>{d.look.notes[k]}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (i === 2) return <Sms beat={beat} d={d.sms} />;
  if (i === 3) {
    return (
      <div className="mx-auto max-w-xs border border-line-strong bg-panel p-4">
        <p className="text-sm font-semibold">{d.login.title}</p>
        <div className="mt-3 space-y-2">
          {d.login.fields.map((f, k) => {
            const bad = k === d.login.fields.length - 1;
            return (
              <div
                key={f}
                className={clsx(
                  "flex items-center justify-between border px-3 py-2 font-mono text-[12px] text-dim transition-all duration-500",
                  bad && beat >= 1 ? "border-bad bg-bad/10 text-bad shadow-[0_0_0_3px_rgb(255_80_80/0.15)]" : "border-line",
                )}
              >
                {f}
                {bad && <Lock className="size-3.5" aria-hidden />}
              </div>
            );
          })}
          <div className="bg-harpoon/80 px-3 py-2 text-center text-[12px] font-semibold text-void">{d.login.button}</div>
        </div>
        <Note on={beat >= 2}>{d.login.note}</Note>
      </div>
    );
  }
  return (
    <div className="font-mono text-[13px]">
      {d.redirect.hops.map((h, k) => (
        <div key={h} className={clsx("transition-all duration-500", beat >= k ? "opacity-100" : "translate-y-1 opacity-0")}>
          {k > 0 && <ArrowDown className="my-1 ml-3 size-4 text-dim" aria-hidden />}
          <span className="inline-block border border-line px-3 py-1.5 text-muted">{h}</span>
        </div>
      ))}
      <div className={clsx("transition-all duration-500", beat >= d.redirect.hops.length ? "opacity-100" : "translate-y-1 opacity-0")}>
        <ArrowDown className="my-1 ml-3 size-4 text-bad" aria-hidden />
        <span className="inline-block border border-bad bg-bad/15 px-3 py-1.5 text-bad">{d.redirect.final}</span>
        <span className="ml-3 text-[12px] text-bad">← {d.redirect.note}</span>
      </div>
      <Note on={beat >= d.redirect.hops.length + 1} tone="ok">
        {d.redirect.follow}
      </Note>
    </div>
  );
}

function Sms({ beat, d }: { beat: number; d: Learn["demo"]["sms"] }) {
  const [left, setLeft] = useState(24 * 3600 - 1);
  useEffect(() => {
    const id = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 24 * 3600 - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const hms = [left / 3600, (left / 60) % 60, left % 60].map((x) => String(Math.floor(x)).padStart(2, "0")).join(":");
  return (
    <div className="mx-auto max-w-xs">
      <p className="text-center font-mono text-[11px] text-dim">{d.sender}</p>
      <div className="mt-2 rounded-2xl rounded-bl-sm bg-panel-2 px-4 py-3 text-[15px] leading-relaxed">
        {hot(d.text, d.hot, beat)} <span className="text-harpoon underline">{d.link}</span>
      </div>
      <div className={clsx("mt-4 flex items-center justify-between border px-3 py-2 font-mono transition-colors duration-500", beat >= 1 ? "border-bad text-bad" : "border-line text-dim")}>
        <span className="text-[11px] uppercase">{d.timer}</span>
        <span className="text-lg tabular-nums">{hms}</span>
      </div>
      <Note on={beat >= d.hot.length}>{d.note}</Note>
    </div>
  );
}

const SCENE_BEATS = [2, 3, 3, 2, 4];

/** The five warning signs, each with a short animated example that plays when it comes up. */
export function SpotDemo({ t, children }: { t: Learn; children?: ReactNode }) {
  const { ref, visible, still } = useStage();
  const { scene, beat, pick, paused } = useScenes(t.items.length, (s) => SCENE_BEATS[s], 900, visible, still);
  return (
    // Phones: heading, example, list, so a tapped sign plays right under it. Desktop: heading and list left, example right.
    <div ref={ref} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:grid-rows-[auto_1fr] lg:gap-x-8 [&>*]:min-w-0">
      <div className="lg:col-start-1">{children}</div>
      <div className="max-lg:order-3 lg:col-start-1">
        <ol className="space-y-1.5">
          {t.items.map(([title, body], i) => (
            <li key={title}>
              <button
                type="button"
                onClick={() => pick(i)}
                aria-pressed={i === scene}
                className={clsx("focus-ring relative grid w-full grid-cols-[auto_1fr] gap-4 overflow-hidden border px-4 py-3 text-left transition-colors", i === scene ? "border-line-strong bg-panel-2" : "border-transparent hover:border-line")}
              >
                <span className={clsx("font-vt text-2xl leading-none", i === scene ? "text-harpoon" : "text-dim")}>{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span className="block text-[16px] font-semibold">{title}</span>
                  <span className={clsx("mt-1 block text-base leading-relaxed text-muted", i !== scene && "max-lg:hidden lg:line-clamp-1")}>{body}</span>
                </span>
                {i === scene && !paused && !still && (
                  <span
                    key={`${scene}-${visible}`}
                    className="absolute bottom-0 left-0 h-0.5 bg-harpoon"
                    style={{ animation: visible ? `grow ${(SCENE_BEATS[i] + 4) * 0.9}s linear forwards` : "none" }}
                    aria-hidden
                  />
                )}
              </button>
            </li>
          ))}
        </ol>
      </div>
      <div className="relative flex min-h-80 flex-col border border-line-strong bg-void shadow-[4px_4px_0_0_rgb(0_0_0/0.5)] max-lg:order-2 lg:sticky lg:top-20 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
        <p className="flex justify-between border-b border-line px-4 py-2.5 font-pixel text-[11px] text-dim uppercase">
          <span>{t.demo.label}</span>
          <span>
            {String(scene + 1).padStart(2, "0")} / {String(t.items.length).padStart(2, "0")}
          </span>
        </p>
        <div key={scene} className="flex flex-1 animate-[rise_.35s_ease-out] flex-col justify-center p-5 sm:p-7" aria-hidden>
          <Scene i={scene} beat={beat} d={t.demo} />
        </div>
      </div>
    </div>
  );
}

type Help = Dict["help"];
// Which emergency steps belong to which situation; -1 is "close the page", only for a plain click.
const PLANS: { steps: number[]; start: number }[] = [
  { steps: [-1, 4], start: 0.7 },
  { steps: [0, 1, 4], start: 0.15 },
  { steps: [2, 4], start: 0.1 },
  { steps: [3, 4], start: 0.35 },
];

/** Pick what happened and watch the matching steps get ticked off while the protection meter climbs back to green. */
export function RescuePlan({ t, children }: { t: Help; children?: ReactNode }) {
  const { ref, visible, still } = useStage();
  const { scene, beat, pick } = useScenes(PLANS.length, (s) => PLANS[s].steps.length, 1300, visible, still);
  const plan = PLANS[scene];
  const level = plan.start + (1 - plan.start) * (beat / plan.steps.length);
  const step = (k: number) => (k === -1 ? t.plan.closeTab : t.steps[k]);
  return (
    <div ref={ref} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] [&>*]:min-w-0">
      <div>
        {children}
        <p className="mt-6 label">{t.plan.ask}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {t.plan.choices.map((c, i) => (
            <button
              key={c}
              type="button"
              onClick={() => pick(i)}
              aria-pressed={i === scene}
              className={clsx("focus-ring border px-3 py-3 text-left text-sm font-semibold transition-colors", i === scene ? "border-bad bg-bad/10 text-fg" : "border-line text-muted hover:border-line-strong hover:text-fg")}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col border border-line-strong bg-void shadow-[4px_4px_0_0_rgb(0_0_0/0.5)]">
        <div className="border-b border-line px-4 py-3 sm:px-5">
          <div className="flex items-baseline justify-between font-mono text-[11px] uppercase">
            <span className="text-muted">{t.plan.status}</span>
            <span className={level >= 0.999 ? "text-ok" : level > 0.5 ? "text-warn" : "text-bad"}>{level >= 0.999 ? t.plan.to : t.plan.from}</span>
          </div>
          <div className="mt-2 h-2.5 bg-line">
            <div
              className={clsx("h-full transition-[width,background-color] duration-700 ease-out", level >= 0.999 ? "bg-ok" : level > 0.5 ? "bg-warn" : "bg-bad")}
              style={{ width: `${level * 100}%` }}
            />
          </div>
        </div>
        {PLANS.map((p, s) => (
          // Every plan stays in the page, so all steps are readable without the animation; only the chosen one is shown.
          <ol key={s} hidden={s !== scene} className="flex-1 space-y-3 p-4 sm:p-5">
            {p.steps.map((k, j) => {
              const [title, body] = step(k);
              const done = s === scene && beat > j;
              return (
                <li key={k} className={clsx("grid grid-cols-[auto_1fr] gap-3 transition-opacity duration-500", s === scene && beat < j ? "opacity-40" : "opacity-100")}>
                  <span className={clsx("mt-0.5 grid size-6 place-items-center border transition-colors duration-300", done ? "border-ok bg-ok text-void" : "border-line-strong text-dim")}>
                    {done ? <Check className="size-4" strokeWidth={3} aria-hidden /> : <span className="font-mono text-[11px]">{j + 1}</span>}
                  </span>
                  <div>
                    <h3 className={clsx("text-[16px] font-semibold transition-colors", done && "text-ok")}>{title}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-muted">{body}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        ))}
        <p className={clsx("border-t border-line px-4 py-3 font-mono text-[12px] text-ok transition-opacity duration-500 sm:px-5", beat >= plan.steps.length ? "opacity-100" : "opacity-0")}>{t.plan.done}</p>
      </div>
    </div>
  );
}

type How = Dict["how"];
const HOW_BEATS = [3, 6, 4];
// Which of the eight checks raise a flag in the example: age, address, brand and page.
const HOW_FLAGS = [false, true, true, true, true, false, false, false];

function HowScene({ i, beat, d }: { i: number; beat: number; d: How["demo"] }) {
  if (i === 0) {
    return (
      <div className="mx-auto w-full max-w-xs">
        <p className="text-center font-mono text-[11px] text-dim">{d.sender}</p>
        <div className="relative mt-2 rounded-2xl rounded-bl-sm bg-panel-2 px-4 py-3 text-[15px] leading-relaxed">
          {d.sms}{" "}
          <span className={clsx("relative break-all text-harpoon underline transition-colors duration-300", beat >= 1 && "bg-harpoon/25")}>
            {d.link}
            {beat === 1 && <span className="absolute top-1/2 left-1/2 size-10 -translate-1/2 animate-ping rounded-full bg-fg/30" aria-hidden />}
          </span>
        </div>
        <div className={clsx("mt-2 ml-auto w-44 border border-line-strong bg-panel font-mono text-[12px] shadow-[3px_3px_0_0_rgb(0_0_0/0.5)] transition-all duration-300", beat >= 2 ? "opacity-100" : "pointer-events-none -translate-y-1 opacity-0")}>
          <p className="px-3 py-2 text-dim">{d.open}</p>
          <p className={clsx("flex items-center gap-2 border-t border-line px-3 py-2", beat >= 2 && "bg-harpoon text-void")}>
            <Copy className="size-3.5" aria-hidden /> {d.copy}
          </p>
        </div>
        <p className={clsx("mt-4 flex items-center justify-center gap-2 font-mono text-[12px] text-ok transition-opacity duration-500", beat >= 3 ? "opacity-100" : "opacity-0")}>
          <ClipboardCheck className="size-4" aria-hidden /> {d.copied}
        </p>
      </div>
    );
  }
  if (i === 1) {
    return (
      <div className="w-full">
        <div className="flex border border-line-strong">
          <p className="min-w-0 flex-1 truncate px-3 py-2.5 font-mono text-[13px]">
            {beat >= 1 ? <span className="text-fg">{d.link}</span> : <span className="text-dim">{d.placeholder}</span>}
          </p>
          <span className={clsx("flex items-center gap-1.5 px-3 font-pixel text-[12px] transition-colors", beat >= 2 ? "bg-harpoon text-void" : "bg-harpoon/30 text-fg")}>
            <Search className="size-3.5" aria-hidden /> {d.check}
          </span>
        </div>
        <ul className="mt-5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {d.layers.map((l, k) => {
            const on = beat >= 3 + Math.floor(k / 2);
            return (
              <li
                key={l}
                className={clsx(
                  "flex items-center gap-2 border px-2.5 py-2 font-mono text-[11px] transition-all duration-300",
                  !on && "border-line text-dim",
                  on && (HOW_FLAGS[k] ? "border-bad/60 bg-bad/10 text-bad" : "border-ok/40 text-ok"),
                )}
              >
                <span className={clsx("size-1.5 shrink-0", on ? (HOW_FLAGS[k] ? "bg-bad" : "bg-ok") : "animate-pulse bg-dim")} aria-hidden />
                {l}
              </li>
            );
          })}
        </ul>
        <p className={clsx("mt-4 font-mono text-[11px] text-dim transition-opacity", beat >= 2 && beat < 6 ? "opacity-100" : "opacity-0")}>{d.scanning}</p>
      </div>
    );
  }
  return (
    <div className="w-full border border-bad/60 bg-bad/5 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-pixel text-[13px] text-bad uppercase">{d.verdict}</span>
        <span className="font-vt text-3xl text-bad tabular-nums">{beat >= 1 ? d.score : "··"}</span>
      </div>
      <div className="mt-2 h-2 bg-line">
        <div className="h-full bg-bad transition-[width] duration-1000 ease-out" style={{ width: beat >= 1 ? `${d.score}%` : "0%" }} />
      </div>
      <ul className="mt-4 space-y-1.5">
        {d.reasons.map((r, k) => (
          <li key={r} className={clsx("flex gap-2 text-sm text-muted transition-all duration-500", beat >= 2 ? "opacity-100" : "translate-y-1 opacity-0")} style={{ transitionDelay: `${k * 150}ms` }}>
            <span className="mt-1.5 size-2 shrink-0 bg-bad" aria-hidden />
            {r}
          </li>
        ))}
      </ul>
      <p className={clsx("mt-4 border-t border-line pt-3 text-sm font-semibold text-fg transition-opacity duration-500", beat >= 3 ? "opacity-100" : "opacity-0")}>→ {d.advice}</p>
    </div>
  );
}

/** The three steps of a check played as one short film: copy from a message, paste and scan, read the verdict. */
export function HowDemo({ t, children }: { t: How; children?: ReactNode }) {
  const { ref, visible, still } = useStage();
  const { scene, beat, pick, paused } = useScenes(t.steps.length, (s) => HOW_BEATS[s], 850, visible, still);
  return (
    <div ref={ref} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:grid-rows-[auto_1fr] lg:gap-x-8 [&>*]:min-w-0">
      <div className="lg:col-start-1">{children}</div>
      <div className="relative flex min-h-80 flex-col border border-line-strong bg-void shadow-[4px_4px_0_0_rgb(0_0_0/0.5)] max-lg:order-2 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
        <p className="flex justify-between border-b border-line px-4 py-2.5 font-pixel text-[11px] text-dim uppercase">
          <span>{t.demo.label}</span>
          <span>
            0{scene + 1} / 0{t.steps.length}
          </span>
        </p>
        <div key={scene} className="flex flex-1 animate-[rise_.35s_ease-out] items-center p-5 sm:p-7" aria-hidden>
          <HowScene i={scene} beat={beat} d={t.demo} />
        </div>
      </div>
      <ol className="space-y-1.5 max-lg:order-3 lg:col-start-1">
        {t.steps.map(([title, body], i) => (
          <li key={title}>
            <button
              type="button"
              onClick={() => pick(i)}
              aria-pressed={i === scene}
              className={clsx("focus-ring relative grid w-full grid-cols-[auto_1fr] gap-4 overflow-hidden border px-4 py-4 text-left transition-colors", i === scene ? "border-line-strong bg-panel-2" : "border-transparent hover:border-line")}
            >
              <span className={clsx("font-vt text-3xl leading-none", i === scene ? "text-harpoon" : "text-dim")}>0{i + 1}_</span>
              <span className="min-w-0 [overflow-wrap:anywhere] [hyphens:auto]">
                <span className="block text-lg font-semibold">{title}</span>
                <span className="mt-1 block leading-relaxed text-muted">{body}</span>
              </span>
              {i === scene && !paused && !still && (
                <span
                  key={`${scene}-${visible}`}
                  className="absolute bottom-0 left-0 h-0.5 bg-harpoon"
                  style={{ animation: visible ? `grow ${(HOW_BEATS[i] + 4) * 0.85}s linear forwards` : "none" }}
                  aria-hidden
                />
              )}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

type Layers = Dict["layers"];
const CHECKS = [
  ["intel", Radar],
  ["reputation", Globe],
  ["lexical", Link2],
  ["brand", Fingerprint],
  ["page", KeyRound],
  ["network", Server],
  ["visual", Eye],
  ["ai", Sparkles],
] as const;
const CHECK_BEATS = [4, 2, 4, 2, 3, 3, 3, 3];

function Browser({ address, tone, children }: { address: string; tone: "ok" | "bad"; children: ReactNode }) {
  return (
    <div className="border border-line-strong bg-panel">
      <p className={clsx("flex items-center gap-1.5 border-b border-line px-2 py-1.5 font-mono text-[10px] transition-colors duration-500", tone === "ok" ? "text-ok" : "text-bad")}>
        <Lock className="size-3 shrink-0" aria-hidden />
        <span className="truncate">{address}</span>
      </p>
      <div className="p-3">{children}</div>
    </div>
  );
}

function CheckScene({ k, beat, d }: { k: (typeof CHECKS)[number][0]; beat: number; d: Layers["demo"] }) {
  switch (k) {
    case "intel":
      return (
        <div className="w-full">
          <ul className="space-y-1.5 font-mono text-[12px]">
            {d.intel.lists.map((l, j) => {
              const done = beat > j;
              const hit = j === 0;
              return (
                <li key={l} className={clsx("flex items-center justify-between gap-3 border px-3 py-2 transition-colors duration-300", done && hit ? "border-bad bg-bad/10" : "border-line")}>
                  <span className={done ? "text-fg" : "text-dim"}>{l}</span>
                  <span className={clsx("text-right", !done && "animate-pulse text-dim", done && (hit ? "text-bad" : "text-dim"))}>{done ? (hit ? d.intel.hit : d.intel.none) : "···"}</span>
                </li>
              );
            })}
          </ul>
          <Note on={beat >= 4}>{d.intel.note}</Note>
        </div>
      );
    case "reputation":
      return (
        <div className="w-full space-y-5 font-mono text-[12px]">
          {[
            [d.reputation.real, d.reputation.realAge, 1, "bg-ok", "text-ok"],
            [d.reputation.fake, d.reputation.fakeAge, 0.02, "bg-bad", "text-bad"],
          ].map(([name, age, w, bar, text]) => (
            <div key={name as string}>
              <p className="flex justify-between gap-3">
                <span className="text-fg">{name}</span>
                <span className={clsx("transition-opacity duration-500", beat >= 1 ? "opacity-100" : "opacity-0", text as string)}>{age}</span>
              </p>
              <div className="mt-1.5 h-3 bg-line">
                <div className={clsx("h-full transition-[width] duration-[1200ms] ease-out", bar as string)} style={{ width: beat >= 1 ? `${Math.max((w as number) * 100, 1.5)}%` : "0%" }} />
              </div>
            </div>
          ))}
          <Note on={beat >= 2}>{d.reputation.note}</Note>
        </div>
      );
    case "lexical": {
      const lit = d.lexical.parts.slice(0, beat);
      return (
        <div className="w-full">
          <p className="font-mono text-[clamp(1rem,3.6vw,1.35rem)] break-all">{hot(d.lexical.domain, d.lexical.parts.map(([part]) => part), beat)}</p>
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {lit.map(([part, why]) => (
              <li key={part} className="animate-[rise_.35s_ease-out] border border-bad/50 px-2 py-1 font-mono text-[11px] text-bad">
                {part} · {why}
              </li>
            ))}
          </ul>
          <Note on={beat >= 4}>{d.lexical.note}</Note>
        </div>
      );
    }
    case "brand":
      return (
        <div className="w-full text-center">
          <p className="font-mono text-[clamp(1.3rem,5vw,2rem)]">
            paypa<span className={clsx("inline-block transition-all duration-700", beat >= 1 && "scale-150 bg-bad/20 px-1 text-bad")} style={beat >= 1 ? { fontFamily: "Georgia, serif" } : undefined}>I</span>.com
          </p>
          <p className="mt-2 font-mono text-[clamp(1.3rem,5vw,2rem)] text-muted">
            paypa<span className={clsx("inline-block transition-all duration-700", beat >= 1 && "scale-150 bg-ok/15 px-1 text-ok")} style={beat >= 1 ? { fontFamily: "Georgia, serif" } : undefined}>l</span>.com
          </p>
          <p className={clsx("mt-4 font-mono text-[12px] text-bad transition-opacity duration-500", beat >= 1 ? "opacity-100" : "opacity-0")}>{d.brand.reveal}</p>
          <Note on={beat >= 2}>{d.brand.note}</Note>
        </div>
      );
    case "page":
      return (
        <div className="relative mx-auto w-full max-w-xs overflow-hidden border border-line-strong bg-panel p-4">
          {beat < 3 && <span className="pointer-events-none absolute inset-x-0 top-0 h-full animate-[scan_1.6s_linear_infinite] bg-gradient-to-b from-transparent via-harpoon/15 to-transparent" aria-hidden />}
          <p className="text-sm font-semibold">{d.page.title}</p>
          <div className="mt-3 space-y-2">
            {d.page.fields.map((f, j) => {
              const flag = j !== 1 && beat >= (j === 0 ? 1 : 2);
              return (
                <div key={f} className={clsx("border px-3 py-2 font-mono text-[12px] transition-all duration-500", flag ? "border-bad bg-bad/10 text-bad" : "border-line text-dim")}>
                  {f}
                </div>
              );
            })}
          </div>
          <Note on={beat >= 3}>{d.page.note}</Note>
        </div>
      );
    case "network":
      return (
        <div className="w-full">
          <ul className="space-y-1.5 font-mono text-[12px]">
            {d.network.rows.map(([label, value, tone], j) => (
              <li
                key={label}
                className={clsx(
                  "flex items-center justify-between gap-3 border px-3 py-2.5 transition-all duration-500",
                  beat >= j ? "opacity-100" : "translate-y-1 opacity-0",
                  tone === "ok" ? "border-ok/40" : "border-bad/50 bg-bad/5",
                )}
              >
                <span className="text-muted">{label}</span>
                <span className={tone === "ok" ? "text-ok" : "text-bad"}>
                  {tone === "ok" && <Lock className="mr-1.5 inline size-3.5" aria-hidden />}
                  {value}
                </span>
              </li>
            ))}
          </ul>
          <Note on={beat >= 3}>{d.network.note}</Note>
        </div>
      );
    case "visual":
      return (
        <div className="w-full">
          <div className="grid grid-cols-2 gap-3">
            {[
              [d.visual.real, "ok"],
              [d.visual.fake, beat >= 2 ? "bad" : "ok"],
            ].map(([address, tone]) => (
              <Browser key={address} address={address} tone={tone as "ok" | "bad"}>
                <span className="flex items-center gap-1.5">
                  <span className="grid size-5 place-items-center bg-bad font-bold text-[11px] text-white">{d.visual.brand[0]}</span>
                  <span className="truncate text-[12px] font-semibold">{d.visual.brand}</span>
                </span>
                <span className="mt-2 block h-1.5 w-3/4 bg-line" />
                <span className="mt-1.5 block h-1.5 w-1/2 bg-line" />
                <span className="mt-2 block h-4 w-full border border-line" />
              </Browser>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 font-mono text-[11px]">
            <span className={clsx("text-center text-muted transition-opacity duration-500", beat >= 1 ? "opacity-100" : "opacity-0")}>= {d.visual.same}</span>
            <span className={clsx("text-center text-bad transition-opacity duration-500", beat >= 2 ? "opacity-100" : "opacity-0")}>≠ {d.visual.other}</span>
          </div>
          <Note on={beat >= 3}>{d.visual.note}</Note>
        </div>
      );
    case "ai":
      return (
        <div className="w-full">
          <p className="border-l-2 border-line-strong pl-4 text-[15px] leading-relaxed text-muted">{hot(d.ai.text, d.ai.hot, beat)}</p>
          <p className={clsx("mt-5 inline-flex items-center gap-2 border border-violet/60 bg-violet/10 px-3 py-2 font-mono text-[12px] text-violet transition-all duration-500", beat >= 3 ? "opacity-100" : "translate-y-1 opacity-0")}>
            <Sparkles className="size-3.5" aria-hidden /> {d.ai.verdict}
          </p>
        </div>
      );
  }
}

/** The eight checks as a control panel: pick one and its example plays out on the right. */
export function ChecksDemo({ t, children }: { t: Layers; children?: ReactNode }) {
  const { ref, visible, still } = useStage();
  const { scene, beat, pick, paused } = useScenes(CHECKS.length, (s) => CHECK_BEATS[s], 800, visible, still);
  const [key] = CHECKS[scene];
  return (
    <div ref={ref} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-x-8 [&>*]:min-w-0">
      <div>
        {children}
        <ul className="mt-6 grid grid-cols-4 gap-1.5">
          {CHECKS.map(([k, Icon], i) => (
            <li key={k}>
              <button
                type="button"
                onClick={() => pick(i)}
                aria-pressed={i === scene}
                aria-label={t.pick.replace("{v}", t.items[k].title)}
                className={clsx(
                  "focus-ring group relative flex h-full w-full flex-col items-start gap-2 overflow-hidden border p-2.5 text-left transition-colors sm:p-3",
                  i === scene ? "border-harpoon bg-panel-2" : "border-line hover:border-line-strong",
                )}
              >
                <span className="flex w-full items-center justify-between">
                  <span className={clsx("grid size-8 place-items-center border transition-colors", i === scene ? "border-harpoon bg-harpoon text-void" : "border-chrome text-harpoon")}>
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="font-vt text-lg text-dim">0{i + 1}</span>
                </span>
                <span className="hidden text-[13px] leading-snug font-semibold sm:block">{t.items[k].title}</span>
                {i === scene && !paused && !still && (
                  <span
                    key={`${scene}-${visible}`}
                    className="absolute bottom-0 left-0 h-0.5 bg-harpoon"
                    style={{ animation: visible ? `grow ${(CHECK_BEATS[i] + 4) * 0.8}s linear forwards` : "none" }}
                    aria-hidden
                  />
                )}
              </button>
            </li>
          ))}
        </ul>
        {/* Every description stays in the page for readers without the animation; only the chosen one is shown. */}
        {CHECKS.map(([k], i) => (
          <div key={k} hidden={i !== scene} className="mt-5 max-lg:hidden">
            <h3 className="text-[17px] font-semibold">
              <span className="mr-2 font-vt text-xl text-harpoon">0{i + 1}</span>
              {t.items[k].title}
            </h3>
            <p className="mt-1.5 leading-relaxed text-muted">{t.items[k].text}</p>
          </div>
        ))}
      </div>
      <div>
        <div className="flex min-h-80 flex-col border border-line-strong bg-void shadow-[4px_4px_0_0_rgb(0_0_0/0.5)]">
          <p className="flex justify-between border-b border-line px-4 py-2.5 font-pixel text-[11px] text-dim uppercase">
            <span>{t.example}</span>
            <span>0{scene + 1} / 08</span>
          </p>
          <div key={scene} className="flex flex-1 animate-[rise_.35s_ease-out] items-center p-5 sm:p-7" aria-hidden>
            <CheckScene k={key} beat={beat} d={t.demo} />
          </div>
        </div>
        <div className="mt-4 lg:hidden">
          <h3 className="text-[17px] font-semibold">
            <span className="mr-2 font-vt text-xl text-harpoon">0{scene + 1}</span>
            {t.items[key].title}
          </h3>
          <p className="mt-1.5 leading-relaxed text-muted">{t.items[key].text}</p>
        </div>
      </div>
    </div>
  );
}
