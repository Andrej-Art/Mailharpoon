# Mailharpoon 2.0 – Reverse Engineering & Modernisierungsplan

## 1. Ist-Zustand (Reverse Engineering)

**Architektur:** FastAPI-Backend (Render, per GitHub-Action alle 10 min „wachgepingt“) + Streamlit-Frontend, beide in Docker.

**Pipeline:** URL → Feature-Extraktion (30 UCI-Features) → Random Forest (300 Bäume, 32 MB `joblib`) → Wahrscheinlichkeit, Schwelle 0,5.

| Komponente | Datei | Zustand |
|---|---|---|
| Lexikalische URL-Features (IP, @, `//`, Port, Subdomains, Bindestriche) | `backend/src/main.py` | brauchbar, aber falsch kodiert (siehe Bugs) |
| HTML-Features (Favicon, Anchors, Formulare, iframes …) | `backend/src/http_features.py` | brauchbar |
| DNS / WHOIS / TLS | `features/`, `security/tls_checks.py` | brauchbar, WHOIS veraltet (→ RDAP) |
| Google-Index, Page Rank, Web Traffic, Links pointing | `google_index_features.py`, `main.py` | **Platzhalter**, fest auf 0 |
| Reputation | URLhaus (ohne Auth-Key) | URLhaus verlangt seit 2025 einen Auth-Key → läuft ins Leere |
| Screenshot | Playwright | läuft nicht auf Vercel |

### Kritische Befunde (empirisch verifiziert)

1. **Feature-Kodierung invertiert.** Im UCI-Datensatz gilt `1 = legitim, −1 = Phishing`. Der Extraktor liefert `1 = Phishing`. Das Modell bekommt zur Laufzeit also das Gegenteil dessen, worauf es trainiert wurde.
2. **Klassen-Label invertiert.** Trainiert mit `1 = Phishing, 0 = legitim`; die API nimmt `phish_label = 0` an. Die angezeigte „Phishing-Wahrscheinlichkeit“ ist in Wahrheit die Legit-Wahrscheinlichkeit.
3. Beide Fehler heben sich teilweise auf, deshalb wirkt das Ergebnis oft plausibel. Messung mit dem echten Modell:
   - `https://www.google.com` → **54 % Phishing → „Malicious“**
   - ein UCI-typisch eindeutig legitimer Feature-Vektor → **100 % Phishing**
4. **`url_length` als Rohzahl** (z. B. 22) statt der trainierten Kategorie {−1, 0, 1}.
5. **7 von 30 Features sind Konstanten** (web_traffic, page_rank, links_pointing_to_page, google_index …). Das Modell rechnet zu ~25 % mit Fantasiewerten.
6. **Datensatz von 2012–2015** (UCI, 11 k Zeilen, vorkodierte Features). Er spiegelt heutiges Phishing nicht mehr wider: Let's-Encrypt-HTTPS auf Phishing-Seiten, Phishing-Kits auf Cloudflare, Vercel und Netlify, Punycode-/Homoglyph-Domains, QR-/AiTM-Kampagnen.
7. Sicherheit: SSRF-Prüfung mit TOCTOU-Lücke (DNS-Rebinding), Geo-Lookup über unverschlüsseltes `http://ip-api.com`.
8. Repo-Hygiene: Modelle doppelt eingecheckt (2 × 32 MB), 87-MB-GIF und 18-MB-MP4 im Git-Verlauf, Notebooks mit absoluten lokalen Pfaden.

## 2. Zielbild

Ein mehrschichtiger Detektor („Defense in Depth“) nach aktueller Forschung. Ein einzelnes ML-Modell reicht dafür nicht. Jede Schicht liefert ein erklärbares Signal, ein Ensemble fasst sie zu einem kalibrierten Risiko-Score zusammen.

| Schicht | Methode | Forschungsbasis |
|---|---|---|
| 1. Threat Intel | Google Safe Browsing v4/v5, URLhaus (Auth-Key), OpenPhish-Feed, PhishTank | Industriestandard; bekannte Treffer = sofort „gefährlich“ |
| 2. Reputation / Allowlist | Tranco Top-1M-Rang, Domain-Alter über **RDAP**, Certificate-Transparency (crt.sh): erstes Zertifikat | Neue Domains + frisches CT-Zertifikat = einer der stärksten Prädiktoren |
| 3. Lexikalisches ML | Gradient Boosting auf ~40 modernen URL-Features (Entropie, Ziffern-/Sonderzeichenanteile, TLD-Risiko, Pfadtiefe, Keywords, Punycode). Trainiert auf **PhiUSIIL (2024, 235 k URLs)** + aktuellen OpenPhish/Tranco-Samples, leakende Features (z. B. `URLSimilarityIndex`) entfernt | Prasad & Chandra 2024; LLM-/BERT-Benchmarks auf PhiUSIIL (arXiv 2602.02641) |
| 4. Brand-Impersonation | Typosquatting/Levenshtein + Homoglyph-Skeleton (Unicode TR39) gegen ~300 Top-Marken; Marke im Subdomain-/Pfad-Teil statt in der registrierten Domain | Phishpedia/PhishIntention/KnowPhish: *Marke ≠ Domain* ist das Kernsignal |
| 5. Live-Inspektion | Sicherer Fetch (SSRF-fest, gepinnte IP), Redirect-Kette, Login-/Passwortformulare, Form-Action auf fremde Domain, Marken-Logos/Titel vs. Domain, versteckte iframes, JS-Obfuskation, TLS-Details, Screenshot | UCI-HTML-Features, modernisiert |
| 6. Optional: LLM-Urteil | Claude bewertet URL + extrahierten Seitentext/Titel/Formulare und begründet das Urteil | Few-Shot-LLMs erreichen auf PhiUSIIL Spitzenwerte und liefern Begründungen |

**Ensemble:** gewichtete, kalibrierte Kombination (Logit-Stacking). Harte Overrides: Blacklist-Treffer → gefährlich, Tranco-Top-10k + konsistentes Zertifikat → sicher. Die Ausgabe enthält Score, Urteil (Sicher / Verdächtig / Gefährlich) und die wichtigsten Gründe.

## 3. Zielarchitektur (Vercel)

```
Next.js 15 (App Router, TypeScript) – ein Projekt, ein Deployment
├─ app/                 Landingpage, /scan, /scan/[id], /how-it-works, /api-docs
├─ app/api/scan         Route Handler (Node runtime, maxDuration 60 s)
├─ lib/analyzers/       intel.ts, reputation.ts, lexical.ts, brand.ts, page.ts, tls.ts, llm.ts
├─ lib/model/           exportiertes GBM als JSON-Bäume → Inferenz in reinem TS (<1 ms, kein Python nötig)
├─ ml/                  Python-Trainingspipeline (lokal / CI), Evaluation, Model-Card
└─ Screenshot           @sparticuz/chromium in eigener Function ODER externer Dienst
```

Warum kein Python auf Vercel: scikit-learn + numpy + scipy liegen nahe am 250-MB-Function-Limit und bringen lange Cold Starts. Ein auf JSON exportiertes Modell läuft in TypeScript sofort. Trainiert wird weiterhin in Python.

Zusätzlich: Rate-Limiting (Upstash Redis o. ä.), Ergebnis-Cache, Zod-Validierung, CSP-Header, sichere Defaults ohne API-Keys (jede Schicht degradiert sauber).

## 4. Design

Neo-Brutalismus nach der Referenzseite: cremefarbener Grund, 1,5 px schwarze Konturen, harte versetzte Schatten (`4px 4px 0 #000`), Pill-Buttons, Textmarker-Highlights, große Display-Typo (**Unbounded** + **Poppins**), Karten in Farbblöcken.

**Farben aus dem Logo abgeleitet** (Logo bleibt unverändert):
- Navy `#0E1B3D` (Text, Konturen, dunkle Sektionen)
- Harpoon-Orange `#F7821B` (Primär-Akzent, CTAs)
- Creme `#FDF2E2` (Hintergrund)
- Wellen-Blau `#2A6F97` (Sekundär)
- Signalfarben: Sicher `#BFE9A8`, Verdächtig `#FFD66B`, Gefährlich `#FF8A7A`

**Seiten:** Hero mit URL-Eingabe direkt im Sichtfeld → „So funktioniert's“ (6 Schichten) → Live-Report (Score-Gauge, Ampel, Begründungskarten, Redirect-Kette, Screenshot, Tech-Details aufklappbar) → Bildungsteil „Was ist Phishing?“ → Model-Card / Transparenz → Footer.

## 5. Umsetzungsschritte

1. **Repo aufräumen:** neuer Branch `v2`, Altbestand nach `legacy/`, große Medien aus dem Arbeitsbaum entfernen, Bugs 1–4 im Legacy-Code als Referenz dokumentieren.
2. **ML-Pipeline neu:** PhiUSIIL + aktuelle Feeds laden, Leakage-Check, Feature-Set in Python **und** TS identisch implementieren (Paritätstest), LightGBM/XGBoost trainieren, kalibrieren (isotonic), auf zeitlich getrenntem Holdout evaluieren, als JSON exportieren, Model-Card schreiben.
3. **Analyzer in TypeScript:** lexical → brand → reputation (RDAP, CT, Tranco) → intel → page/tls → ensemble, jeweils mit Unit-Tests.
4. **API:** `POST /api/scan` (schnell: lexikalisch + Intel) und Streaming der Tiefenanalyse (Server-Sent Events), damit erste Ergebnisse nach <1 s erscheinen.
5. **Frontend:** Design-System (Tokens, Komponenten), Landingpage, Scanner, Report.
6. **Qualität:** Vitest + Playwright E2E, Lighthouse ≥ 95, a11y.
7. **Deployment:** Vercel-Projekt, Env-Variablen (`GOOGLE_SAFE_BROWSING_KEY`, `URLHAUS_AUTH_KEY`, optional `ANTHROPIC_API_KEY`), eigene Domain, Render-Ping-Action entfernen.
