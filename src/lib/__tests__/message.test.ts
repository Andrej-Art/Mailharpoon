import { describe, expect, it } from "vitest";
import { analyzeMessageContent, analyzeSender } from "@/lib/analyzers/message";
import { extractUrls, parseMessage } from "@/lib/text/parse";
import { redact } from "@/lib/text/redact";

const ids = (text: string) => analyzeMessageContent(parseMessage(text)).signals.map((s) => s.id);

const RAW_EMAIL = `Received: from mail.example.net
Authentication-Results: mx.google.com; spf=fail smtp.mailfrom=paypal-service.top; dkim=none; dmarc=fail header.from=paypal.de
From: "PayPal Service" <service@paypal-service.top>
Reply-To: support@mailbox-help.ru
Subject: =?utf-8?B?SWhyIEtvbnRvIHd1cmRlIGVpbmdlc2NocsOkbmt0?=
Date: Fri, 31 Oct 2026 09:12:00 +0100
Content-Type: text/html; charset=utf-8

<html><body><p>Sehr geehrter Kunde,</p><p>bitte bestätigen Sie Ihre Daten:
<a href="https://paypal-login.top/verify">https://www.paypal.de/signin</a></p></body></html>`;

describe("message parsing", () => {
  it("parses a raw email with headers, encoded subject, auth results and HTML links", () => {
    const m = parseMessage(RAW_EMAIL);
    expect(m.kind).toBe("email");
    expect(m.subject).toBe("Ihr Konto wurde eingeschränkt");
    expect(m.from).toMatchObject({ name: "PayPal Service", domain: "paypal-service.top" });
    expect(m.replyTo?.domain).toBe("mailbox-help.ru");
    expect(m.auth).toMatchObject({ spf: "fail", dmarc: "fail" });
    expect(m.links[0]).toMatchObject({ url: "https://paypal-login.top/verify", text: "https://www.paypal.de/signin" });
  });

  it("extracts normal, defanged and bare-domain links but not email addresses", () => {
    const urls = extractUrls("Zahlen Sie hier: hxxps://paket-gebuehr[.]top/de oder dhl-zoll.info/abc. Fragen an max@firma.de");
    expect(urls).toContain("https://paket-gebuehr.top/de");
    expect(urls).toContain("http://dhl-zoll.info/abc");
    expect(urls.some((u) => u.includes("firma.de"))).toBe(false);
  });

  it("redacts personal data before it is sent to the AI layer", () => {
    const out = redact("IBAN DE89 3704 0044 0532 0130 00, Mail max.mustermann@web.de, Tel +49 151 23456789, Karte 4111 1111 1111 1111");
    expect(out).not.toMatch(/3704|mustermann|23456789|4111/);
    expect(out).toContain("[IBAN]");
    expect(out).toContain("[E-MAIL]");
  });
});

describe("content analysis", () => {
  it.each([
    ["Hallo Mama, das ist meine neue Nummer, mein Handy ist kaputt.", "msg_family_new_number"],
    ["Ihr Paket wartet. Zahlen Sie die Zollgebühr von 1,99 €.", "msg_parcel_fee"],
    ["Kaufen Sie bitte fünf Google-Play-Karten und schicken Sie mir die Codes.", "msg_gift_cards"],
    ["Ihr Computer ist infiziert! Rufen Sie sofort den Support an: 0800 123 4567", "msg_tech_support"],
    ["You have won a prize! Claim now.", "msg_prize"],
  ])("detects %s", (text, id) => {
    expect(ids(text)).toContain(id);
  });

  it("treats a call-back request without a phone number as harmless", () => {
    expect(ids("Bei Fragen rufen Sie mich gern an. Viele Grüße")).not.toContain("msg_callback");
  });

  it("gives ordinary messages without any request a trust signal", () => {
    expect(ids("Kannst du auf dem Heimweg noch Milch und Brot mitbringen? Danke!")).toEqual(["msg_no_call_to_action"]);
  });

  it("flags HTML links whose visible text shows a different domain", () => {
    expect(ids(RAW_EMAIL)).toContain("msg_link_text_mismatch");
  });
});

describe("sender analysis", () => {
  it("flags failed DMARC, reply-to mismatch and display-name spoofing", () => {
    const m = parseMessage(RAW_EMAIL);
    const sigs = analyzeSender(m, [])!.signals.map((s) => s.id);
    expect(sigs).toEqual(expect.arrayContaining(["sender_dmarc_fail", "sender_reply_to_mismatch", "sender_display_spoof"]));
  });
});
