"use client";

import { ImageUp, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import type { Dict } from "@/i18n";

const MAX_SIDE = 1600;

/** Decode a QR code from an image entirely in the browser. The image never leaves the device. */
async function decodeQr(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const { default: jsQR } = await import("jsqr");
  const img = ctx.getImageData(0, 0, w, h);
  return jsQR(img.data, w, h, { inversionAttempts: "attemptBoth" })?.data ?? null;
}

export function QrInput({ t, onDecoded }: { t: Dict; onDecoded: (content: string) => void }) {
  const [state, setState] = useState<"idle" | "busy" | "none" | "error">("idle");
  const [decoded, setDecoded] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = async (file: File | undefined) => {
    if (!file) return;
    setState("busy");
    setDecoded(null);
    try {
      const content = await decodeQr(file);
      if (!content) return setState("none");
      setDecoded(content);
      setState("idle");
      onDecoded(content);
    } catch {
      setState("error");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="p-4">
      <label
        className="flex cursor-pointer flex-col items-center justify-center gap-3 border border-dashed border-line-strong px-4 py-8 text-center hover:border-harpoon"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handle(e.dataTransfer.files?.[0]);
        }}
      >
        {state === "busy" ? <Loader2 className="size-7 animate-spin text-harpoon" /> : <ImageUp className="size-7 text-harpoon" />}
        <span className="font-semibold">{t.hero.qrPick}</span>
        <span className="max-w-sm text-sm text-muted">{t.hero.qrHint}</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => handle(e.target.files?.[0])}
        />
      </label>
      {state === "none" && <p className="mt-3 text-sm text-warn" role="alert">{t.hero.qrNone}</p>}
      {state === "error" && <p className="mt-3 text-sm text-bad" role="alert">{t.hero.qrError}</p>}
      {decoded && (
        <p className="mt-3 text-sm text-muted">
          {t.hero.qrDecoded} <span className="font-mono break-all text-fg">{decoded}</span>
        </p>
      )}
    </div>
  );
}
