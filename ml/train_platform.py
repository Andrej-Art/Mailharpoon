"""Train and export the platform-label model.

On free hosting platforms (github.io, pages.dev, vercel.app, web.app ...) the registrable domain is
`<label>.<platform>`, and only the label is chosen by whoever runs the page. The main domain model
must not judge these hosts: its legitimate training data (Tranco, PhiUSIIL) holds no page on such a
platform, so it learned "platform = phishing" (audit of 2026-11-14). This model fills the gap. It
sees only features of the label and learns from real labels on both sides:

  phishing      PhiUSIIL phishing URLs on platforms + OpenPhish archive domains on platforms
  legitimate    GitHub user and organisation names (= <name>.github.io) and repository names
                (= typical project names on vercel.app, netlify.app, pages.dev, web.app)

The newest OpenPhish days (--test-from onward) and 20 % of the GitHub names are held out as the test.

Usage:
    python ml/train_platform.py --phiusiil PhiUSIIL_Phishing_URL_Dataset.csv \
        --feed data/feeds/openphish/2026-11.tsv --github-labels labels.json --test-from 2026-11-09

`labels.json` holds {"users": [...], "repos": [...]} from the GitHub API (GET /users?since=N and
GET /repositories?since=N at random offsets). The names stay out of the repository, the export
contains trigram statistics only.

Outputs:
    src/lib/model/platform-model.json    trees + label trigram table
    src/lib/model/platform-parity.json   sample vectors for the TS parity test (phishing labels only)
    ml/platform-model-card.json          held-out metrics
"""

import argparse
import json
import random
import re
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score

from features import FEATURE_NAMES, domain_features, split_host
from train import export_trees, host_of, make_ctx

ROOT = Path(__file__).resolve().parent.parent
MODEL_DIR = ROOT / "src" / "lib" / "model"
SEED = 42
# Features of the label only. Everything derived from the platform suffix is left out, because the
# legitimate names are placed on a stand-in platform and would otherwise teach the suffix.
LABEL_FEATURES = [f for f in FEATURE_NAMES if f not in ("is_free_hosting", "suffix_levels", "tld_len", "tld_risk")]
EMPTY = {"tldRisk": {}, "tldPrior": 0.0, "ngramLlr": {}, "ngramUnseen": 0.0}


def is_platform(host: str) -> bool:
    return domain_features(host, EMPTY)["is_free_hosting"] == 1


def platform_host(host: str) -> str | None:
    """`a.b.label.pages.dev` -> `label.pages.dev`; None when the host is not on a platform."""
    sld, suffix = split_host(host)
    return f"{sld}.{suffix}" if sld and suffix and is_platform(f"{sld}.{suffix}") else None


def as_label(name: str) -> str | None:
    """A GitHub name as it appears in a host label."""
    label = re.sub(r"[^a-z0-9-]", "-", name.lower()).strip("-")
    label = re.sub(r"-{2,}", "-", label)
    return label[:63] or None


def load(args) -> tuple[pd.DataFrame, pd.DataFrame]:
    rows = []
    phi = pd.read_csv(args.phiusiil, usecols=["URL", "label"], encoding="utf-8-sig")
    for url, label in zip(phi.URL, phi.label):
        h = host_of(url)
        p = platform_host(h) if h else None
        if p and int(label) == 0:  # PhiUSIIL: 0 = phishing
            rows.append((p, 1, "phiusiil", ""))
    feed = pd.read_csv(args.feed, sep="\t", header=None, names=["day", "url"])
    for day, url in zip(feed.day, feed.url):
        h = host_of(url)
        p = platform_host(h) if h else None
        if p:
            rows.append((p, 1, "openphish", day))

    gh = json.loads(Path(args.github_labels).read_text())
    rnd = random.Random(SEED)
    for kind, names, suffixes in (("user", gh["users"], ["github.io"]), ("repo", gh["repos"], ["vercel.app", "pages.dev", "netlify.app", "web.app"])):
        for n in names:
            label = as_label(n)
            if label:
                rows.append((f"{label}.{rnd.choice(suffixes)}", 0, f"github-{kind}", ""))

    # Real pages on platforms (homepage and blog fields of GitHub repositories and their owners),
    # minus the hosts reserved for the holdout scan.
    if args.extra_legit:
        exclude = set(Path(args.exclude).read_text().split()) if args.exclude else set()
        for line in Path(args.extra_legit).read_text().split():
            h = host_of(line)
            p = platform_host(h) if h else None
            if p and p not in exclude:
                rows.append((p, 0, "github-homepage", ""))

    df = pd.DataFrame(rows, columns=["host", "y", "source", "day"])
    df["label"] = df.host.map(lambda h: split_host(h)[0])
    # One row per label; a label seen on both sides is dropped.
    first = df.sort_values("day").groupby("label").agg(host=("host", "first"), y_min=("y", "min"), y_max=("y", "max"), source=("source", "first"), day=("day", "first"))
    df = first[first.y_min == first.y_max].rename(columns={"y_min": "y"}).drop(columns="y_max").reset_index()

    fresh = (df.source == "openphish") & (df.day >= args.test_from)
    legit_idx = df.index[df.y == 0]
    held = set(pd.Series(legit_idx).sample(frac=0.2, random_state=SEED))
    test = df[fresh | df.index.isin(held)]
    return df.drop(test.index).reset_index(drop=True), test.reset_index(drop=True)


def featurize(hosts, ctx) -> pd.DataFrame:
    return pd.DataFrame([domain_features(h, ctx) for h in hosts])[LABEL_FEATURES]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--phiusiil", required=True)
    ap.add_argument("--feed", required=True)
    ap.add_argument("--github-labels", required=True)
    ap.add_argument("--test-from", required=True)
    ap.add_argument("--extra-legit", help="real platform page URLs, one per line")
    ap.add_argument("--exclude", help="platform hosts kept out of training (holdout), one per line")
    args = ap.parse_args()

    train, test = load(args)
    print(train.groupby(["source", "y"]).size(), test.groupby(["source", "y"]).size(), sep="\n")

    # Trigram table out of fold for the training rows, as in ml/train.py.
    parts = []
    for idx in np.array_split(np.random.RandomState(SEED).permutation(len(train)), 5):
        mask = np.zeros(len(train), dtype=bool)
        mask[idx] = True
        parts.append(featurize(train.host.values[mask], make_ctx(train[~mask].assign(domain=train.host[~mask]))).set_index(train.index[mask]))
    X = pd.concat(parts).loc[train.index]
    ctx = make_ctx(train.assign(domain=train.host))

    w = np.where(train.y == 1, 0.5 / train.y.mean(), 0.5 / (1 - train.y.mean()))
    model = HistGradientBoostingClassifier(max_iter=200, learning_rate=0.08, max_leaf_nodes=31, min_samples_leaf=40,
                                           l2_regularization=1.0, early_stopping=True, validation_fraction=0.1, random_state=SEED)
    model.fit(X, train.y, sample_weight=w)

    Xt = featurize(test.host, ctx)
    p = model.predict_proba(Xt)[:, 1]
    phish, legit = p[test.y.values == 1], p[test.y.values == 0]
    card = {
        "test_from": args.test_from,
        "train_n": int(len(train)),
        "test_phishing_n": int(len(phish)),
        "test_legit_n": int(len(legit)),
        "roc_auc": round(float(roc_auc_score(test.y, p)), 4),
        "operating_points": [
            {"p": t, "recall": round(float((phish >= t).mean()), 3), "false_positive_rate": round(float((legit >= t).mean()), 3)}
            for t in (0.5, 0.7, 0.8, 0.9, 0.95)
        ],
        "features": LABEL_FEATURES,
        "iterations": int(model.n_iter_),
    }
    print(json.dumps(card, indent=2))

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    (MODEL_DIR / "platform-model.json").write_text(json.dumps({
        "version": 1,
        "features": LABEL_FEATURES,
        "baseline": float(np.ravel(model._baseline_prediction)[0]),
        "trees": export_trees(model),
        "tldRisk": {}, "tldPrior": 0.0, "ngramLlr": ctx["ngramLlr"], "ngramUnseen": ctx["ngramUnseen"],
    }, separators=(",", ":")))
    sample = random.Random(SEED).sample(list(test.host[test.y == 1]), 60)
    Xs = featurize(sample, {**ctx, "tldRisk": {}, "tldPrior": 0.0})
    (MODEL_DIR / "platform-parity.json").write_text(json.dumps([
        {"host": h, "features": Xs.iloc[i].tolist(), "p": round(float(q), 8)}
        for i, (h, q) in enumerate(zip(sample, model.predict_proba(Xs)[:, 1]))
    ]))
    (ROOT / "ml" / "platform-model-card.json").write_text(json.dumps(card, indent=2) + "\n")


if __name__ == "__main__":
    main()
