"""Train and export the Mailharpoon domain model.

Usage:
    python ml/train.py --phiusiil PhiUSIIL_Phishing_URL_Dataset.csv --tranco top-1m.csv --openphish feed.txt

Outputs (consumed by the Next.js app):
    src/lib/model/domain-model.json   gradient-boosted trees + TLD risk table
    src/lib/model/parity.json         sample vectors for the TS parity test
    ml/model-card.json                metrics for the transparency page
"""

import argparse
import ipaddress
import json
import random
from pathlib import Path
from urllib.parse import urlparse

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import (average_precision_score, brier_score_loss, f1_score,
                             precision_score, recall_score, roc_auc_score)
from sklearn.model_selection import train_test_split

from features import FEATURE_NAMES, domain_features, ngrams, split_host

ROOT = Path(__file__).resolve().parent.parent
MODEL_DIR = ROOT / "src" / "lib" / "model"
TRANCO_LEGIT_TOP = 200_000
SEED = 42


def host_of(url: str) -> str | None:
    url = url.strip()
    if "://" not in url:
        url = "http://" + url
    try:
        host = (urlparse(url).hostname or "").lower().strip(".")
    except ValueError:
        return None
    if not host:
        return None
    try:
        ipaddress.ip_address(host)
        return None  # IP hosts are handled by a hard rule, not the model
    except ValueError:
        return host


def registrable(host: str) -> str | None:
    sld, suffix = split_host(host)
    if not sld or not suffix:
        return None
    return f"{sld}.{suffix}"


def load_rows(args) -> pd.DataFrame:
    rows: list[tuple[str, int, str]] = []

    phi = pd.read_csv(args.phiusiil, usecols=["URL", "label"], encoding="utf-8-sig")
    for url, label in zip(phi.URL, phi.label):
        h = host_of(url)
        if h:
            rows.append((h, 1 - int(label), "phiusiil"))  # PhiUSIIL: 1 = legitimate

    tranco = pd.read_csv(args.tranco, header=None, names=["rank", "domain"], nrows=TRANCO_LEGIT_TOP)
    rows += [(d.lower(), 0, "tranco") for d in tranco.domain]

    for line in Path(args.openphish).read_text().splitlines():
        h = host_of(line)
        if h:
            rows.append((h, 1, "openphish"))

    df = pd.DataFrame(rows, columns=["host", "y", "source"])
    df["domain"] = df.host.map(registrable)
    df = df.dropna(subset=["domain"])

    # One row per registrable domain; drop domains with conflicting labels.
    agg = df.groupby("domain").agg(y_min=("y", "min"), y_max=("y", "max"), source=("source", "first"))
    agg = agg[agg.y_min == agg.y_max].rename(columns={"y_min": "y"}).drop(columns="y_max").reset_index()
    return agg


def tld_of(domain: str) -> str:
    return domain.rsplit(".", 1)[-1]


def tld_risk_table(train: pd.DataFrame, m: float = 25.0) -> tuple[dict[str, float], float]:
    """m-estimate smoothed P(phish | TLD), fitted on the training fold only."""
    prior = float(train.y.mean())
    stats = train.assign(tld=train.domain.map(tld_of)).groupby("tld").y.agg(["sum", "count"])
    table = ((stats["sum"] + m * prior) / (stats["count"] + m)).round(6).to_dict()
    return table, round(prior, 6)


def ngram_table(domains, ys, alpha: float = 1.0, min_count: int = 5) -> tuple[dict[str, float], float]:
    """Laplace-smoothed per-trigram log-likelihood ratios (phish vs legit)."""
    counts = [{}, {}]
    for d, y in zip(domains, ys):
        for g in ngrams(split_host(d)[0]):
            counts[y][g] = counts[y].get(g, 0) + 1
    vocab = set(counts[0]) | set(counts[1])
    totals = [sum(c.values()) + alpha * len(vocab) for c in counts]
    table = {}
    for g in vocab:
        c0, c1 = counts[0].get(g, 0), counts[1].get(g, 0)
        if c0 + c1 >= min_count:
            table[g] = round(float(np.log((c1 + alpha) / totals[1]) - np.log((c0 + alpha) / totals[0])), 4)
    unseen = round(float(np.log(alpha / totals[1]) - np.log(alpha / totals[0])), 4)
    return table, unseen


def make_ctx(train: pd.DataFrame) -> dict:
    tld, prior = tld_risk_table(train)
    llr, unseen = ngram_table(train.domain, train.y)
    return {"tldRisk": tld, "tldPrior": prior, "ngramLlr": llr, "ngramUnseen": unseen}


def featurize(domains, ctx) -> pd.DataFrame:
    return pd.DataFrame([domain_features(d, ctx) for d in domains])[FEATURE_NAMES]


def featurize_oof(train: pd.DataFrame, folds: int = 5) -> pd.DataFrame:
    """Out-of-fold features for the training set, so target-derived tables never see their own row."""
    parts = []
    for k, idx in enumerate(np.array_split(np.random.RandomState(SEED).permutation(len(train)), folds)):
        mask = np.zeros(len(train), dtype=bool)
        mask[idx] = True
        ctx = make_ctx(train[~mask])
        parts.append(featurize(train.domain.values[mask], ctx).set_index(train.index[mask]))
    return pd.concat(parts).loc[train.index]


def export_trees(model: HistGradientBoostingClassifier) -> list[list[list[float]]]:
    trees = []
    for (predictor,) in model._predictors:
        nodes = predictor.nodes
        trees.append([
            [int(n["feature_idx"]), float(n["num_threshold"]), int(n["left"]), int(n["right"]),
             round(float(n["value"]), 8), int(n["is_leaf"])]
            for n in nodes
        ])
    return trees


def metrics(y, p, threshold=0.5) -> dict[str, float]:
    pred = (p >= threshold).astype(int)
    return {
        "roc_auc": round(roc_auc_score(y, p), 4),
        "pr_auc": round(average_precision_score(y, p), 4),
        "precision": round(precision_score(y, pred), 4),
        "recall": round(recall_score(y, pred), 4),
        "f1": round(f1_score(y, pred), 4),
        "brier": round(brier_score_loss(y, p), 4),
        "n": int(len(y)),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--phiusiil", required=True)
    ap.add_argument("--tranco", required=True)
    ap.add_argument("--openphish", required=True)
    args = ap.parse_args()

    df = load_rows(args)
    print(df.groupby(["source", "y"]).size())

    # OpenPhish is the freshest data: hold it out entirely as a recency test.
    fresh = df[df.source == "openphish"]
    df = df[df.source != "openphish"]
    train, test = train_test_split(df, test_size=0.2, stratify=df.y, random_state=SEED)

    ctx = make_ctx(train)
    X_train, X_test = featurize_oof(train), featurize(test.domain, ctx)

    # Balanced class weights -> the logit approximates a likelihood ratio,
    # which is what the evidence-fusion layer expects.
    w = np.where(train.y == 1, 0.5 / train.y.mean(), 0.5 / (1 - train.y.mean()))
    model = HistGradientBoostingClassifier(
        max_iter=250, learning_rate=0.08, max_leaf_nodes=31, min_samples_leaf=40,
        l2_regularization=1.0, early_stopping=True, validation_fraction=0.1, random_state=SEED,
    )
    model.fit(X_train, train.y, sample_weight=w)

    p_test = model.predict_proba(X_test)[:, 1]
    card = {"test": metrics(test.y.values, p_test)}

    top10k = pd.read_csv(args.tranco, header=None, names=["rank", "domain"], nrows=10_000).domain
    top10k = [d for d in top10k if registrable(d)]
    p_top = model.predict_proba(featurize(top10k, ctx))[:, 1]
    card["tranco_top10k_false_positive_rate"] = round(float((p_top >= 0.5).mean()), 4)

    if len(fresh):
        p_fresh = model.predict_proba(featurize(fresh.domain, ctx))[:, 1]
        card["openphish_fresh_recall"] = round(float((p_fresh >= 0.5).mean()), 4)
        card["openphish_fresh_n"] = int(len(fresh))

    card.update({
        "features": FEATURE_NAMES,
        "train_size": int(len(train)),
        "sources": {"phiusiil": "UCI PhiUSIIL (Prasad & Chandra, 2024)",
                    "tranco": f"Tranco top {TRANCO_LEGIT_TOP:,} (legitimate)",
                    "openphish": "OpenPhish public feed (held out, recency test)"},
        "iterations": int(model.n_iter_),
    })
    print(json.dumps(card, indent=2))

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    (MODEL_DIR / "domain-model.json").write_text(json.dumps({
        "version": 2,
        "features": FEATURE_NAMES,
        "baseline": float(np.ravel(model._baseline_prediction)[0]),
        "trees": export_trees(model),
        **ctx,
    }, separators=(",", ":")))

    rnd = random.Random(SEED)
    sample = rnd.sample(list(test.domain), 150) + rnd.sample(top10k, 50) + list(fresh.domain[:50])
    Xs = featurize(sample, ctx)
    (MODEL_DIR / "parity.json").write_text(json.dumps([
        {"domain": d, "features": Xs.iloc[i].tolist(), "p": round(float(p), 8)}
        for i, (d, p) in enumerate(zip(sample, model.predict_proba(Xs)[:, 1]))
    ]))
    (ROOT / "ml" / "model-card.json").write_text(json.dumps(card, indent=2))


if __name__ == "__main__":
    main()
