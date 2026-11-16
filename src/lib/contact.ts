// Contact form: validation and delivery by e-mail through Resend (https://resend.com).
// Nothing is stored; the message is forwarded to the operator and then gone.
import { z } from "zod";
import { OPERATOR } from "@/content/legal";

import { TOPICS } from "./contact-topics";

export { TOPICS };

export const ContactBody = z.object({
  topic: z.enum(TOPICS),
  name: z.string().trim().max(120).default(""),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(10).max(5000),
  /** The link or domain the message is about (wrong rating, listed domain), optional. */
  link: z.string().trim().max(2048).default(""),
  locale: z.enum(["de", "en"]).default("en"),
  /** Honeypot: hidden from people, filled in by bots. */
  website: z.string().max(0).optional(),
});
export type ContactMessage = z.infer<typeof ContactBody>;

const TOPIC_LABELS: Record<(typeof TOPICS)[number], string> = {
  general: "Allgemeine Frage",
  wrong_rating: "Falsch eingestuft",
  listed_domain: "Domain zu Unrecht gelistet",
  privacy: "Datenschutz",
  other: "Sonstiges",
};

export const contactEnabled = () => Boolean(process.env.RESEND_API_KEY);

/** The e-mail the operator receives; replying goes straight to the sender. */
export function contactMail(m: ContactMessage) {
  const lines = [
    `Thema: ${TOPIC_LABELS[m.topic]}`,
    `Von: ${m.name || "(kein Name)"} <${m.email}>`,
    `Sprache: ${m.locale}`,
    ...(m.link ? [`Link/Domain: ${m.link}`] : []),
    "",
    m.message,
  ];
  return {
    from: process.env.CONTACT_FROM ?? "Mailharpoon <onboarding@resend.dev>",
    to: [process.env.CONTACT_TO ?? OPERATOR.email],
    reply_to: m.email,
    subject: `[Mailharpoon] ${TOPIC_LABELS[m.topic]}${m.name ? ` – ${m.name}` : ""}`.slice(0, 200),
    text: lines.join("\n"),
  };
}

export async function sendContact(m: ContactMessage): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify(contactMail(m)),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  // Resend's reason (e.g. unverified recipient) goes to the server log; never the key or the message.
  if (!res?.ok) console.error("contact: resend failed", res?.status ?? "network", res ? (await res.text().catch(() => "")).slice(0, 300) : "");
  return Boolean(res?.ok);
}
