# <img src="public/logo-160.png" width="64" align="top" /> Mailharpoon 2.0 – Explainable Phishing URL Scanner

Mailharpoon inspects a link live across **eight independent layers** and fuses the evidence into one explainable 0–100 risk score. You see the verdict and the evidence behind it.

**Stack:** Next.js 15 (App Router, TypeScript) · one Vercel deployment · Python only for offline model training.

| Layer | What it does |
|---|---|
| Threat intel | OpenPhish live feed (no key), Quad9 protective-DNS check (filtered vs. unfiltered resolver over DoH, no key), Google Safe Browsing, URLhaus. A confirmed list hit overrides everything else |
| Reputation | Tranco popularity, domain age via RDAP (IANA bootstrap), first certificate in CT logs (crt.sh) |
| URL + ML | Gradient-boosted domain model (19 features, runs in pure TS) + URL-structure heuristics |
| Brand | Typosquatting, homoglyphs (Unicode TR39 skeletons), brands in subdomains/paths, mixed scripts |
| Live page | SSRF-safe fetch: login/card forms, external form targets, Telegram/Discord exfiltration, obfuscation, cloaking, brand-vs-domain mismatch, hosting-provider phishing warnings |
| Browser render | Headless Chromium behind a vetted egress proxy: forms built by JavaScript, fake "verifying your browser" gates (waited out once), script redirects, screenshot |
| Destination | Re-analyses the final URL after redirects (shorteners, open redirects) |
| Network/TLS | DNS, certificate validity and hostname match, SPF/DMARC, hosting ASN |
| AI analyst *(optional)* | Claude Haiku 5.5 by default reads the evidence, the rendered page and its screenshot (or a message) and returns a schema-constrained verdict |
| Visual brand check *(with AI)* | Claude names the brand the page presents itself as and what it asks for; whether the domain is official is decided from the curated list and a Wikidata knowledge base, never by the model |

## Rendered page and visual brand check

Many phishing kits only build their login form in JavaScript or show scanners a harmless page first. `src/lib/analyzers/render.ts` therefore opens the link in headless Chromium (`@sparticuz/chromium` on Vercel, an installed Chrome locally) and reports only what the plain fetch missed, so no evidence is counted twice.

The browser never resolves a host name itself (`--host-resolver-rules`). All traffic goes through a local forward proxy (`src/lib/net/egress-proxy.ts`) that resolves each host, refuses private, loopback, link-local and reserved addresses, allows only ports 80, 443, 8080 and 8443, and caps connections and bytes. Downloads, popups, dialogs and media are blocked.

The screenshot goes to Claude together with the page facts. Claude names the brand on screen and what the page asks for. Mailharpoon then checks the landing domain against the curated brand list and `src/lib/data/brand-kb.json`, built from Wikidata's official-website property (P856) by `scripts/build-brand-kb.mts`. A brand login on a foreign domain scores high only when the brand's real domains are on record; the model's own list of official domains can spare a domain but never condemn one, so a page cannot talk its way into "official". This follows the brand-to-domain consistency idea of Phishpedia, PhishIntention, PhishLLM and KnowPhish. The same knowledge base (48,381 organisations, 52,823 domains) also stops the address check from flagging regional brands on their own domains, such as individual Sparkassen.

Evaluation (`scripts/eval-visual.mts`, 1 Nov 2026, AI on, threat lists off, 20 URLs per set): fresh phishing detected at threshold 70 rose from 90 % to 95 %; genuine login pages of well-known brands flagged at 50 fell from 5 % to 0 %; random legitimate sites unchanged at 5 %. Most phishing URLs in the sample had already been replaced by Cloudflare's phishing warning, which is now recognised. The sample is small and the result is a direction, not a precise figure.

## Link unwrapping and QR codes

Links rewritten by email security gateways and redirect services are unwrapped before the check, so the real destination is analysed. This covers Microsoft Safe Links, Proofpoint URL Defense v1/v2/v3, Barracuda, Trend Micro, and Google, Facebook, LinkedIn, YouTube, Steam and Slack redirects (`src/lib/analyzers/unwrap.ts`). QR codes are decoded in the browser with jsQR (Apache-2.0), and the image never leaves the device.

## Weekly evaluation

`.github/workflows/weekly-eval.yml` runs `scripts/eval-weekly.mts` every Monday. It pits 40 fresh OpenPhish URLs against 40 legitimate domains outside the popularity list, with all threat lists switched off, and stores the result in `ml/eval-history/`. The job fails on a clear breakdown (recall at 50 below 30 % or false alarms at 70 above 15 %).

## Message check (email, SMS, chat)

Besides links, Mailharpoon checks pasted messages. The **content** layer has German and English rules for current scam types: parcel fees, account suspension, "Hi Mum" messages, gift cards, CEO fraud, fake support, refunds, prizes and advance fee. It also flags HTML links whose visible text points to a different domain. The **sender** layer evaluates SPF, DKIM and DMARC results, Reply-To mismatches, display-name spoofing and lookalike sender domains. This works best when the full email source is pasted. In the **links** layer, every link in the message (up to 3) runs through the full URL pipeline. Before the AI layer sees a message, phone numbers, email addresses, IBANs and card numbers are redacted.

Evaluation: `npx tsx scripts/eval-text.mts` (details in `ml/text-eval/README.md`). On a held-out English public corpus (150 phishing or spam, 150 benign), the rules alone catch 5%. Rules plus the Haiku AI layer catch 81% at threshold 50 with 1% false positives. The weights were tuned on a separate dev set.

## News page (`/de/news`, `/en/news`)

Current phishing and scam warnings from official feeds only (RSS, Atom, Mastodon), no article pages are scraped: Phishing-Radar of Verbraucherzentrale NRW, Watchlist Internet, Mimikama, heise Security, BleepingComputer, The Hacker News and Krebs on Security (`src/lib/news/sources.ts`, add more there). Claude (Haiku) filters general security news down to what matters to private users, removes duplicate reports, and writes a two-sentence summary in German and English in its own words with a link to the original. Each summary is cached by article link, so only new items cost a call; the page refreshes hourly via ISR. Without an API key, or when a call fails (for example with no API credit left), the consumer warning services are still shown under their own title. `npx tsx scripts/news-probe.mts` prints what the page would show.

## Currently circulating phishing (news page)

When a scan rates a link dangerous, only its registrable domain and the impersonated brand are counted in Upstash Redis (Vercel Marketplace, `KV_REST_API_URL` / `KV_REST_API_TOKEN`). Requesters are counted with HyperLogLog over a salted daily hash, so no IP address, full link or message is stored. Data expires after 9 days.

The list also counts how many links per domain OpenPhish and URLhaus currently report (`src/lib/trends/external.ts`). A domain checked only on Mailharpoon is listed after `TREND_MIN_PEOPLE` (default 3) different people checked it within 7 days, or earlier when one of these services confirms it. Domains checked on Mailharpoon come first, then domains reported only by the services, by number of reported links. Sites in the Tranco top 10k, shared file hosts and IP addresses are never listed, and domains are shown defanged (`example[.]top`).

## Quick start

```bash
npm install
cp .env.example .env.local   # all keys optional
npm run dev                  # http://localhost:3000
npm test                     # 340 tests incl. Python/TS model parity, SSRF guards and the browser egress proxy
npx tsx scripts/scan-cli.mts https://example.com   # full pipeline in the terminal
```

## Deploy to Vercel

1. Push the repo to GitHub and import it at [vercel.com/new](https://vercel.com/new). The framework is detected automatically and needs no `vercel.json`.
2. Optionally add the environment variables from `.env.example` (Settings → Environment Variables).
3. Recommended: add a Vercel Firewall rate-limit rule for `/api/scan`. The built-in limiter only works per serverless instance.

`/api/scan` runs on the Node.js runtime with `maxDuration = 60`, which fits the Hobby plan.

## The model (`ml/`)

```bash
python -m venv .venv && .venv/bin/pip install scikit-learn pandas tldextract
.venv/bin/python ml/train.py --phiusiil PhiUSIIL_Phishing_URL_Dataset.csv --tranco top-1m.csv --openphish feed.txt
```

- **Data:** PhiUSIIL (UCI, 2024), Tranco top-200k (legitimate), OpenPhish (held out as a recency test).
- **Key design decision:** every legitimate URL in PhiUSIIL is a bare `https://www.<domain>`, so a model trained on full URLs only learns "has a path → phishing". The model therefore sees only the registrable domain (with private PSL suffixes such as `*.pages.dev`). Path signals are handled by explainable heuristics instead.
- **Leakage control:** TLD risk and character-trigram likelihood ratios are fitted out-of-fold.
- **Export:** trees → `src/lib/model/domain-model.json`, inferred in TypeScript in under 1 ms. `parity.json` plus the vitest parity test guarantee identical features and probabilities in both languages.

| Metric (held-out) | Value |
|---|---|
| ROC-AUC (domain only) | 0.852 |
| Recall on fresh OpenPhish domains | 87 % |
| Full pipeline, blacklists **off**, live holdout @ threshold 70 | 50 % recall, 0 % false alarms |

Full methodology and limitations: `/en/methodology`.

## What was fixed from v1

The v1 Random Forest got **inverted inputs and an inverted output**. Features were encoded as 1 = phishing while the UCI data uses 1 = legitimate, and the API read class 0 (legitimate) as "phishing". The two bugs partly cancelled out, and `google.com` scored 54 % malicious. Seven of 30 features were constants. The v1 code is kept in `legacy/` for reference.

## Security notes

- The fetcher resolves DNS once, rejects private, reserved and IPv4-mapped addresses, **pins the vetted IP** for the connection (no DNS rebinding), re-validates every redirect hop, and caps size and time.
- The headless browser cannot resolve names itself and reaches the internet only through the vetted egress proxy, which applies the same address rules (tested in `src/lib/__tests__/egress-proxy.test.ts`).
- Page content and screenshots passed to the LLM are treated as untrusted data, and the output is constrained by a JSON schema.
- Strict CSP and security headers live in `next.config.ts`.

MIT licensed · Andrej Artuschenko
