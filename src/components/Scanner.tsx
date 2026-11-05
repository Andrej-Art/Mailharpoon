"use client";

import clsx from "clsx";
import { ImageUp, Link2, Loader2, MessageSquareText, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Fused } from "@/lib/analyzers/fusion";
import type { LayerResult } from "@/lib/analyzers/types";
import type { LinkSummary, MessageMeta, Report as ReportT, ScanEvent, ScanTarget } from "@/lib/scan";
import type { Dict, Locale } from "@/i18n";
import { SCANNER_MODE_EVENT } from "./os/DesktopIcons";
import { QrInput } from "./QrInput";
import { Report } from "./Report";

const URL_EXAMPLES = [
  "http://paypal.com.account-verify-login.top/signin?session=8f2a",
  "https://www.arnazon-prime-support.com/login",
  "https://de.wikipedia.org/wiki/Phishing",
];

const MESSAGE_EXAMPLES: Record<Locale, string[]> = {
  de: [
    "DHL: Ihr Paket konnte nicht zugestellt werden. Bitte zahlen Sie die offene Zollgebühr von 1,99 EUR innerhalb von 24 Stunden: https://dhl-zustellung-de.info/track",
    "Hallo Mama, das ist meine neue Nummer. Mein Handy ist ins Wasser gefallen. Kannst du mir schnell schreiben? Ich muss heute noch eine Rechnung bezahlen.",
    "Hallo Herr Weber, wie besprochen sende ich Ihnen das Angebot für die Gartenarbeiten bis Ende der Woche. Mit freundlichen Grüßen, Tobias Klein",
  ],
  en: [
    "USPS: Your package could not be delivered. Please pay the outstanding customs fee of $1.99 within 24 hours: https://usps-redelivery-fee.info/track",
    "Hi Mum, this is my new number. My phone fell in the water. Can you message me quickly? I need to pay a bill today.",
    "Hi Mr Weber, as discussed I will send you the quote for the garden work by the end of the week. Kind regards, Tobias Klein",
  ],
};

type Mode = "url" | "message";
type Tab = Mode | "qr";

export interface ScanState {
  phase: "idle" | "scanning" | "done" | "error";
  mode: Mode;
  target?: ScanTarget;
  message?: MessageMeta;
  links: LinkSummary[];
  layers: LayerResult[];
  result?: Fused;
  report?: ReportT;
  error?: string;
}

const initial = (mode: Mode): ScanState => ({ phase: "idle", mode, layers: [], links: [] });

export function Scanner({ t, locale }: { t: Dict; locale: Locale }) {
  const [mode, setMode] = useState<Tab>("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [state, setState] = useState<ScanState>(initial("url"));
  const scanMode: Mode = mode === "message" ? "message" : "url";
  const abortRef = useRef<AbortController | null>(null);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [pasted, setPasted] = useState<File | null>(null);

  // A screenshot pasted into the link or message field goes to the image tab.
  const onPasteImage = (e: React.ClipboardEvent) => {
    const file = [...e.clipboardData.files].find((f) => f.type.startsWith("image/"));
    if (!file) return;
    e.preventDefault();
    setMode("qr");
    setPasted(file);
  };

  const scan = useCallback(
    async (m: Mode, raw: string) => {
      const value = raw.trim();
      if (!value) return;
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setState({ ...initial(m), phase: "scanning" });
      // Only links are put into the address bar; messages may contain personal data.
      window.history.replaceState(null, "", m === "url" ? `?${new URLSearchParams({ url: value })}#scanner` : `${window.location.pathname}#scanner`);
      setTimeout(() => document.getElementById("report-slot")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);

      try {
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(m === "url" ? { mode: "url", url: value, locale } : { mode: "message", text: value, locale }),
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => ({}));
          setState({ ...initial(m), phase: "error", error: body.error === "rate_limited" ? "rate_limited" : "scan_failed" });
          return;
        }
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = "";
        for (;;) {
          const { value: chunk, done } = await reader.read();
          if (done) break;
          buffer += chunk;
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const ev = JSON.parse(line) as ScanEvent;
            setState((s): ScanState => {
              switch (ev.type) {
                case "target":
                  return { ...s, target: ev.target };
                case "message":
                  return { ...s, message: ev.message };
                case "link":
                  return { ...s, links: [...s.links, ev.link] };
                case "layer":
                  return { ...s, layers: [...s.layers, ev.layer], result: ev.preliminary };
                case "report":
                  return {
                    phase: "done",
                    mode: m,
                    target: ev.report.target,
                    message: ev.report.message,
                    links: ev.report.links ?? [],
                    layers: ev.report.layers,
                    result: ev.report.result,
                    report: ev.report,
                  };
                case "error":
                  return {
                    ...initial(m),
                    phase: "error",
                    error: ev.code.startsWith("invalid_url") ? "invalid_url" : ev.code === "empty_message" ? "empty_message" : "scan_failed",
                  };
                default:
                  return s;
              }
            });
          }
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") setState({ ...initial(m), phase: "error", error: "network" });
      }
    },
    [locale],
  );

  // Desktop icons switch the scanner between link and message mode.
  useEffect(() => {
    const onMode = (e: Event) => {
      const next = (e as CustomEvent<Mode>).detail;
      setMode(next);
      setTimeout(() => document.getElementById(next === "url" ? "scan-url" : "scan-text")?.focus({ preventScroll: true }), 350);
    };
    window.addEventListener(SCANNER_MODE_EVENT, onMode);
    return () => window.removeEventListener(SCANNER_MODE_EVENT, onMode);
  }, []);

  useEffect(() => {
    // The report renders full-width below the hero, outside this narrow column.
    setSlot(document.getElementById("report-slot"));
    const initialUrl = new URLSearchParams(window.location.search).get("url");
    if (initialUrl) {
      setUrl(initialUrl);
      scan("url", initialUrl);
    }
    return () => abortRef.current?.abort();
  }, [scan]);

  const busy = state.phase === "scanning";
  const examples = mode === "url" ? URL_EXAMPLES : mode === "message" ? MESSAGE_EXAMPLES[locale] : [];
  const exampleLabels = mode === "url" ? t.hero.examples : t.hero.messageExamples;

  // A QR code usually holds a link; anything else (text, payment data) is checked as a message.
  const onQr = (content: string) => {
    const looksLikeLink = /^(https?:\/\/|www\.)\S+$/i.test(content.trim());
    if (looksLikeLink) setUrl(content.trim());
    else setText(content);
    scan(looksLikeLink ? "url" : "message", content);
  };

  // Text read out of a screenshot is shown in the message tab and checked like a pasted message.
  const onScreenshotText = (content: string) => {
    setPasted(null);
    setText(content);
    setMode("message");
    scan("message", content);
  };

  const reset = () => {
    setState(initial(scanMode));
    setUrl("");
    setText("");
    window.history.replaceState(null, "", window.location.pathname);
    document.getElementById(mode === "url" ? "scan-url" : "scan-text")?.focus();
  };

  return (
    <>
      <div role="tablist" aria-label="Mode" className="mb-px flex">
        {(["url", "message", "qr"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={clsx(
              "focus-ring flex items-center gap-1.5 border border-b-0 px-2.5 py-2 font-pixel text-[12px] tracking-wide whitespace-nowrap transition-colors sm:gap-2 sm:px-4 sm:text-[13px]",
              mode === m ? "border-line-strong bg-void text-harpoon" : "border-transparent text-dim hover:text-fg",
            )}
          >
            {m === "url" ? <Link2 className="size-3.5" /> : m === "message" ? <MessageSquareText className="size-3.5" /> : <ImageUp className="size-3.5" />}
            <span className="sm:hidden">{t.hero.tabsShort[m]}</span>
            <span className="max-sm:hidden">{t.hero.tabs[m]}</span>
          </button>
        ))}
      </div>

      {mode === "qr" ? (
        <div className="border border-line-strong bg-void">
          <QrInput t={t} onDecoded={onQr} onText={onScreenshotText} pasted={pasted} />
        </div>
      ) : (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          scan(scanMode, scanMode === "url" ? url : text);
        }}
        className="border border-line-strong bg-void"
        role="search"
      >
        {mode === "url" ? (
          <div className="flex flex-col sm:flex-row sm:items-stretch">
            <label htmlFor="scan-url" className="sr-only">URL</label>
            <div className="flex min-w-0 flex-1 items-center gap-3 px-4">
              <span className="font-vt text-xl text-harpoon select-none" aria-hidden>&gt;</span>
              <input
                id="scan-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t.hero.placeholder}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                inputMode="url"
                onPaste={onPasteImage}
                className="min-w-0 flex-1 bg-transparent py-4 font-mono text-[15px] text-fg caret-harpoon outline-none placeholder:text-dim"
              />
              {url && (
                <button
                  type="button"
                  onClick={() => {
                    setUrl("");
                    document.getElementById("scan-url")?.focus();
                  }}
                  aria-label={t.hero.clear}
                  title={t.hero.clear}
                  className="-mr-2 shrink-0 p-2 text-dim transition-colors hover:text-fg focus-visible:text-fg"
                >
                  <X className="size-5" aria-hidden />
                </button>
              )}
            </div>
            <SubmitButton busy={busy} disabled={!url.trim()} t={t} />
          </div>
        ) : (
          <div>
            <label htmlFor="scan-text" className="sr-only">{t.hero.tabs.message}</label>
            <textarea
              id="scan-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t.hero.messagePlaceholder}
              rows={7}
              maxLength={100_000}
              onPaste={onPasteImage}
              spellCheck={false}
              className="block w-full resize-y bg-transparent p-4 font-mono text-[14px] leading-relaxed text-fg caret-harpoon outline-none placeholder:text-dim"
            />
            <div className="flex items-center justify-between gap-3 border-t border-line pl-4">
              <span className="font-mono text-[11px] text-dim">
                {text.length.toLocaleString(locale)} {t.hero.chars}
              </span>
              <SubmitButton busy={busy} disabled={!text.trim()} t={t} />
            </div>
          </div>
        )}
      </form>
      )}

      {examples.length > 0 && (
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="label mr-1">{t.hero.try} →</span>
        {examples.map((ex, i) => (
          <button
            key={ex}
            type="button"
            onClick={() => {
              if (scanMode === "url") setUrl(ex);
              else setText(ex);
              scan(scanMode, ex);
            }}
            className="tag focus-ring transition-colors hover:border-harpoon hover:text-fg"
          >
            {exampleLabels[i]}
          </button>
        ))}
      </div>
      )}
      {mode === "message" && <p className="mt-3 max-w-xl text-xs text-dim">{t.hero.messagePrivacy}</p>}
      {mode === "qr" && <p className="mt-3 max-w-xl text-xs text-dim">{t.hero.qrPrivacy}</p>}

      {state.phase !== "idle" && slot && createPortal(<Report state={state} t={t} onReset={reset} />, slot)}
    </>
  );
}

function SubmitButton({ busy, disabled, t }: { busy: boolean; disabled: boolean; t: Dict }) {
  return (
    <button type="submit" disabled={busy || disabled} className="btn btn-primary border-0 disabled:cursor-not-allowed disabled:opacity-50 sm:px-7">
      {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Search className="size-4" aria-hidden />}
      {busy ? t.hero.scanning : t.hero.button}
    </button>
  );
}
