import { describe, expect, it } from "vitest";
import { ContactBody, contactMail } from "@/lib/contact";

const valid = { topic: "wrong_rating", email: "leser@example.de", message: "Meine Seite wird als gefährlich angezeigt.", link: "https://example.de", locale: "de" };

describe("contact form", () => {
  it("accepts a normal message and builds a mail the operator can answer directly", () => {
    const m = ContactBody.parse(valid);
    const mail = contactMail(m);
    expect(mail.reply_to).toBe("leser@example.de");
    expect(mail.subject).toContain("Falsch eingestuft");
    expect(mail.text).toContain("Link/Domain: https://example.de");
    expect(mail.text).toContain("Meine Seite wird als gefährlich angezeigt.");
  });

  it("rejects a missing address, a too short message and an unknown topic", () => {
    expect(ContactBody.safeParse({ ...valid, email: "" }).success).toBe(false);
    expect(ContactBody.safeParse({ ...valid, message: "kurz" }).success).toBe(false);
    expect(ContactBody.safeParse({ ...valid, topic: "spam" }).success).toBe(false);
  });

  it("rejects a filled honeypot", () => {
    const r = ContactBody.safeParse({ ...valid, website: "http://spam.example" });
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.path[0] === "website")).toBe(true);
  });
});
