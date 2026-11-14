"use client";

import clsx from "clsx";
import Link from "next/link";
import { useState } from "react";
import { Send } from "lucide-react";
import type { Dict, Locale } from "@/i18n";
import { fill } from "@/i18n";
import { TOPICS } from "@/lib/contact-topics";

type Status = { kind: "idle" | "sending" | "sent" } | { kind: "error"; code: keyof Dict["contact"]["errors"]; fields: string[] };

const field = "block w-full border border-line-strong bg-void px-3 py-2.5 text-[15px] text-fg caret-harpoon outline-none placeholder:text-dim focus:border-harpoon";

export function ContactForm({ t, locale, email }: { t: Dict["contact"]; locale: Locale; email: string }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>("general");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setStatus({ kind: "sending" });
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...data, locale }),
    }).catch(() => null);
    const json = await res?.json().catch(() => null);
    if (res?.ok) return setStatus({ kind: "sent" });
    const code = (json?.error as keyof Dict["contact"]["errors"]) ?? "send_failed";
    setStatus({ kind: "error", code: code in t.errors ? code : "send_failed", fields: json?.fields ?? [] });
  }

  if (status.kind === "sent") return <p className="border border-ok/50 bg-ok/10 p-5 text-[15px] text-fg" role="status">{t.sent}</p>;

  const bad = (name: string) => status.kind === "error" && status.fields.includes(name);
  const showLink = topic === "wrong_rating" || topic === "listed_domain";

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="c-topic" className="label">{t.topic}</label>
        <select id="c-topic" name="topic" value={topic} onChange={(e) => setTopic(e.target.value as (typeof TOPICS)[number])} className={clsx(field, "mt-2")}>
          {TOPICS.map((k) => (
            <option key={k} value={k}>{t.topics[k]}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="c-name" className="label">{t.name}</label>
          <input id="c-name" name="name" maxLength={120} autoComplete="name" className={clsx(field, "mt-2")} />
        </div>
        <div>
          <label htmlFor="c-email" className="label">{t.email}</label>
          <input id="c-email" name="email" type="email" required maxLength={254} autoComplete="email" aria-invalid={bad("email")} className={clsx(field, "mt-2", bad("email") && "border-bad")} />
          <p className="mt-1.5 text-xs text-dim">{t.emailHint}</p>
        </div>
      </div>
      {showLink && (
        <div>
          <label htmlFor="c-link" className="label">{t.link}</label>
          <input id="c-link" name="link" maxLength={2048} spellCheck={false} className={clsx(field, "mt-2 font-mono text-[14px]")} />
        </div>
      )}
      <div>
        <label htmlFor="c-message" className="label">{t.message}</label>
        <textarea id="c-message" name="message" required minLength={10} maxLength={5000} rows={7} placeholder={t.messagePlaceholder} aria-invalid={bad("message")} className={clsx(field, "mt-2 resize-y leading-relaxed", bad("message") && "border-bad")} />
      </div>
      {/* Honeypot: invisible to people and screen readers, bots fill it in. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="c-website">Website</label>
        <input id="c-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <p className="text-sm text-muted">
        {t.privacy.split("{link}")[0]}
        <Link href={`/${locale}/datenschutz`} className="text-harpoon hover:underline">{t.privacyLink}</Link>
        {t.privacy.split("{link}")[1]}
      </p>
      {status.kind === "error" && (
        <p className="border border-bad/50 bg-bad/10 p-4 text-sm text-fg" role="alert">{fill(t.errors[status.code], { email })}</p>
      )}
      <button type="submit" disabled={status.kind === "sending"} className="btn btn-primary">
        <Send className="size-4" aria-hidden /> {status.kind === "sending" ? t.sending : t.send}
      </button>
    </form>
  );
}
