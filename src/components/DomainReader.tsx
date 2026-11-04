"use client";

import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import type { DomainReading, FindingKind } from "@/lib/domain-reading";

type Texts = {
  label: string;
  reading: string;
  score: string;
  verdictHigh: string;
  verdictMid: string;
  verdictLow: string;
  pick: string;
  findings: Record<FindingKind, string>;
};

const TYPE_MS = 45;
const FINDING_MS = 650;
const HOLD_MS = 3200;
const BLOCKS = 24;
const RISKY = new Set<FindingKind>(["brand", "keyword", "digit", "digits", "hyphen", "hyphens", "random", "tldRisky"]);

const fill = (s: string, v: string) => s.replace("{v}", v);

/** Cycles through example domains: types each one, lights up what the model notices, then fills the meter to its real score. */
export function DomainReader({ readings, t }: { readings: DomainReading[]; t: Texts }) {
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [still, setStill] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const r = readings[index];
  // Timeline per domain: one step per typed character, one per finding, one for the meter, then a pause.
  const typed = r.host.length;
  const meterAt = typed + r.findings.length;
  const done = meterAt + 1;

  useEffect(() => {
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (still) return setStep(done);
    if (!visible) return;
    const delay = step < typed ? TYPE_MS : step < done ? FINDING_MS : HOLD_MS;
    const id = setTimeout(() => {
      if (step < done) setStep(step + 1);
      else {
        setIndex((index + 1) % readings.length);
        setStep(0);
      }
    }, delay);
    return () => clearTimeout(id);
  }, [step, visible, still, done, typed, index, readings.length]);

  const shown = r.findings.slice(0, Math.max(0, step - typed));
  const lit = new Map<number, FindingKind>();
  for (const f of shown) for (const [a, b] of f.spans) for (let i = a; i < b; i++) if (!lit.has(i)) lit.set(i, f.kind);
  const meter = step >= meterAt ? r.score : 0;
  const verdict = r.score >= 70 ? t.verdictHigh : r.score >= 35 ? t.verdictMid : t.verdictLow;
  const tone = r.score >= 70 ? "text-bad" : r.score >= 35 ? "text-warn" : "text-ok";

  return (
    <div ref={ref} className="border border-line-strong bg-panel/95 shadow-[4px_4px_0_0_rgb(0_0_0/0.5)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <p className="label">{t.label}</p>
        <div className="flex gap-1.5">
          {readings.map((x, i) => (
            <button
              key={x.host}
              type="button"
              aria-label={fill(t.pick, x.host)}
              aria-pressed={i === index}
              onClick={() => {
                setIndex(i);
                setStep(0);
              }}
              className={clsx("focus-ring size-2.5 border", i === index ? "border-harpoon bg-harpoon" : "border-line-strong bg-transparent hover:border-harpoon")}
            />
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden px-4 py-6 sm:px-5">
        {step < typed && !still && <span className="pointer-events-none absolute inset-y-0 left-0 w-full animate-[scan_1.6s_linear_infinite] bg-gradient-to-b from-transparent via-harpoon/10 to-transparent" aria-hidden />}
        <p className="font-mono text-[clamp(1rem,5vw,1.6rem)] leading-tight break-all" aria-label={r.host}>
          {[...r.host].map((c, i) => {
            const kind = lit.get(i);
            return (
              <span
                key={i}
                aria-hidden
                className={clsx(
                  "transition-colors duration-300",
                  i >= step && "opacity-0",
                  !kind && "text-fg",
                  kind && RISKY.has(kind) && (kind === "random" ? "text-bad underline decoration-wavy decoration-bad/70 underline-offset-4" : "bg-bad/20 text-bad"),
                  kind && !RISKY.has(kind) && (kind === "natural" ? "text-ok underline decoration-ok/60 underline-offset-4" : "bg-ok/15 text-ok"),
                )}
              >
                {c}
              </span>
            );
          })}
          {step < typed && <span className="ml-0.5 inline-block w-[0.55em] animate-[blink_1s_steps(1)_infinite] bg-harpoon">&nbsp;</span>}
        </p>
        <p className="mt-1 h-4 font-mono text-[11px] text-dim">{step < typed ? t.reading : ""}</p>

        <ul className="mt-3 min-h-[13.5rem] space-y-1.5 sm:min-h-[10rem]" aria-live="polite">
          {shown.map((f) => (
            <li key={f.kind + f.value} className="flex animate-[rise_.35s_ease-out] items-start gap-2 text-sm">
              <span className={clsx("mt-1.5 size-2 shrink-0", RISKY.has(f.kind) ? "bg-bad" : "bg-ok")} aria-hidden />
              <span className="text-muted">{fill(t.findings[f.kind], f.value)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 border-t border-line pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-muted">{t.score}</span>
            <span className={clsx("font-vt text-3xl tabular-nums transition-colors", meter ? tone : "text-dim")}>{meter ? `${meter} %` : "··"}</span>
          </div>
          <div className="mt-2 grid gap-0.5" style={{ gridTemplateColumns: `repeat(${BLOCKS}, minmax(0, 1fr))` }} aria-hidden>
            {Array.from({ length: BLOCKS }, (_, i) => {
              const on = (i + 1) / BLOCKS <= meter / 100 + 0.001;
              const at = (i + 1) / BLOCKS;
              return (
                <span
                  key={i}
                  className={clsx("h-3 transition-colors", on ? (at > 0.7 ? "bg-bad" : at > 0.35 ? "bg-warn" : "bg-ok") : "bg-line")}
                  style={{ transitionDuration: "150ms", transitionDelay: on ? `${i * 35}ms` : "0ms" }}
                />
              );
            })}
          </div>
          <p className={clsx("mt-2 h-5 text-sm transition-opacity duration-500", meter ? "opacity-100" : "opacity-0", tone)}>{verdict}</p>
        </div>
      </div>
    </div>
  );
}

/** A bar that fills to its value the first time it scrolls into view. */
export function GrowBar({ value }: { value: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setOn(true), { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="h-2 bg-line">
      <div className="h-full bg-harpoon transition-[width] duration-[1400ms] ease-out motion-reduce:transition-none" style={{ width: on ? `${value * 100}%` : "0%" }} />
    </div>
  );
}
