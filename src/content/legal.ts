// Legal notice (Impressum, § 5 DDG and § 18 Abs. 2 MStV) and privacy policy (Art. 13 GDPR).
// The operator's details are kept in one place below. The privacy policy describes the data flows
// of the code as of November 2026: when a new external service is added, add it here as well.

/** Operator details. Fill in before publishing; the pages refuse to build with placeholders left. */
export const OPERATOR = {
  name: "‹Vorname Nachname›",
  street: "‹Straße Hausnummer›",
  city: "‹PLZ Ort›",
  country: "Deutschland",
  email: "‹kontakt@example.de›",
  /** A second fast way to reach the operator besides e-mail (phone number), or empty when e-mail only. */
  phone: "",
  /** Data protection authority of the operator's federal state. */
  authority: {
    name: "‹Landesbeauftragte/r für Datenschutz›",
    url: "‹https://…›",
  },
  updated: "2026-11-14",
};

export const hasPlaceholders = () => JSON.stringify(OPERATOR).includes("‹");

/** The legal pages go live only once the operator details are filled in; locally they always show. */
export const legalPagesLive = () => !hasPlaceholders() || process.env.VERCEL_ENV !== "production";

export interface LegalSection {
  h: string;
  p?: string[];
  list?: string[];
  /** Paragraphs after the list. */
  after?: string[];
}

const address = () => [OPERATOR.name, OPERATOR.street, OPERATOR.city].join("\n");

export function legalNotice(locale: "de" | "en"): { title: string; lead: string; sections: LegalSection[] } {
  const contact = [`E-Mail: ${OPERATOR.email}`, ...(OPERATOR.phone ? [`${locale === "de" ? "Telefon" : "Phone"}: ${OPERATOR.phone}`] : [])];
  if (locale === "de")
    return {
      title: "Impressum",
      lead: "Mailharpoon ist ein privates, nicht kommerzielles Projekt. Es gibt keine Werbung, keine Bezahlangebote und keine Nutzerkonten.",
      sections: [
        { h: "Angaben gemäß § 5 DDG", p: [address()] },
        { h: "Kontakt", p: contact },
        { h: "Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV", p: [address()] },
        {
          h: "Hinweis zu den Bewertungen",
          p: [
            "Mailharpoon bewertet Links und Nachrichten automatisch. Das Ergebnis ist eine Einschätzung und keine Garantie. Für Entscheidungen, die auf Grundlage einer Bewertung getroffen werden, übernehmen wir keine Haftung.",
            "Die Liste der Domains, die gerade im Umlauf sind, entsteht ebenfalls automatisch: aus Prüfungen auf Mailharpoon und aus öffentlichen Warnlisten. Wenn Ihre Domain dort zu Unrecht erscheint, schreiben Sie uns bitte. Wir prüfen den Fall und entfernen den Eintrag, wenn er falsch ist.",
          ],
        },
        {
          h: "Haftung für Inhalte und Links",
          p: [
            "Die Inhalte dieser Seiten wurden mit Sorgfalt erstellt. Für Richtigkeit, Vollständigkeit und Aktualität können wir jedoch keine Gewähr übernehmen.",
            "Diese Website enthält Links zu externen Websites, auf deren Inhalte wir keinen Einfluss haben. Für diese Inhalte ist stets der jeweilige Anbieter verantwortlich. Bei Bekanntwerden von Rechtsverletzungen entfernen wir solche Links umgehend.",
            "Die Zusammenfassungen unter „Aktuelles“ fassen Meldungen der genannten Quellen in eigenen Worten zusammen und verlinken auf das Original.",
          ],
        },
        {
          h: "Quellcode",
          p: ["Der Quellcode von Mailharpoon steht unter der MIT-Lizenz und ist auf GitHub öffentlich einsehbar: https://github.com/Andrej-Art/Mailharpoon"],
        },
      ],
    };
  return {
    title: "Legal notice",
    lead: "Mailharpoon is a private, non-commercial project. There are no ads, no paid offers and no user accounts.",
    sections: [
      { h: "Information pursuant to § 5 DDG (German Digital Services Act)", p: [address() + `\n${OPERATOR.country === "Deutschland" ? "Germany" : OPERATOR.country}`] },
      { h: "Contact", p: contact },
      { h: "Responsible for content pursuant to § 18 (2) MStV", p: [address()] },
      {
        h: "About the ratings",
        p: [
          "Mailharpoon rates links and messages automatically. The result is an assessment, not a guarantee. We accept no liability for decisions made on the basis of a rating.",
          "The list of domains currently in circulation is also generated automatically, from checks on Mailharpoon and from public warning lists. If your domain appears there wrongly, please write to us. We will review the case and remove the entry if it is wrong.",
        ],
      },
      {
        h: "Liability for content and links",
        p: [
          "The content of these pages was created with care. We cannot, however, guarantee that it is correct, complete and up to date.",
          "This website links to external websites whose content we cannot influence. The respective provider is always responsible for that content. If we become aware of a legal violation, we remove such links immediately.",
          "The summaries under “News” summarise reports from the named sources in our own words and link to the original.",
        ],
      },
      { h: "Source code", p: ["Mailharpoon's source code is published under the MIT licence on GitHub: https://github.com/Andrej-Art/Mailharpoon"] },
    ],
  };
}

export function privacyPolicy(locale: "de" | "en"): { title: string; lead: string; updated: string; sections: LegalSection[] } {
  const a = OPERATOR.authority;
  if (locale === "de")
    return {
      title: "Datenschutzerklärung",
      lead: "Mailharpoon braucht keine Anmeldung, setzt kein Tracking und keine Werbung ein und speichert die geprüften Links und Nachrichten nicht. Hier steht genau, welche Daten bei der Nutzung trotzdem verarbeitet werden, von wem und warum.",
      updated: "Stand: 14. November 2026",
      sections: [
        { h: "1. Verantwortlicher", p: [`${address()}\nE-Mail: ${OPERATOR.email}`, "Einen Datenschutzbeauftragten gibt es nicht, weil keine Pflicht dazu besteht. Fragen zum Datenschutz richten Sie bitte an die oben genannte Adresse."] },
        {
          h: "2. Hosting und Server-Protokolle",
          p: [
            "Die Website läuft bei Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA. Beim Aufruf jeder Seite verarbeitet Vercel technisch notwendige Daten: IP-Adresse, Zeitpunkt, aufgerufene Adresse, Browser-Kennung (User-Agent) und Referrer. Das ist nötig, um die Seite auszuliefern und gegen Angriffe zu schützen.",
            "Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem sicheren, funktionierenden Angebot). Vercel ist unter dem EU-US Data Privacy Framework zertifiziert. Mit Vercel besteht ein Vertrag über die Auftragsverarbeitung. Die Protokolle werden von Vercel nach kurzer Zeit gelöscht.",
          ],
        },
        {
          h: "3. Prüfung von Links, Nachrichten und Screenshots",
          p: [
            "Wenn Sie einen Link, eine Nachricht oder einen Screenshot prüfen lassen, wird der Inhalt an unseren Server übertragen und dort ausgewertet. Für Links ruft unser Server die Zielseite selbst auf, auch in einem abgeschotteten Browser, damit Ihr Gerät nicht mit ihr in Kontakt kommt. QR-Codes werden direkt auf Ihrem Gerät gelesen.",
            "Wir speichern die geprüften Inhalte nicht und verknüpfen sie nicht mit Ihrer IP-Adresse. Nach Abschluss der Prüfung werden sie verworfen. Bitte fügen Sie trotzdem keine Passwörter, PINs oder TANs ein.",
            "Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Erbringung der von Ihnen angeforderten Prüfung).",
          ],
        },
        {
          h: "4. Externe Prüfdienste",
          p: ["Für die Prüfung eines Links fragt unser Server öffentliche Sicherheitsdienste ab. Diese erhalten nur den geprüften Link, seine Domain oder die IP-Adresse des Zielservers, nicht Ihre IP-Adresse:"],
          list: [
            "Google Safe Browsing (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland): Abgleich mit Googles Liste gefährlicher Seiten",
            "URLhaus (abuse.ch, Berner Fachhochschule, Schweiz): Abgleich mit bekannten Schadlinks",
            "Quad9 (Quad9 Foundation, Zürich, Schweiz): DNS-Abfragen und Sperrlisten",
            "Registrierungsstellen der Domain-Endungen über RDAP: Alter und Status der Domain",
            "crt.sh (Sectigo Limited, Vereinigtes Königreich): öffentliche Protokolle ausgestellter Zertifikate",
            "ipwho.is: Land und Netzbetreiber des Zielservers",
          ],
        },
        {
          h: "5. KI-Analyse",
          p: [
            "Für die zweite Meinung und das Auslesen von Screenshots nutzen wir das Sprachmodell Claude von Anthropic PBC, 548 Market Street, PMB 90375, San Francisco, CA 94104, USA. Übermittelt werden der Text und Aufbau der geprüften Seite, ein Bildschirmfoto der Zielseite, der Text geprüfter Nachrichten und hochgeladene Screenshots in verkleinerter Form. Telefonnummern, E-Mail-Adressen, IBANs und Kartennummern in Nachrichten entfernen wir vorher automatisch.",
            "Anthropic verwendet über die Schnittstelle übermittelte Daten nach eigenen Angaben nicht zum Training seiner Modelle und löscht sie nach kurzer Zeit. Die Übermittlung in die USA erfolgt auf Grundlage der EU-Standardvertragsklauseln. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.",
          ],
        },
        {
          h: "6. Vorschaubild der Zielseite",
          p: [
            "Im Prüfbericht kann ein Vorschaubild der Zielseite erscheinen. Es wird vom Dienst Microlink (microlink.io) erzeugt und direkt von Ihrem Browser geladen. Dabei erhält Microlink Ihre IP-Adresse und den geprüften Link. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse daran, Ihnen zu zeigen, wie die Seite aussieht, ohne dass Sie sie öffnen müssen).",
          ],
        },
        {
          h: "7. Liste gefährlicher Domains",
          p: [
            "Stuft Mailharpoon einen Link als gefährlich ein, zählen wir nur seine Domain und die nachgeahmte Marke, um vor Seiten zu warnen, die gerade im Umlauf sind. Wie viele verschiedene Personen eine Domain geprüft haben, schätzen wir über einen täglich wechselnden, mit einem Geheimwert gebildeten Hashwert. Ihre IP-Adresse, der vollständige Link und Nachrichten werden dabei nicht gespeichert, und der Hashwert lässt sich nicht auf Ihre IP-Adresse zurückführen. Die Daten liegen bei Upstash Inc. und werden nach 9 Tagen automatisch gelöscht.",
            "Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse, andere vor aktuellen Betrugsseiten zu warnen).",
          ],
        },
        {
          h: "8. Schutz vor Missbrauch",
          p: ["Damit der Dienst nicht automatisiert überlastet wird, begrenzen wir die Zahl der Prüfungen pro IP-Adresse. Dafür wird Ihre IP-Adresse höchstens 10 Minuten im Arbeitsspeicher des Servers gehalten und nicht dauerhaft gespeichert. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO."],
        },
        {
          h: "9. Cookies und lokaler Speicher",
          p: ["Mailharpoon setzt kein Tracking ein. Gespeichert wird nur, was Sie selbst einstellen:"],
          list: [
            "Cookie „mh-lang“: die Sprache, die Sie über den Sprachknopf gewählt haben. Es wird erst beim Umschalten gesetzt und ist ein Jahr gültig.",
            "Lokaler Speicher „mh-theme“: ob Sie den hellen oder dunklen Modus gewählt haben.",
            "Lokaler Speicher „mh-notice“: dass Sie den Datenschutz-Hinweis geschlossen haben.",
          ],
          after: ["Diese Einträge sind für die von Ihnen gewünschte Funktion unbedingt erforderlich und brauchen deshalb keine Einwilligung (§ 25 Abs. 2 Nr. 2 TDDDG). Sie verlassen Ihr Gerät nicht, nur das Sprach-Cookie wird beim Seitenaufruf mitgesendet, damit die Seite in Ihrer Sprache öffnet. Sie können alle Einträge jederzeit in Ihrem Browser löschen."],
        },
        {
          h: "10. Aktuelles und externe Links",
          p: [
            "Die Meldungen unter „Aktuelles“ lädt unser Server aus den öffentlichen Feeds der genannten Quellen und lässt sie von Claude zusammenfassen. Daten von Besuchern sind daran nicht beteiligt.",
            "Links zu anderen Websites, zu GitHub oder zu Feed-Readern wie Feedly und Inoreader werden erst aufgerufen, wenn Sie sie anklicken. Dann gilt die Datenschutzerklärung des jeweiligen Anbieters.",
          ],
        },
        {
          h: "11. Kontakt per E-Mail",
          p: ["Wenn Sie uns schreiben, verwenden wir Ihre Angaben nur, um Ihre Anfrage zu beantworten, und löschen sie, wenn sie erledigt ist. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO."],
        },
        {
          h: "12. Ihre Rechte",
          p: [
            "Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18) und Datenübertragbarkeit (Art. 20). Da wir geprüfte Inhalte nicht speichern und keine Konten führen, liegen zu Ihrer Person bei uns in der Regel keine Daten vor.",
            "Widerspruchsrecht: Soweit wir Daten auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO verarbeiten, können Sie aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit widersprechen (Art. 21 DSGVO).",
            `Sie können sich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren, zum Beispiel bei der für uns zuständigen: ${a.name}, ${a.url}`,
          ],
        },
        {
          h: "13. Automatisierte Bewertungen",
          p: ["Mailharpoon bewertet Links und Nachrichten automatisch. Diese Bewertung betrifft den geprüften Inhalt, nicht Sie als Person, und hat für Sie keine rechtliche Wirkung. Eine automatisierte Entscheidung im Sinne von Art. 22 DSGVO findet nicht statt."],
        },
      ],
    };
  return {
    title: "Privacy policy",
    lead: "Mailharpoon needs no sign-up, uses no tracking and no ads, and does not store the links and messages you check. This page explains exactly which data is still processed when you use it, by whom and why.",
    updated: "Last updated: 14 November 2026",
    sections: [
      { h: "1. Controller", p: [`${address()}\nGermany\nE-mail: ${OPERATOR.email}`, "There is no data protection officer, as none is required. Please send any privacy questions to the address above."] },
      {
        h: "2. Hosting and server logs",
        p: [
          "The website runs on Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA. Whenever a page is requested, Vercel processes technically necessary data: IP address, time, requested address, browser identifier (user agent) and referrer. This is needed to deliver the page and to protect it against attacks.",
          "The legal basis is Art. 6(1)(f) GDPR (legitimate interest in a secure, working service). Vercel is certified under the EU-US Data Privacy Framework, and a data processing agreement is in place. Vercel deletes the logs after a short time.",
        ],
      },
      {
        h: "3. Checking links, messages and screenshots",
        p: [
          "When you check a link, a message or a screenshot, the content is sent to our server and analysed there. For links, our server opens the destination itself, including in an isolated browser, so your device never touches it. QR codes are read on your device.",
          "We do not store the checked content and do not link it to your IP address. It is discarded once the check is complete. Please still do not paste passwords, PINs or one-time codes.",
          "The legal basis is Art. 6(1)(b) GDPR (providing the check you requested).",
        ],
      },
      {
        h: "4. External security services",
        p: ["To check a link, our server queries public security services. They receive only the checked link, its domain or the IP address of the destination server, never your IP address:"],
        list: [
          "Google Safe Browsing (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland): Google's list of dangerous sites",
          "URLhaus (abuse.ch, Bern University of Applied Sciences, Switzerland): known malicious links",
          "Quad9 (Quad9 Foundation, Zurich, Switzerland): DNS lookups and blocklists",
          "Domain registries via RDAP: age and status of the domain",
          "crt.sh (Sectigo Limited, United Kingdom): public logs of issued certificates",
          "ipwho.is: country and network of the destination server",
        ],
      },
      {
        h: "5. AI analysis",
        p: [
          "For the second opinion and for reading screenshots we use the language model Claude by Anthropic PBC, 548 Market Street, PMB 90375, San Francisco, CA 94104, USA. We send the text and structure of the checked page, a screenshot of the destination, the text of checked messages and uploaded screenshots in reduced size. Phone numbers, e-mail addresses, IBANs and card numbers in messages are removed automatically beforehand.",
          "According to Anthropic, data sent through its API is not used to train its models and is deleted after a short time. The transfer to the USA is based on the EU standard contractual clauses. The legal basis is Art. 6(1)(b) GDPR.",
        ],
      },
      {
        h: "6. Preview image of the destination",
        p: ["The report may show a preview image of the destination. It is generated by the Microlink service (microlink.io) and loaded directly by your browser, so Microlink receives your IP address and the checked link. The legal basis is Art. 6(1)(f) GDPR (legitimate interest in showing you what the page looks like without you having to open it)."],
      },
      {
        h: "7. List of dangerous domains",
        p: [
          "When Mailharpoon rates a link as dangerous, we count only its domain and the imitated brand, to warn about sites currently in circulation. How many different people checked a domain is estimated from a hash that changes daily and is formed with a secret value. Your IP address, the full link and messages are not stored, and the hash cannot be traced back to your IP address. The data is held by Upstash Inc. and deleted automatically after 9 days.",
          "The legal basis is Art. 6(1)(f) GDPR (legitimate interest in warning others about current scam sites).",
        ],
      },
      { h: "8. Abuse protection", p: ["To keep the service from being overloaded automatically, we limit the number of checks per IP address. For this, your IP address is kept in the server's memory for at most 10 minutes and never stored permanently. The legal basis is Art. 6(1)(f) GDPR."] },
      {
        h: "9. Cookies and local storage",
        p: ["Mailharpoon uses no tracking. Only what you set yourself is stored:"],
        list: [
          "Cookie “mh-lang”: the language you picked with the language switch. It is only set when you switch and is valid for one year.",
          "Local storage “mh-theme”: whether you picked the light or dark mode.",
          "Local storage “mh-notice”: that you closed the privacy note.",
        ],
        after: ["These entries are strictly necessary for the function you asked for and therefore need no consent (§ 25(2) no. 2 TDDDG). They stay on your device; only the language cookie is sent with page requests so the site opens in your language. You can delete all of them in your browser at any time."],
      },
      {
        h: "10. News and external links",
        p: [
          "Our server loads the items under “News” from the public feeds of the named sources and has Claude summarise them. No visitor data is involved.",
          "Links to other websites, to GitHub or to feed readers such as Feedly and Inoreader are only opened when you click them. The privacy policy of that provider then applies.",
        ],
      },
      { h: "11. Contact by e-mail", p: ["If you write to us, we use your details only to answer your request and delete them once it is settled. The legal basis is Art. 6(1)(f) GDPR."] },
      {
        h: "12. Your rights",
        p: [
          "You have the right of access (Art. 15 GDPR), rectification (Art. 16), erasure (Art. 17), restriction of processing (Art. 18) and data portability (Art. 20). As we do not store checked content and keep no accounts, we usually hold no data about you.",
          "Right to object: where we process data on the basis of Art. 6(1)(f) GDPR, you may object at any time on grounds relating to your particular situation (Art. 21 GDPR).",
          `You can also lodge a complaint with a data protection authority, for example the one responsible for us: ${a.name}, ${a.url}`,
        ],
      },
      { h: "13. Automated ratings", p: ["Mailharpoon rates links and messages automatically. The rating concerns the checked content, not you as a person, and has no legal effect on you. No automated decision within the meaning of Art. 22 GDPR takes place."] },
    ],
  };
}
