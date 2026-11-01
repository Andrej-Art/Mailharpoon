# Mailharpoon: Forschungsstand und Ausbau-Roadmap

Stand: 01.11.2026. Grundlage: aktuelle Forschung (USENIX Security, AAAI, DSN, arXiv), Dokumentationen der Datenquellen und Praxisberichte. Jede Erweiterung wird erst übernommen, wenn sie in der bestehenden Evaluation (`scripts/eval-live.mts`, `scripts/eval-text.mts`) die Erkennung verbessert, ohne die Fehlalarmquote zu erhöhen.

## Was Mailharpoon heute schon abdeckt

Betrugslisten (OpenPhish, optional Google Safe Browsing und URLhaus), Domain-Alter per RDAP, erstes Zertifikat (CT), Bekanntheit (Tranco), Domain-Modell (Gradient Boosting), URL-Heuristiken, Markenschutz für 119 Marken (Typosquatting, Homoglyphen), statische HTML-Analyse, Weiterleitungen, DNS, TLS, Mail-Einträge, Nachrichten-Analyse (Regeln, Absenderprüfung) und eine KI-Einschätzung mit Claude Haiku.

## Die wichtigsten Lücken

1. **JavaScript wurde nicht ausgeführt** (inzwischen behoben, siehe Umsetzungsstand). Viele Phishing-Kits bauen ihr Formular erst im Browser auf oder zeigen Scannern harmlose Inhalte (Cloaking). CrawlPhish fand Cloaking-Techniken bei 35.067 von 112.005 untersuchten Phishing-Seiten [1]. Neuere Arbeiten zeigen, dass bestimmte Varianten die Blacklist-Erkennung komplett verhindern [2].
2. **Keine visuelle Prüfung.** Die Forschung zeigt seit Phishpedia und PhishIntention, dass „Marke auf dem Bildschirm passt nicht zur Domain“ das zuverlässigste Signal ist [3][4].
3. **Die Markenliste ist klein.** 119 Marken decken Stadtwerke, Regionalbanken oder lokale Shops nicht ab. KnowPhish arbeitet mit einer Wissensbasis von rund 20.000 Marken [5].
4. **.de-Domains verraten kein Registrierungsdatum** (DENIC veröffentlicht es nicht). Gerade hier fehlt das stärkste Einzelsignal.

## Umsetzungsstand

| Erweiterung | Status |
|---|---|
| Quad9-Abgleich (DoH, gefiltert gegen ungefiltert) | umgesetzt am 01.11.2026 |
| Sicherheits-Links entpacken (Safe Links, Proofpoint v1/v2/v3 und weitere) | umgesetzt am 01.11.2026 |
| QR-Code-Prüfung im Browser | umgesetzt am 01.11.2026 |
| Wöchentliche Evaluation per GitHub Action | umgesetzt am 01.11.2026, erster Lauf: 83 % erkannt bei 5 % Fehlalarmen (Schwelle 50) |
| Gerenderte Seitenanalyse und visuelle Markenprüfung | umgesetzt am 01.11.2026 (Headless-Chromium hinter geprüftem Egress-Proxy, Screenshot an Claude, Markenabgleich gegen Wissensbasis) |
| Marken-Wissensbasis über Wikidata | umgesetzt am 01.11.2026 (`scripts/build-brand-kb.mts`, 48.381 Organisationen) |

Messung vorher/nachher (`scripts/eval-visual.mts`, je 20 URLs, KI an, Betrugslisten aus): Phishing erkannt bei Schwelle 70 von 90 % auf 95 %, echte Login-Seiten bekannter Marken fälschlich markiert bei Schwelle 50 von 5 % auf 0 %, zufällige legitime Websites unverändert 5 %.

## Empfohlene Erweiterungen, nach Nutzen geordnet

### Stufe 1: großer Nutzen, gut umsetzbar

| # | Erweiterung | Was sie bringt | Forschung / Quelle | Aufwand |
|---|---|---|---|---|
| 1 | **Gerenderte Seitenanalyse** mit Headless-Browser (eigene Vercel-Funktion mit `@sparticuz/chromium` oder externer Render-Dienst) | Erkennt Formulare, die erst per JavaScript entstehen, und clientseitiges Cloaking. Liefert einen echten Screenshot. | CrawlPhish [1], CrawlerBox (DSN 2025, Open Source) [6] | mittel |
| 2 | **Visuelle Markenprüfung**: Screenshot an Claude (Bildanalyse), Marke erkennen, mit Domain abgleichen | Kernansatz der aktuellen Forschung. Bei Lee et al. stieg der F1-Wert von Claude durch den zusätzlichen Domain-Abgleich um rund 19 %; schon der Screenshot allein lieferte gute Ergebnisse [7]. PhishAgent (AAAI 2025) kombiniert dies mit Wissensbasen [8]. | [3][4][7][8] | mittel |
| 3 | **Marken-Wissensbasis erweitern**: offizielle Websites aus Wikidata (Eigenschaft P856) für Unternehmen, Banken, Behörden, Versorger | Von 119 auf mehrere Tausend Marken mit offiziellen Domains, inklusive deutscher Stadtwerke, Sparkassen und Volksbanken. Verringert verpasste Fälle. | KnowPhish [5] | mittel |
| 4 | **Schutz-DNS-Abgleich über Quad9** | Quad9 bündelt rund 20 Threat-Intelligence-Quellen und antwortet bei gesperrten Domains mit „existiert nicht“ [9]. Löst eine Domain normal auf, bei Quad9 aber nicht, ist das ein starker, kostenloser Hinweis. | Quad9 [9] | gering |
| 5 | **Sicherheits-Link-Umhüllungen entpacken**: Microsoft Safe Links, Proofpoint URL Defense, Google-Weiterleitungen | Viele Nutzer in Firmen kopieren solche umhüllten Links. Ohne Entpacken prüfen wir den falschen Link. | Praxis | gering |
| 6 | **QR-Code-Prüfung**: Bild hochladen oder Kamera, QR-Code im Browser lokal entschlüsseln, Link prüfen | Quishing nimmt stark zu. Entschlüsseln und den Link prüfen ist zuverlässiger als reine QR-Strukturanalyse (diese erreicht AUC 0,91 [10] bzw. 83 % Genauigkeit [11]). | [10][11] | gering |

### Stufe 2: zusätzliche Datenquellen (Lizenzen beachten)

| Quelle | Nutzen | Bedingungen |
|---|---|---|
| **urlscan.io** (Suche nach bestehenden Scans) | Erkennt Phishing gegen über 1.500 Marken [12] | Kostenlos mit Kontingenten. **Nur suchen, nie öffentlich scannen lassen:** Links von Nutzern können persönliche Tokens enthalten (Passwort-Reset-Links). Kommerzielle Nutzung vorher prüfen. |
| **PhishTank** | Von der Community bestätigte Phishing-URLs | Kostenloser Schlüssel [13] |
| **ThreatFox** (abuse.ch) | Schadsoftware-Infrastruktur | Gleicher kostenloser Schlüssel wie URLhaus. Kommerziell ggf. kostenpflichtig [14]. |
| **Spamhaus DBL / ZRD** | DBL listet missbrauchte Domains, ZRD markiert neu registrierte Domains 24 Stunden lang. Das schließt die .de-Lücke für ganz neue Domains. | **Nur nicht-kommerziell frei** [15] |
| **Google Web Risk** | Kommerzieller Ersatz für Safe Browsing | Kostenpflichtig. Safe Browsing ist ausdrücklich nur nicht-kommerziell erlaubt [16]. |
| **VirusTotal** | Über 70 Scanner | Öffentliche API: 500 Anfragen/Tag, **nicht für kommerzielle Produkte** [17] |

### Stufe 3: E-Mail und Nachrichten vertiefen

- **.eml-Dateien per Drag-and-drop** statt Kopieren des Quelltexts.
- **DKIM-Domain-Abgleich**: Gehört die signierende Domain (`d=`) nicht zum Absender, ist das bei angeblichen Firmenmails ein Warnzeichen [18]. Ein vollständiges Bestehen von SPF, DKIM und DMARC schließt Phishing nicht aus (kompromittierte Konten).
- **Anhänge auswerten**: HTML-, SVG-, ISO- und LNK-Anhänge sind typische Träger (HTML-Schmuggel). Die Anhänge werden nur angezeigt, nie ausgeführt.
- **Doppelgänger-Absender** gegen die erweiterte Markenbasis prüfen.

### Stufe 4: Erkennung moderner Angriffe

- **Adversary-in-the-Middle-Kits** (Tycoon 2FA, Evilginx, EvilProxy): Login-Seiten, die Ressourcen des echten Identitätsanbieters über fremde Domains nachladen, sowie Turnstile- oder CAPTCHA-Schranken vor Login-Formularen. Konkrete Kit-Indikatoren veralten schnell, daher auf Verhaltensmuster setzen [19].
- **Lookalike-Erzeugung im Stil von dnstwist** gegen die Top-10.000-Domains statt nur gegen die Markenliste (Auslassung, Einfügung, Bitsquatting, Homoglyphen) [20].
- **Favicon-Abgleich** per Hash gegen Marken-Favicons. Ergänzt die visuelle Prüfung, ist allein aber nicht verlässlich [21].

### Stufe 5: Schutz der Nutzer über den Scan hinaus

- **Browser-Erweiterung**: warnt, bevor ein Passwort auf einer Domain eingegeben wird, die nicht zur dargestellten Marke passt. Das ist der wirksamste Schutz, weil er im entscheidenden Moment greift.
- **Ratgeber zu Passkeys und Passwort-Managern**: Passkeys (FIDO2) sind an die echte Domain gebunden und machen AiTM-Phishing wirkungslos [19]. Passwort-Manager füllen auf falschen Domains nichts aus.
- **Empfehlung für Schutz-DNS** (z. B. Quad9) als einfache Maßnahme für das Heimnetz [9].

## Qualitätssicherung für jede Erweiterung

1. **Wöchentliche Evaluation** mit frischen OpenPhish-URLs und legitimen Domains, automatisiert per GitHub Action. So fällt nachlassende Erkennung sofort auf.
2. **Feedback-Funktion** „Ergebnis falsch?“. Gemeldet wird nur die Domain, nicht der vollständige Link.
3. **Neues Signal erst übernehmen**, wenn es auf dem Entwicklungsset hilft und auf dem zurückgehaltenen Testset bestätigt wird.
4. **Datenschutz**: Kein Link wird öffentlich an Drittdienste übermittelt, Nachrichten werden vor der KI-Analyse geschwärzt, und es wird nichts gespeichert.

## Quellen

1. Zhang et al., CrawlPhish (IEEE S&P 2021): https://adamdoupe.com/publications/crawlphish-oakland21.md
2. Human-centric cloaking (KSII TIIS 2025): https://itiis.org/journals/tiis/digital-library/101917
3. Liu et al., PhishIntention (USENIX Security 2022): https://usenix.org/conference/usenixsecurity22/presentation/liu-ruofan
4. Liu et al., PhishLLM (USENIX Security 2024): https://usenix.org/system/files/usenixsecurity24-liu-ruofan.pdf
5. Li et al., KnowPhish (USENIX Security 2024): https://arxiv.org/abs/2403.02253v1
6. CrawlerBox (DSN 2025): https://www.eurecom.edu/en/node/4899953
7. Lee et al., Multimodal LLMs for phishing webpage detection (eCrime 2024): https://www.themoonlight.io/review/multimodal-large-language-models-for-phishing-webpage-detection-and-identification
8. PhishAgent (AAAI 2025): https://ojs.aaai.org/index.php/AAAI/article/view/35003
9. Quad9 Threat Blocking: https://quad9.net/service/threat-blocking/
10. Trad & Chehab, Quishing detection (arXiv 2505.03451): https://arxiv.org/abs/2505.03451v1
11. QRïS (arXiv 2510.17175): https://arxiv.org/abs/2510.17175v1
12. urlscan.io Dokumentation: https://docs.urlscan.io/
13. Übersicht freier Feeds: https://threatcluster.io/free-threat-intelligence-feeds
14. ThreatFox-Archiv: https://echo.archivarix.net/archive/threatfox
15. Spamhaus Free Data Query Service: https://www.spamhaus.com/data-access/free-data-query-service/
16. Google Safe Browsing Nutzungsgrenzen: https://developers.google.com/safe-browsing/v4/usage-limits
17. VirusTotal Public vs Premium API: https://docs.virustotal.com/docs/public-vs-premium-api
18. E-Mail-Header-Indikatoren: https://inventivehq.com/blog/common-email-phishing-indicators-headers
19. CYFIRMA, Tycoon 2FA Analyse: https://www.cyfirma.com/?p=49631
20. dnstwist: https://www.mankier.com/1/dnstwist
21. SANS ISC, Favicon-Hashes: https://isc.sans.edu/diary/27326
