# Mailharpoon 2.0 — Security Audit Findings

- **Target:** Mailharpoon (Next.js 15 phishing URL/message scanner)
- **Date:** 2026-11-23
- **Scope & authorization:** Own asset (Andrej Artuschenko, author/operator). Testing was limited
  to the local dev build and the source in this repository. The dev server ran on
  `http://localhost:3001` (port 3000 was already in use locally). No third-party host was attacked;
  SSRF probes used only loopback, RFC-1918, `169.254.0.0/16` and reserved ranges.
- **Methodology:** claude-bughunter workflow — Recon → Map & Rank → Hunt → Validate → Report,
  driven by `SECURITY_TESTPLAN.md` (cases A–K). Every candidate was taken through a reproducibility
  gate; anything that could not be reproduced was dropped.
- **Baseline:** `npm test` = **444 passed** before any change. After the fixes in this report:
  **461 passed** (444 + 12 ReDoS regression tests + 5 client-IP tests).

---

## Summary

| ID | Title | Severity | Status |
|----|-------|----------|--------|
| F-1 | ReDoS / event-loop DoS in the message parser (`URL_RE`) | High | Fixed (pending commit) |
| F-2 | Rate-limit bypass via client-controlled `X-Forwarded-For`/`X-Real-IP` | Medium (deployment-dependent) | Fixed (pending commit) |
| F-3 | Trends "people" count inflation (chains on F-2) | Low | Fixed (pending commit) |
| F-4 | CSP `script-src` includes `'unsafe-inline'` (and `'unsafe-eval'` in dev) | Nit / hardening | Open (accepted; recommendation) |

All other test-plan cases were checked and held — see **Controls that held**.

---

## F-1 — ReDoS / event-loop DoS in the message parser (`URL_RE`) — High

**Location:** `src/lib/text/parse.ts:127-128` (`URL_RE`), reached via `extractUrls()` →
`parseMessage()` → `runMessageScan()` (`POST /api/scan`, `mode:"message"`).

**Description:** The two bare-domain alternatives of `URL_RE` used unbounded nested quantifiers —
`(?:[a-z0-9-]+\.)+…` and `(?:[a-z0-9-]+(?:\[\.\]|\.))+…`. Re-tried from every `\b` over a long run
of hyphens or dots, this backtracks in **O(n²)**. `extractUrls` ran the regex over the *full* input
before the body was sliced to 20 KB, and the `zod` schema allows `text` up to 100 000 characters,
so a single legitimately-sized message triggered catastrophic CPU use.

**Reproducible PoC:**
```bash
curl -s -m 120 -X POST http://localhost:3001/api/scan \
  -H 'content-type: application/json' \
  --data "$(python3 -c "import json;print(json.dumps({'mode':'message','text':'a-'*50000,'ai':False}))")"
```

**Measured (before fix):** one request = **42.9 s** end-to-end. Regex-only microbenchmark showed
clean quadratic growth:

| Input (`'a-'×N`) | Bytes | Time |
|---|---|---|
| 5 000 | 10 KB | 0.47 s |
| 10 000 | 20 KB | 1.95 s |
| 20 000 | 40 KB | 7.45 s |
| 40 000 | 80 KB | 30.7 s |
| 50 000 | 100 KB | 47.3 s |

**Impact:** Unauthenticated, single request. Node.js is single-threaded, so the blocked event loop
stalls *all* concurrent requests on that instance; a few parallel requests cause a full outage.
`maxDuration=60` only barely masks one hit.

**Severity:** High. VRT *Application-Level Denial-of-Service (Excessive Resource Consumption)*:
no auth, one request, reliable, affects availability of the whole instance. For this internal
audit of my own code, High is justified — a single unauthenticated request takes down the entire
instance; note that in external bug-bounty programs application-level DoS is often out of scope or
rated lower.

**Fix (`src/lib/text/parse.ts`):**
1. `URL_RE` rewritten so each DNS label is length-bounded (`{1,63}`, the DNS limit) **and** the
   label count is bounded (`{0,15}`). Bounding only the label fixed the hyphen run but left the
   dotted run (`a.a.a…`) quadratic; bounding the repetition count removed that too.
   - Bare domain + path: `\b[a-z0-9-]{1,63}(?:\.[a-z0-9-]{1,63}){0,15}\.[a-z]{2,24}\/[^\s<>"'()]*`
   - Defanged variant: `\b[a-z0-9-]{1,63}(?:(?:\[\.\]|\.)[a-z0-9-]{1,63}){0,15}(?:\[\.\]|\.)(?:com|net|…)\b`
2. Defense in depth: `extractUrls` now scans `raw.slice(0, MAX_SCAN_CHARS)` with
   `MAX_SCAN_CHARS = 20_000` — the same slice the body is trimmed to anyway, so detected links are
   unchanged.

After the fix, `URL_RE` runs only inside `extractUrls` (under the 20 KB `MAX_SCAN_CHARS` cap); the
remaining parser steps (`cheerio`, MIME splitting, header parsing) are linear, so no second
quadratic path over the full 100 KB input remains open.

**Measured (after fix), full 100 KB input:** dotless `'a-'×50000` = **110 ms**, dotted
`'a.'×50000` = **39.9 ms** (regex). Detection semantics verified identical to the old regex on 12
inputs (scheme/`www`/bare-domain-with-path, `hxxp`/`[.]` defanged, multi-link, ~10-label chain,
defanged subdomain chain, email-domain skip, non-domain slash).

**Test coverage:** new `src/lib/__tests__/redos.test.ts` (12 cases) asserts both pathological inputs
return `[]` under a 500 ms budget (through `extractUrls` and `parseMessage`) plus the detection
parity cases. The file runs in ~180 ms.

**Remaining recommendation:** optionally lower the `zod` `text` max (`src/app/api/scan/route.ts:16`,
currently `max(100_000)`) to shrink the attack surface — not required for safety after this fix.

---

## F-2 — Rate-limit bypass via client-controlled `X-Forwarded-For` / `X-Real-IP` — Medium (deployment-dependent)

**Location:** `src/app/api/scan/route.ts:20`, `src/app/api/screenshot/route.ts:21`,
`src/app/api/contact/route.ts:9` — all derived the client IP as
`x-real-ip ?? x-forwarded-for[0] ?? "anon"`. `src/lib/rate-limit.ts` keys the sliding-window
limiter on that string verbatim.

**Description:** Both header values, and the leftmost `X-Forwarded-For` entry in particular, are
fully caller-supplied. Rotating them presents a fresh limiter key per request.

**Reproducible PoC:**
```bash
B=http://localhost:3001/api/scan
body='{"mode":"url","url":"http://127.0.0.1/","ai":false}'
# Baseline — fixed header: 429 after 30
for i in $(seq 1 35); do
  curl -s -o /dev/null -w "%{http_code} " -X POST "$B" \
    -H 'content-type: application/json' -H 'X-Forwarded-For: 9.9.9.9' --data "$body"; done
# Bypass — rotating header: no 429
for i in $(seq 1 35); do
  curl -s -o /dev/null -w "%{http_code} " -X POST "$B" \
    -H 'content-type: application/json' -H "X-Forwarded-For: 203.0.113.$i" --data "$body"; done
```

**Measured (before fix):** fixed header → 429 after exactly 30; rotating header →
**0 × 429 across 35 requests**.

**Impact:** Defeats the 30 / 10 min scan limit and, by the same mechanism, the 5 / hour
`/api/contact` limit → scan-cost abuse and contact-mail spam amplification.

**Severity:** Medium, deployment-dependent. VRT *Server Security Misconfiguration → Improper Rate
Limiting (bypass)*. On Vercel, `x-real-ip` is platform-set and was already checked first, so header
spoofing alone would not bypass there; the gap is real for local/self-hosted deployments or any
front end that forwards a client-supplied `X-Forwarded-For`.

**Fix:** new helper `src/lib/client-ip.ts` (`clientIp(req)`), used by all three routes:
1. Prefer `x-real-ip` (platform-set on Vercel, not caller-forgeable).
2. Otherwise read `X-Forwarded-For` **from the right**, skipping `TRUSTED_PROXY_COUNT`
   proxy-appended hops (env, default 1); the index is clamped so a short/forged header can never
   select a left, caller-supplied entry.
3. Fall back to `"anon"`.

**Measured (after fix), live:** rotating left XFF behind one simulated trusted proxy
(`X-Forwarded-For: 10.0.0.$i, 203.0.113.7`) → **429 after 30**; `X-Real-IP` present with a spoofed
rotating XFF → **429 after 30**.

**Test coverage:** new `src/lib/__tests__/client-ip.test.ts` (5 cases): platform value wins; 50
rotating left-XFF values collapse to one derived client; right-most proxy-appended entry is read;
`anon` fallback; whitespace trim.

**Remaining recommendation (defense in depth, not replaced by this fix):** keep a Vercel Firewall
rate-limit rule in front of `/api/scan`; set `TRUSTED_PROXY_COUNT` to match the real number of
proxies if more than one is in front. In a deployment with no trusted proxy appending a value, no
header can yield a trustworthy IP — that is inherent.

---

## F-3 — Trends "people" count inflation (chains on F-2) — Low

**Location:** `src/lib/trends/store.ts:81` — `who = sha256(day|ip|token)` used the same
client-controlled `ip`.

**Description:** With F-2, one actor rotating `X-Forwarded-For` produces many distinct `who` hashes,
which the HyperLogLog people-count treats as distinct people. Because `recordScan` only records a
`dangerous` + `listable()` sighting and the public list needs `TREND_MIN_PEOPLE = 3`, a single actor
could exceed that threshold and force a borderline (e.g. free-hosting) domain onto the
"currently circulating" list once it is rated dangerous.

**Status of verification:** Confirmed at code level; **not live-demoable** in this environment — no
Redis/KV was configured locally, so `recordScan` returns early (`config() === null`). Depends on
F-2.

**Severity:** Low (trends-list integrity / minor reputation impact).

**Fix:** Transitive. `recordScan(report, ip)` receives the route's IP, which is now the trusted
value from `clientIp(req)`; no change was needed inside `store.ts`. Fixing F-2 fixes F-3.

**Remaining recommendation:** same as F-2 (trusted IP + Firewall). The `listable()` gate (Tranco
> 10k, not a shared host) and the `verdict === 'dangerous'` requirement remain in place as
additional barriers.

---

## F-4 — CSP `script-src` includes `'unsafe-inline'` (and `'unsafe-eval'` in dev) — Nit / hardening

**Location:** `next.config.ts:5`.

**Description:** The CSP is otherwise strong (`frame-ancestors 'none'`, `object-src 'none'`,
`base-uri 'self'`, `form-action 'self'`, `connect-src 'self'`, HSTS preload — all confirmed live).
However `script-src` contains `'unsafe-inline'`, which removes most of the CSP's XSS value *if* an
injection sink existed. `'unsafe-eval'` is additionally present, but only in development:

```js
"script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "")
```

So **in production only `'unsafe-inline'` remains**; `'unsafe-eval'` is dev-only (Next.js dev
tooling) and does not ship.

**Impact:** None demonstrated — no injection sink was found (see Controls: Stored-XSS). This is
defense-in-depth only.

**Severity:** Nit / hardening. No code change made.

**Remaining recommendation:** if feasible, move inline scripts (e.g. the pre-paint theme script in
`src/app/[locale]/layout.tsx`) to a CSP nonce or hash and drop `'unsafe-inline'` from production
`script-src`.

---

## Controls that held (checked, no finding)

- **A — SSRF via the plain fetcher (`safe-fetch.ts`):** all 17 live probes blocked on the *resolved*
  IP — loopback, decimal/octal/hex/whole-hex, IPv6 `::1`/IPv4-mapped/NAT64, `169.254.169.254`,
  RFC-1918, CGNAT, `0.0.0.0`, userinfo-confusion (`…@127.0.0.1`) → `non_public_address:*`;
  non-allowed ports → `port_not_allowed`. Resolution is pinned and every redirect hop re-validated.
- **B — Egress proxy for the headless browser (`egress-proxy.ts`, `render/browser.ts`):** by code —
  Chrome resolves nothing (`--host-resolver-rules=MAP * ~NOTFOUND`), default proxy is a closed port,
  the proxy is the single resolver (`resolvePublic` pin + port allowlist + byte/socket caps), and
  the `x-egress-blocked` refusal token is random per instance. (See *Not live-tested*.)
- **I — Stored XSS in the result UI:** `Report.tsx`, `Scanner.tsx`, `CheckReport.tsx` use no
  `dangerouslySetInnerHTML`; scan-derived strings render through React escaping. The only two uses
  in the codebase are static (a theme script, and `<`-escaped JSON-LD in `seo.tsx`).
- **D — Contact form (`contact.ts`):** honeypot (`website`) returns `{ok:true}` with no mail (live);
  `email` is `zod`-validated and delivery is Resend's JSON API (not SMTP), so CRLF header injection
  is not reachable; `name`/`message` land in the text body only.
- **F — Request validation:** boundaries enforced live — `url` 4096 ok / 4097 → 400; `text` 100000
  ok / 100001 → 400; non-JSON body and unknown `mode` → generic `400`.
- **G — AI layer prompt-injection framing (`analyzers/ai.ts`):** by code — `<page_data>` / `<message>`
  framing with `<`-escaping and a per-request random id, `json_schema`-constrained output, and
  `redact()` applied before the model. (See *Not live-tested*.)
- **J — Secrets & info disclosure:** `GET /api/scan` returns only `{service,version,ai}`; error
  paths emit generic codes; `.env.local` is git-ignored and not tracked (`git check-ignore` /
  `git ls-files` confirmed). No key observed in any response.
- **RDAP / crt.sh (`analyzers/reputation.ts`):** uses global `fetch`, but target hosts come from
  IANA's trusted RDAP bootstrap keyed by real TLDs (plus a small static fallback map); the
  attacker-controlled domain only appears `encodeURIComponent`-escaped in the path — not
  host-steerable, so not an SSRF vector.

---

## Remaining recommendations / defense in depth

1. **Vercel Firewall rate-limit rule** in front of `/api/scan` (and `/api/contact`) — the F-2 code
   fix removes the trivial header-spoof bypass but does not replace a platform-level limit.
2. **Set `TRUSTED_PROXY_COUNT`** to the real number of proxies in front of the app if more than one.
3. **Optionally lower the `zod` `text` max** from 100 000 (`scan/route.ts:16`) to shrink the parser
   attack surface.
4. **CSP:** move inline scripts to nonces/hashes and drop `'unsafe-inline'` from production
   `script-src` (F-4).

---

## Not live-tested (honest disclosure)

- **B — Egress proxy:** reviewed by code only. A full live test needs a local Chrome enabled and a
  throwaway public tunnel hosting an attack page that calls `fetch`/`<img>`/`<iframe>`/WebRTC at
  `127.0.0.1` / `169.254.169.254` / `10.x` / `127.0.0.1:9` from inside the rendered page. The dev
  server here ran with `RENDER_DISABLED=1`.
- **G — Prompt injection:** reviewed by code only. The AI layer is live-enabled (`GET /api/scan`
  reports `ai:true`), but no injection payload was sent against the real `ANTHROPIC_API_KEY`.

---

## Change inventory (pending commit)

- `src/lib/text/parse.ts` — bounded `URL_RE`; `MAX_SCAN_CHARS` cap in `extractUrls` (F-1).
- `src/lib/client-ip.ts` — new `clientIp(req)` helper (F-2 / F-3).
- `src/app/api/scan/route.ts`, `src/app/api/screenshot/route.ts`, `src/app/api/contact/route.ts` —
  use `clientIp(req)` (F-2 / F-3).
- `src/lib/__tests__/redos.test.ts` — new (F-1 regression).
- `src/lib/__tests__/client-ip.test.ts` — new (F-2 regression).
- Test suite: **444 → 461 passing.**
