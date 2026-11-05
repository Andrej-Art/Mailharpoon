"use client";

import { ImageUp, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Dict } from "@/i18n";

// Claude scales larger images down to about this long edge anyway; smaller uploads are faster.
const MAX_SIDE = 1568;

async function toCanvas(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d", { willReadFrequently: true })?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

/** Decode a QR code entirely in the browser. */
async function decodeQr(canvas: HTMLCanvasElement): Promise<string | null> {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const { default: jsQR } = await import("jsqr");
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return jsQR(img.data, canvas.width, canvas.height, { inversionAttempts: "attemptBoth" })?.data ?? null;
}

const toBase64 = (canvas: HTMLCanvasElement) => canvas.toDataURL("image/jpeg", 0.85).split(",")[1];

type State = "idle" | "busy" | "reading" | "none" | "unavailable" | "error";

/**
 * One drop zone for images: a QR code is read on the device and its link checked; any other image,
 * typically a screenshot of an email or SMS, has its text read out on the server and is checked as a message.
 */
export function QrInput({
  t,
  onDecoded,
  onText,
  pasted,
}: {
  t: Dict;
  onDecoded: (content: string) => void;
  onText: (text: string) => void;
  pasted?: File | null;
}) {
  const [state, setState] = useState<State>("idle");
  const [decoded, setDecoded] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = useCallback(
    async (file: File | undefined | null) => {
      if (!file || !file.type.startsWith("image/")) return;
      setState("busy");
      setDecoded(null);
      try {
        const canvas = await toCanvas(file);
        setPreview(canvas.toDataURL("image/jpeg", 0.6));
        const qr = await decodeQr(canvas);
        if (qr) {
          setDecoded(qr);
          setState("idle");
          return onDecoded(qr);
        }
        setState("reading");
        const res = await fetch("/api/screenshot", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ image: toBase64(canvas), mediaType: "image/jpeg" }),
        });
        const body = await res.json().catch(() => ({}));
        if (res.ok && body.text) {
          setState("idle");
          return onText(body.text);
        }
        setState(body.error === "no_text" ? "none" : body.error === "unavailable" ? "unavailable" : "error");
      } catch {
        setState("error");
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [onDecoded, onText],
  );

  // An image pasted elsewhere in the scanner is handed over here.
  useEffect(() => {
    if (pasted) handle(pasted);
  }, [pasted, handle]);

  // Paste a screenshot straight from the clipboard while this tab is open.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
      if (!file) return;
      e.preventDefault();
      handle(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handle]);

  const busy = state === "busy" || state === "reading";
  return (
    <div className="p-4">
      <label
        className="flex cursor-pointer flex-col items-center justify-center gap-3 border border-dashed border-line-strong px-4 py-8 text-center hover:border-harpoon sm:flex-row sm:gap-5 sm:text-left"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handle(e.dataTransfer.files?.[0]);
        }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local data URL, nothing for next/image to optimise
          <img src={preview} alt="" className={`h-24 w-auto max-w-28 shrink-0 border border-line object-cover object-top ${busy ? "animate-pulse" : ""}`} />
        ) : busy ? (
          <Loader2 className="size-7 shrink-0 animate-spin text-harpoon" />
        ) : (
          <ImageUp className="size-7 shrink-0 text-harpoon" />
        )}
        <span className="flex flex-col gap-1.5">
          <span className="font-semibold">{state === "reading" ? t.hero.qrReading : t.hero.qrPick}</span>
          <span className="max-w-md text-sm text-muted">{t.hero.qrHint}</span>
        </span>
        <input ref={inputRef} type="file" accept="image/*" className="sr-only" onChange={(e) => handle(e.target.files?.[0])} />
      </label>
      {state === "reading" && (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted" role="status">
          <Loader2 className="size-4 animate-spin text-harpoon" aria-hidden /> {t.hero.qrReading}
        </p>
      )}
      {state === "none" && <p className="mt-3 text-sm text-warn" role="alert">{t.hero.qrNone}</p>}
      {state === "unavailable" && <p className="mt-3 text-sm text-warn" role="alert">{t.hero.qrUnavailable}</p>}
      {state === "error" && <p className="mt-3 text-sm text-bad" role="alert">{t.hero.qrError}</p>}
      {decoded && (
        <p className="mt-3 text-sm text-muted">
          {t.hero.qrDecoded} <span className="font-mono break-all text-fg">{decoded}</span>
        </p>
      )}
    </div>
  );
}
