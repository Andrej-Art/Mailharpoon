import type { Locale } from "@/i18n";

export interface GuideSection {
  h2: string;
  body: string[];
  list?: string[];
}

export interface GuideContent {
  slug: string;
  title: string; // <title>, keyword first
  description: string;
  h1: string;
  intro: string;
  sections: GuideSection[];
}

export interface Guide {
  id: "spot" | "clicked" | "check" | "sms";
  updated: string;
  minutes: number;
  content: Record<Locale, GuideContent>;
}

export const GUIDES: Guide[] = [
  {
    id: "sms",
    updated: "2026-10-31",
    minutes: 4,
    content: {
      de: {
        slug: "betrugs-sms-erkennen",
        title: "Betrugs-SMS erkennen: Fake-SMS von DHL, Bank und „Hallo Mama“",
        description:
          "So erkennen Sie Fake-SMS und Betrugsnachrichten auf WhatsApp: die häufigsten Maschen mit Beispielen und was Sie tun sollten, wenn Sie bereits reagiert haben.",
        h1: "Betrugs-SMS erkennen: Die häufigsten Maschen im Überblick",
        intro:
          "Betrügerische SMS und Messenger-Nachrichten, auch Smishing genannt, gehören zu den verbreitetsten Betrugsformen. Sie sind kurz, wirken dringend und landen direkt auf dem Smartphone, wo Links schwerer zu prüfen sind. Die meisten folgen jedoch wenigen, gut erkennbaren Mustern.",
        sections: [
          {
            h2: "Die Paketgebühr",
            body: [
              "„Ihr Paket konnte nicht zugestellt werden. Bitte zahlen Sie 1,99 € Zollgebühr.“ Diese Nachricht gibt es im Namen von DHL, Hermes, DPD und der Post. Der kleine Betrag soll harmlos wirken. Tatsächlich werden auf der verlinkten Seite Ihre Kartendaten abgegriffen. Echte Paketdienste verlangen Gebühren nicht per SMS-Link.",
            ],
          },
          {
            h2: "Die angebliche Kontosperrung",
            body: [
              "„Ihr pushTAN-Verfahren läuft ab“ oder „Ihr Konto wurde eingeschränkt“: Solche Nachrichten imitieren Sparkassen, Volksbanken, PayPal oder Amazon. Banken fordern Sie niemals per SMS auf, Zugangsdaten oder TANs auf einer verlinkten Seite einzugeben.",
            ],
          },
          {
            h2: "„Hallo Mama, das ist meine neue Nummer“",
            body: [
              "Eine unbekannte Nummer gibt sich als Ihr Kind oder ein anderer Angehöriger aus. Nach kurzer Unterhaltung folgt die Bitte, dringend eine Rechnung zu bezahlen. Rufen Sie die Person in einem solchen Fall unter ihrer bisherigen Nummer an, bevor Sie Geld überweisen.",
            ],
          },
          {
            h2: "Weitergeleitete Bestätigungscodes",
            body: [
              "Sie erhalten einen Code per SMS und kurz darauf eine Nachricht mit der Bitte, ihn weiterzuleiten, angeblich wegen eines Versehens. Mit diesem Code übernehmen Betrüger Ihr WhatsApp- oder anderes Konto. Geben Sie Bestätigungscodes grundsätzlich niemals weiter.",
            ],
          },
          {
            h2: "Gewinne, Erstattungen und Sprachnachrichten",
            body: ["Weitere verbreitete Varianten sind:"],
            list: [
              "Angebliche Gewinne, für die nur eine kleine Versandgebühr anfällt",
              "Steuer- oder Krankenkassen-Erstattungen, für die Sie Ihre IBAN eingeben sollen",
              "Angebliche Sprachnachrichten oder Fotos, die über einen Link abgerufen werden sollen",
              "Anrufe in Abwesenheit mit der Bitte, eine teure Nummer zurückzurufen",
            ],
          },
          {
            h2: "So prüfen Sie eine verdächtige SMS",
            body: [
              "Tippen Sie nicht auf den Link. Halten Sie die Nachricht gedrückt, kopieren Sie den Text und fügen Sie ihn in Mailharpoon unter „Nachricht prüfen“ ein. Wir analysieren den Inhalt und prüfen den enthaltenen Link, ohne dass Sie ihn öffnen müssen.",
              "Haben Sie bereits Daten eingegeben oder Geld überwiesen, kontaktieren Sie umgehend Ihre Bank und folgen Sie unserem Ratgeber für den Ernstfall.",
            ],
          },
        ],
      },
      en: {
        slug: "how-to-spot-a-scam-text",
        title: "Is This Text a Scam? How to Spot Fake SMS and Messages",
        description:
          "How to recognise scam texts and fake messenger messages: the most common schemes with examples, and what to do if you have already responded.",
        h1: "Is this text a scam? The most common schemes",
        intro:
          "Fraudulent text and messenger messages, also known as smishing, are among the most widespread forms of fraud. They are short, urgent and arrive directly on your phone, where links are harder to check. Most of them, however, follow a small number of recognisable patterns.",
        sections: [
          {
            h2: "The parcel fee",
            body: [
              "\"Your parcel could not be delivered. Please pay a customs fee of $1.99.\" This message circulates in the name of postal and delivery services. The small amount is meant to seem harmless, but the linked page collects your card details. Genuine delivery services do not request fees via a text message link.",
            ],
          },
          {
            h2: "The supposed account suspension",
            body: [
              "\"Your account has been restricted\" or \"Unusual sign-in detected\": such messages imitate banks, PayPal or Amazon. Banks never ask you by text message to enter login details or one-time codes on a linked page.",
            ],
          },
          {
            h2: "\"Hi Mum, this is my new number\"",
            body: [
              "An unknown number poses as your child or another relative. After a short exchange comes a request to pay an urgent bill. In this situation, call the person on their old number before transferring any money.",
            ],
          },
          {
            h2: "Forwarded verification codes",
            body: [
              "You receive a code by text, followed shortly by a message asking you to forward it, supposedly because it was sent by mistake. Attackers use this code to take over your WhatsApp or other accounts. Never share verification codes.",
            ],
          },
          {
            h2: "Prizes, refunds and voice messages",
            body: ["Other common variants include:"],
            list: [
              "Supposed prizes that only require a small shipping fee",
              "Tax or insurance refunds for which you are asked to enter your bank details",
              "Supposed voice messages or photos to be accessed via a link",
              "Missed calls asking you to call back an expensive premium number",
            ],
          },
          {
            h2: "How to check a suspicious text",
            body: [
              "Do not tap the link. Press and hold the message, copy the text and paste it into Mailharpoon under \"Check message\". We analyse the content and check the link it contains without you having to open it.",
              "If you have already entered data or sent money, contact your bank immediately and follow our guide for what to do next.",
            ],
          },
        ],
      },
    },
  },
  {
    id: "check",
    updated: "2026-10-30",
    minutes: 4,
    content: {
      de: {
        slug: "link-auf-sicherheit-pruefen",
        title: "Link auf Sicherheit prüfen: So erkennen Sie gefährliche URLs",
        description:
          "So überprüfen Sie einen Link, bevor Sie ihn öffnen: fünf einfache Prüfschritte ohne Fachkenntnisse und ein kostenloser Link-Checker für Zweifelsfälle.",
        h1: "Link auf Sicherheit prüfen, bevor Sie klicken",
        intro:
          "Ein Klick ist schnell erfolgt, und gerade auf dem Smartphone ist das tatsächliche Ziel eines Links oft nicht erkennbar. Mit wenigen Prüfschritten lässt sich das zuverlässig feststellen, ohne technisches Vorwissen und ohne den Link zu öffnen.",
        sections: [
          {
            h2: "1. Die tatsächliche Adresse prüfen",
            body: [
              "Der angezeigte Text eines Links und sein Ziel können vollständig voneinander abweichen. Am Computer bewegen Sie den Mauszeiger über den Link, ohne zu klicken, und lesen die Adresse in der unteren Ecke des Browsers ab. Auf dem Smartphone halten Sie den Link gedrückt, bis eine Vorschau erscheint.",
              "Entscheidend ist der Teil unmittelbar vor dem ersten einzelnen Schrägstrich. Bei https://login.paypal.com.konto-check.net/start lautet die Domain konto-check.net. Mit PayPal hat diese Adresse nichts zu tun, auch wenn der Name am Anfang steht.",
            ],
          },
          {
            h2: "2. Auf Tippfehler und ähnliche Zeichen achten",
            body: [
              "Betrüger registrieren Domains, die bekannten Namen zum Verwechseln ähneln. Aus amazon wird arnazon, aus paypal wird paypa1. Teilweise kommen auch Buchstaben aus dem kyrillischen Alphabet zum Einsatz, die lateinischen Buchstaben exakt gleichen.",
            ],
            list: ["rn anstelle von m", "0 anstelle von o, 1 anstelle von l", "Zusätzliche Bindestriche wie in amazon-sicherheit.de", "Ungewöhnliche Endungen wie .top, .xyz oder .help in Verbindung mit bekannten Marken"],
          },
          {
            h2: "3. Kurzlinks und QR-Codes nicht ungeprüft öffnen",
            body: [
              "Ein gekürzter Link wie bit.ly/abc123 lässt nicht erkennen, wohin er führt. Gleiches gilt für QR-Codes auf Briefen, Parkautomaten oder Werbezetteln. Lassen Sie solche Links vorab prüfen. Mailharpoon verfolgt alle Weiterleitungen und zeigt Ihnen das endgültige Ziel.",
            ],
          },
          {
            h2: "4. Das Schloss-Symbol ist kein Echtheitsnachweis",
            body: [
              "Lange galt das Schloss-Symbol im Browser als Zeichen einer vertrauenswürdigen Seite. Heute erhält jede Website innerhalb von Sekunden ein kostenloses Zertifikat, auch betrügerische. Das Symbol bestätigt lediglich, dass die Verbindung verschlüsselt ist. Über den Betreiber der Seite sagt es nichts aus.",
            ],
          },
          {
            h2: "5. Im Zweifel einen Link-Checker verwenden",
            body: [
              "Ein Link-Checker wie Mailharpoon öffnet die Seite für Sie in einer geschützten Umgebung. Er prüft, ob die Adresse bereits als Phishing gemeldet wurde, wie alt die Domain ist, ob sie eine bekannte Marke nachahmt und ob die Seite Passwörter oder Kartendaten abfragt. Das Ergebnis erhalten Sie in verständlicher Form, in der Regel nach weniger als fünf Sekunden.",
              "Der sicherste Weg bleibt dennoch der direkte: Geben Sie die Adresse Ihrer Bank oder Ihres Onlineshops selbst ein, anstatt einem Link aus einer Nachricht zu folgen.",
            ],
          },
        ],
      },
      en: {
        slug: "how-to-check-if-a-link-is-safe",
        title: "How to Check if a Link Is Safe Before You Click",
        description:
          "Five straightforward ways to check whether a link is safe without opening it, plus a free link checker for cases of doubt.",
        h1: "How to check whether a link is safe",
        intro:
          "A click happens quickly, and on a smartphone the actual destination of a link is often not visible. A few simple checks are enough to find out reliably, without technical knowledge and without opening the link.",
        sections: [
          {
            h2: "1. Check the actual address",
            body: [
              "The visible text of a link and its destination can differ completely. On a computer, move the cursor over the link without clicking and read the address in the bottom corner of your browser. On a smartphone, press and hold the link until a preview appears.",
              "The relevant part is the one directly before the first single slash. In https://login.paypal.com.account-check.net/start the domain is account-check.net. This address has nothing to do with PayPal, even though the name appears at the beginning.",
            ],
          },
          {
            h2: "2. Look for typos and similar characters",
            body: [
              "Attackers register domains that closely resemble well-known names. amazon becomes arnazon and paypal becomes paypa1. Some even use letters from the Cyrillic alphabet that look identical to Latin ones.",
            ],
            list: ["rn instead of m", "0 instead of o, 1 instead of l", "Additional hyphens, as in amazon-security-check.com", "Unusual endings such as .top, .xyz or .help combined with well-known brands"],
          },
          {
            h2: "3. Do not open short links or QR codes unchecked",
            body: [
              "A shortened link such as bit.ly/abc123 does not reveal where it leads. The same applies to QR codes on letters, parking meters or flyers. Have such links checked first. Mailharpoon follows every redirect and shows you the final destination.",
            ],
          },
          {
            h2: "4. The padlock is not proof of authenticity",
            body: [
              "For a long time the padlock in the browser was considered a sign of a trustworthy site. Today any website can obtain a free certificate within seconds, including fraudulent ones. The padlock only confirms that the connection is encrypted. It says nothing about who operates the site.",
            ],
          },
          {
            h2: "5. If in doubt, use a link checker",
            body: [
              "A link checker such as Mailharpoon opens the page for you in an isolated environment. It checks whether the address has been reported as phishing, how old the domain is, whether it imitates a well-known brand and whether the page requests passwords or card details. You receive the result in clear terms, usually in less than five seconds.",
              "The safest approach, however, remains the direct one: enter the address of your bank or online shop yourself rather than following a link from a message.",
            ],
          },
        ],
      },
    },
  },
  {
    id: "spot",
    updated: "2026-10-30",
    minutes: 5,
    content: {
      de: {
        slug: "phishing-mail-erkennen",
        title: "Phishing-Mail erkennen: 9 Warnsignale im Überblick",
        description:
          "Woran Sie eine Phishing-Mail erkennen: neun typische Warnsignale mit Beispielen von PayPal, Amazon, DHL und Banken sowie das richtige Vorgehen bei einem Verdacht.",
        h1: "Phishing-Mail erkennen: die 9 wichtigsten Warnsignale",
        intro:
          "Phishing-Mails sind heute häufig professionell gestaltet. Logo, Farben und Tonfall wirken authentisch. Dennoch verraten sie sich fast immer durch dieselben Details. Wer diese neun Warnsignale kennt, kann betrügerische Nachrichten zuverlässig erkennen.",
        sections: [
          {
            h2: "1. Der Absender passt nicht zum Unternehmen",
            body: [
              "Prüfen Sie die tatsächliche Absenderadresse und nicht nur den angezeigten Namen. Hinter „PayPal Service“ kann sich service@paypal-hilfe24.com verbergen. Echte Nachrichten von PayPal stammen von @paypal.de oder @paypal.com.",
            ],
          },
          {
            h2: "2. Es wird Zeitdruck aufgebaut",
            body: [
              "Formulierungen wie „Ihr Konto wird in 24 Stunden gesperrt“ oder „Letzte Mahnung“ sind typisch. Sie sollen zu schnellem Handeln verleiten und eine sorgfältige Prüfung verhindern. Seriöse Unternehmen setzen per E-Mail nur selten derart knappe Fristen.",
            ],
          },
          {
            h2: "3. Die Anrede ist unpersönlich",
            body: [
              "Eine Anrede wie „Sehr geehrter Kunde“ oder das Fehlen jeder Anrede ist ein Warnsignal, wenn das Unternehmen Ihren Namen kennt. Da Betrüger inzwischen teilweise auch Namen einsetzen, ist dieses Merkmal allein jedoch kein sicherer Nachweis.",
            ],
          },
          {
            h2: "4. Sie werden zur Anmeldung über einen Link aufgefordert",
            body: [
              "Dies ist der Kern nahezu jeder Phishing-Mail. Der Link führt zu einer nachgebauten Anmeldeseite, die eingegebene Daten unmittelbar an die Täter weiterleitet. Prüfen Sie den Link vorab mit Mailharpoon oder rufen Sie die Website selbst über die Adresszeile auf.",
            ],
          },
          {
            h2: "5. Der Link führt auf eine fremde Domain",
            body: [
              "Bewegen Sie den Mauszeiger über die Schaltfläche, ohne zu klicken. Erscheint dort eine Adresse wie amazon-konto-pruefung.top anstelle von amazon.de, ist die Nachricht eindeutig betrügerisch.",
            ],
          },
          {
            h2: "6. Es geht um Geld, Pakete oder Kontosperrungen",
            body: [
              "Die verbreitetsten Maschen betreffen gesperrte Konten, angeblich fehlgeschlagene Zahlungen, Pakete mit offenen Zollgebühren oder Steuererstattungen. Besonders häufig werden DHL, Amazon, PayPal, Sparkassen und Netflix nachgeahmt.",
            ],
          },
          {
            h2: "7. Die Nachricht enthält einen unerwarteten Anhang",
            body: [
              "Rechnungen im ZIP-Format, Office-Dokumente mit der Aufforderung, „Inhalte zu aktivieren“, oder PDF-Dateien mit einem Link zum „Dokument ansehen“ sind verbreitete Fallen. Öffnen Sie Anhänge nur, wenn Sie diese erwartet haben.",
            ],
          },
          {
            h2: "8. Sprache und Gestaltung wirken ungewöhnlich",
            body: [
              "Ungewöhnliche Formulierungen und fehlerhafte Umlaute waren lange das wichtigste Erkennungsmerkmal. Durch maschinelle Übersetzung sind viele Phishing-Mails inzwischen fehlerfrei. Fehler sind daher ein Warnsignal, eine fehlerfreie Nachricht ist jedoch keine Entwarnung.",
            ],
          },
          {
            h2: "9. Es werden Daten abgefragt, die dem Unternehmen bereits vorliegen",
            body: [
              "Keine Bank fordert per E-Mail Ihre PIN, eine TAN oder Ihr vollständiges Passwort an. Verlangt eine Nachricht genau diese Angaben, handelt es sich um einen Betrugsversuch.",
            ],
          },
          {
            h2: "Vorgehen bei einem Verdacht",
            body: ["Wenn Ihnen eine E-Mail verdächtig erscheint, empfehlen wir folgendes Vorgehen:"],
            list: [
              "Keine Links anklicken und keine Anhänge öffnen",
              "Den Link bei Bedarf mit Mailharpoon prüfen",
              "Die Nachricht im E-Mail-Programm als Phishing oder Spam melden",
              "Bei Unsicherheit das Unternehmen über die offizielle Website oder Telefonnummer kontaktieren",
              "Die Nachricht anschließend löschen",
            ],
          },
        ],
      },
      en: {
        slug: "how-to-spot-a-phishing-email",
        title: "Is This Email a Scam? 9 Warning Signs of Phishing Emails",
        description:
          "Nine typical warning signs of a phishing email, with examples involving PayPal, Amazon, delivery services and banks, and how to respond if you are suspicious.",
        h1: "How to spot a phishing email: the 9 key warning signs",
        intro:
          "Phishing emails are often professionally designed today. The logo, colours and tone appear authentic. Nevertheless, they almost always give themselves away through the same details. Knowing these nine warning signs allows you to identify fraudulent messages reliably.",
        sections: [
          {
            h2: "1. The sender does not match the company",
            body: [
              "Check the actual sender address, not just the display name. \"PayPal Service\" may conceal service@paypal-help24.com. Genuine PayPal emails come from @paypal.com.",
            ],
          },
          {
            h2: "2. Time pressure is applied",
            body: [
              "Phrases such as \"Your account will be suspended in 24 hours\" or \"Final notice\" are typical. They are intended to prompt hasty action and prevent careful consideration. Reputable companies rarely set such short deadlines by email.",
            ],
          },
          {
            h2: "3. The greeting is impersonal",
            body: [
              "A greeting such as \"Dear customer\", or no greeting at all, is a warning sign when the company knows your name. As attackers increasingly insert names as well, this characteristic alone is not conclusive.",
            ],
          },
          {
            h2: "4. You are asked to sign in via a link",
            body: [
              "This is the core of nearly every phishing email. The link leads to a replica login page that forwards entered data directly to the attackers. Check the link with Mailharpoon first, or open the website yourself via the address bar.",
            ],
          },
          {
            h2: "5. The link leads to an unfamiliar domain",
            body: [
              "Move the cursor over the button without clicking. If an address such as amazon-account-review.top appears instead of amazon.com, the message is clearly fraudulent.",
            ],
          },
          {
            h2: "6. The topic is money, parcels or account suspensions",
            body: [
              "The most common schemes involve suspended accounts, supposedly failed payments, parcels with outstanding customs fees or tax refunds. PayPal, Amazon, Netflix, delivery services and banks are imitated particularly often.",
            ],
          },
          {
            h2: "7. The message contains an unexpected attachment",
            body: [
              "Invoices in ZIP format, Office documents asking you to \"enable content\" or PDF files with a \"view document\" link are common traps. Only open attachments you were expecting.",
            ],
          },
          {
            h2: "8. Language or layout appears unusual",
            body: [
              "Unusual wording was long the most reliable indicator. Thanks to machine translation, many phishing emails are now free of errors. Mistakes are therefore a warning sign, but an error-free message is no reason to relax.",
            ],
          },
          {
            h2: "9. You are asked for information the company already has",
            body: [
              "No bank will ask for your PIN, a one-time code or your full password by email. If a message requests exactly these details, it is a fraud attempt.",
            ],
          },
          {
            h2: "How to respond if you are suspicious",
            body: ["If an email appears suspicious, we recommend the following steps:"],
            list: [
              "Do not click any links or open attachments",
              "Check the link with Mailharpoon if necessary",
              "Report the message as phishing or spam in your email client",
              "If in doubt, contact the company via its official website or telephone number",
              "Delete the message afterwards",
            ],
          },
        ],
      },
    },
  },
  {
    id: "clicked",
    updated: "2026-10-30",
    minutes: 4,
    content: {
      de: {
        slug: "phishing-link-angeklickt",
        title: "Phishing-Link angeklickt oder Mail geöffnet? Das ist jetzt zu tun",
        description:
          "Sie haben auf einen Phishing-Link geklickt? Diese Schritte helfen sofort, abhängig davon, ob Sie nur geklickt, ein Passwort eingegeben oder Bankdaten preisgegeben haben.",
        h1: "Phishing-Link angeklickt: Das sollten Sie jetzt tun",
        intro:
          "Ein solcher Fehler kann auch erfahrenen Nutzern unterlaufen. In den meisten Fällen lässt sich ein Schaden verhindern, wenn Sie jetzt besonnen und zügig handeln. Welche Schritte erforderlich sind, hängt davon ab, wie weit Sie gekommen sind.",
        sections: [
          {
            h2: "Sie haben die E-Mail nur geöffnet",
            body: [
              "Das Öffnen einer Phishing-Mail ist in aller Regel unbedenklich, da aktuelle E-Mail-Programme keine gefährlichen Inhalte automatisch laden. Löschen Sie die Nachricht und melden Sie sie als Phishing. Weitere Schritte sind nicht erforderlich.",
            ],
          },
          {
            h2: "Sie haben den Link angeklickt, aber nichts eingegeben",
            body: [
              "Auch in diesem Fall entsteht meist kein Schaden. Schließen Sie die Seite. Wurde ein Download gestartet, öffnen Sie die Datei nicht und löschen Sie sie. Führen Sie zur Sicherheit einen Virenscan durch und halten Sie Browser und Betriebssystem auf dem aktuellen Stand.",
            ],
          },
          {
            h2: "Sie haben ein Passwort eingegeben",
            body: ["In diesem Fall ist schnelles Handeln entscheidend:"],
            list: [
              "Ändern Sie das Passwort umgehend auf der echten Website und geben Sie die Adresse dafür selbst ein.",
              "Ändern Sie es auch bei allen anderen Diensten, bei denen Sie dasselbe Passwort verwenden.",
              "Aktivieren Sie die Zwei-Faktor-Anmeldung, sofern noch nicht geschehen.",
              "Prüfen Sie in den Kontoeinstellungen, ob neue Geräte, Weiterleitungen oder fremde E-Mail-Adressen hinterlegt wurden.",
              "Handelt es sich um Ihr E-Mail-Konto, kontrollieren Sie zusätzlich die Regeln für automatische Weiterleitungen.",
            ],
          },
          {
            h2: "Sie haben Bank- oder Kartendaten eingegeben",
            body: [
              "Kontaktieren Sie sofort Ihre Bank. Karten und Online-Banking lassen sich in Deutschland rund um die Uhr über den Sperr-Notruf 116 116 sperren. Prüfen Sie Ihre Kontoauszüge in den folgenden Wochen sorgfältig und widersprechen Sie unbekannten Abbuchungen.",
            ],
          },
          {
            h2: "Sie haben eine App oder Datei installiert",
            body: [
              "Trennen Sie das Gerät vom Internet, deinstallieren Sie die App und führen Sie einen Virenscan durch. Bei Smartphones ist im Zweifel das Zurücksetzen auf die Werkseinstellungen die sicherste Lösung. Ändern Sie anschließend Ihre wichtigsten Passwörter über ein anderes, nicht betroffenes Gerät.",
            ],
          },
          {
            h2: "Vorfall melden und Anzeige erstatten",
            body: [
              "Melden Sie die Nachricht in Ihrem E-Mail-Programm als Phishing und informieren Sie das betroffene Unternehmen. Ist Ihnen ein finanzieller Schaden entstanden, erstatten Sie Anzeige bei der Polizei. In vielen Bundesländern ist dies online möglich. Die Verbraucherzentrale sammelt Phishing-Mails im Phishing-Radar und warnt damit andere Verbraucher.",
            ],
          },
          {
            h2: "Links künftig vorab prüfen",
            body: [
              "Erscheint Ihnen ein Link verdächtig, kopieren Sie ihn und prüfen Sie ihn mit Mailharpoon, bevor Sie ihn öffnen. Die Prüfung dauert nur wenige Sekunden.",
            ],
          },
        ],
      },
      en: {
        slug: "clicked-a-phishing-link",
        title: "Clicked a Phishing Link? What to Do Next",
        description:
          "Clicked a phishing link? These steps help immediately, depending on whether you only clicked, entered a password or disclosed bank details.",
        h1: "Clicked a phishing link? What to do next",
        intro:
          "This can happen to experienced users as well. In most cases, damage can be prevented if you act calmly and promptly. The steps required depend on how far you went.",
        sections: [
          {
            h2: "You only opened the email",
            body: [
              "Opening a phishing email is generally harmless, as current email clients do not load dangerous content automatically. Delete the message and report it as phishing. No further action is required.",
            ],
          },
          {
            h2: "You clicked the link but did not enter anything",
            body: [
              "In this case there is usually no damage either. Close the page. If a download started, do not open the file and delete it. Run a virus scan as a precaution and keep your browser and operating system up to date.",
            ],
          },
          {
            h2: "You entered a password",
            body: ["In this case, acting quickly is essential:"],
            list: [
              "Change the password immediately on the genuine website, typing the address yourself.",
              "Change it for every other service where you use the same password.",
              "Enable two-factor authentication if you have not already done so.",
              "Check your account settings for new devices, forwarding rules or unfamiliar email addresses.",
              "If it was your email account, also review the rules for automatic forwarding.",
            ],
          },
          {
            h2: "You entered bank or card details",
            body: [
              "Contact your bank immediately and ask for your card and online banking access to be blocked. Review your statements carefully over the following weeks and dispute any unfamiliar transactions.",
            ],
          },
          {
            h2: "You installed an app or file",
            body: [
              "Disconnect the device from the internet, uninstall the app and run a virus scan. On smartphones, a factory reset is the safest solution if in doubt. Then change your most important passwords from a different, unaffected device.",
            ],
          },
          {
            h2: "Report the incident",
            body: [
              "Report the message as phishing in your email client and inform the company being impersonated. If you suffered a financial loss, report it to the police. In the United States you can also file a report at reportfraud.ftc.gov, and in the United Kingdom with Action Fraud.",
            ],
          },
          {
            h2: "Check links in advance from now on",
            body: ["If a link seems suspicious, copy it and check it with Mailharpoon before opening it. The check takes only a few seconds."],
          },
        ],
      },
    },
  },
];

export const guideBySlug = (locale: Locale, slug: string) => GUIDES.find((g) => g.content[locale].slug === slug);
export const guidePath = (locale: Locale, g: Guide) => `/${locale}/${g.content[locale].slug}`;
