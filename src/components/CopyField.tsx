"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

/** A read-only value with a button that copies it to the clipboard. */
export function CopyField({ value, label, copied }: { value: string; label: string; copied: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex flex-col border border-line-strong bg-void sm:flex-row">
      <input
        readOnly
        value={value}
        aria-label={label}
        onFocus={(e) => e.target.select()}
        className="min-w-0 flex-1 bg-transparent px-4 py-3.5 font-mono text-[14px] text-fg outline-none"
      />
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard?.writeText(value).catch(() => {});
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        }}
        className="btn btn-primary shrink-0 justify-center max-sm:border-x-0 max-sm:border-b-0"
      >
        {done ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        {done ? copied : label}
      </button>
    </div>
  );
}
