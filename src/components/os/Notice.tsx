"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Dict, Locale } from "@/i18n";

const KEY = "mh-notice";

/** One-time privacy note in the style of a text-mode dialog. Nothing to consent to: the site sets no cookies. */
export function Notice({ n, locale }: { n: Dict["notice"]; locale: Locale }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      setOpen(!localStorage.getItem(KEY));
    } catch {}
  }, []);
  if (!open) return null;
  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
  };
  return (
    <div role="dialog" aria-labelledby="notice-title" className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl animate-rise">
      <div className="tui notice px-6 pt-8 pb-6 text-center font-mono text-[13px] leading-relaxed">
        <h2 id="notice-title" className="tui-title">
          {n.title}
        </h2>
        <p>{n.body}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-4">
          <button onClick={close} className="tui-btn tui-btn-primary" autoFocus>
            {n.ok}
          </button>
          <Link href={`/${locale}#faq`} onClick={close} className="tui-btn">
            {n.more}
          </Link>
        </div>
      </div>
    </div>
  );
}
