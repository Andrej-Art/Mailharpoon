"""Domain-level lexical features for the Mailharpoon ML layer.

Every function here has a 1:1 TypeScript twin in src/lib/analyzers/lexical-features.ts.
The parity test (ml/export_parity.py + src/lib/__tests__/parity.test.ts) guarantees both
produce identical vectors, so keep the two files in sync.

Design note: the model sees ONLY the registrable domain (private PSL entries such as
`*.firebaseapp.com` count as suffixes). Scheme, `www.`, subdomains and path are
handled by explainable heuristics instead, because PhiUSIIL's legitimate URLs are all
`https://www.<domain>` without a path – a model trained on full URLs only learns that bias.
"""

import json
import math
import re
from pathlib import Path

import tldextract

DATA_DIR = Path(__file__).resolve().parent.parent / "src" / "lib" / "data"
BRANDS: dict[str, list[str]] = json.loads((DATA_DIR / "brands.json").read_text())
LEXICON = json.loads((DATA_DIR / "lexicon.json").read_text())

KEYWORDS = [k for k in LEXICON["suspicious_keywords"] if len(k) >= 4 and k.isascii()]
FREE_HOSTING = LEXICON["free_hosting_suffixes"]
BRAND_NAMES = [b for b in BRANDS if len(b) >= 4]
VOWELS = set("aeiou")

_extract = tldextract.TLDExtract(include_psl_private_domains=True, suffix_list_urls=())

FEATURE_NAMES = [
    "sld_len",
    "sld_digit_count",
    "sld_digit_ratio",
    "sld_hyphen_count",
    "sld_entropy",
    "sld_vowel_ratio",
    "sld_max_consonant_run",
    "sld_max_digit_run",
    "sld_max_repeat_run",
    "sld_token_count",
    "sld_longest_token",
    "sld_keyword_count",
    "sld_brand_hit",
    "is_punycode",
    "is_free_hosting",
    "suffix_levels",
    "tld_len",
    "tld_risk",
    "sld_ngram_llr",
]

NGRAM_N = 3


def split_host(host: str) -> tuple[str, str]:
    """Return (sld, suffix) using the private-domain-aware PSL."""
    ext = _extract(host.lower().strip("."))
    return ext.domain, ext.suffix


def shannon_entropy(s: str) -> float:
    if not s:
        return 0.0
    counts: dict[str, int] = {}
    for ch in s:
        counts[ch] = counts.get(ch, 0) + 1
    n = len(s)
    return -sum((c / n) * math.log2(c / n) for c in counts.values())


def max_run(s: str, pred) -> int:
    best = cur = 0
    for ch in s:
        cur = cur + 1 if pred(ch) else 0
        best = max(best, cur)
    return best


def max_repeat_run(s: str) -> int:
    best = cur = 0
    prev = ""
    for ch in s:
        cur = cur + 1 if ch == prev else 1
        prev = ch
        best = max(best, cur)
    return best


def brand_hit(sld: str, registrable: str) -> int:
    for brand in BRAND_NAMES:
        if brand in sld and registrable not in BRANDS[brand]:
            return 1
    return 0


def ngrams(sld: str) -> list[str]:
    padded = f"^{sld}$"
    return [padded[i:i + NGRAM_N] for i in range(len(padded) - NGRAM_N + 1)]


def ngram_llr(sld: str, table: dict[str, float], unseen: float) -> float:
    """Mean per-trigram log-likelihood ratio log P(g|phish) - log P(g|legit)."""
    grams = ngrams(sld)
    if not grams:
        return 0.0
    return sum(table.get(g, unseen) for g in grams) / len(grams)


def domain_features(host: str, ctx: dict) -> dict[str, float]:
    """ctx: {tldRisk, tldPrior, ngramLlr, ngramUnseen} – the fitted lookup tables."""
    sld, suffix = split_host(host)
    registrable = f"{sld}.{suffix}" if suffix else sld
    tld = suffix.rsplit(".", 1)[-1] if suffix else ""
    letters = [c for c in sld if c.isalpha()]
    digits = sum(c.isdigit() for c in sld)
    tokens = [t for t in re.split(r"[-0-9]+", sld) if t]
    return {
        "sld_len": len(sld),
        "sld_digit_count": digits,
        "sld_digit_ratio": round(digits / len(sld), 6) if sld else 0.0,
        "sld_hyphen_count": sld.count("-"),
        "sld_entropy": round(shannon_entropy(sld), 6),
        "sld_vowel_ratio": round(sum(c in VOWELS for c in letters) / len(letters), 6) if letters else 0.0,
        "sld_max_consonant_run": max_run(sld, lambda c: c.isalpha() and c not in VOWELS),
        "sld_max_digit_run": max_run(sld, str.isdigit),
        "sld_max_repeat_run": max_repeat_run(sld),
        "sld_token_count": len(tokens),
        "sld_longest_token": max((len(t) for t in tokens), default=0),
        "sld_keyword_count": sum(1 for k in KEYWORDS if k in sld),
        "sld_brand_hit": brand_hit(sld, registrable),
        "is_punycode": int(sld.startswith("xn--") or "xn--" in suffix),
        "is_free_hosting": int(any(suffix == f or suffix.endswith("." + f) for f in FREE_HOSTING)),
        "suffix_levels": suffix.count(".") + 1 if suffix else 0,
        "tld_len": len(tld),
        "tld_risk": round(ctx["tldRisk"].get(tld, ctx["tldPrior"]), 6),
        "sld_ngram_llr": round(ngram_llr(sld, ctx["ngramLlr"], ctx["ngramUnseen"]), 6),
    }
