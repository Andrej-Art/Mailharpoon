# Text evaluation sets

| File | Content | Purpose |
|---|---|---|
| `en_sample.jsonl` | 150 phishing + 150 benign messages (emails and SMS), random sample (seed 2026) from [ealvaradob/phishing-dataset](https://huggingface.co/datasets/ealvaradob/phishing-dataset) `texts.json`, Apache-2.0. Sources: Enron-based phishing email corpus and the Mendeley SMS phishing dataset. | Broad benchmark. English only, partly old, and "phishing" includes generic spam. |
| `de_handcrafted.jsonl` | German messages modelled on current scam campaigns plus benign counterparts, written for this project. | Regression test only. Self-written examples are easier than real ones, so this set does not measure real-world accuracy. |

Run: `npx tsx scripts/eval-text.mts` (add `ANTHROPIC_API_KEY` to include the AI layer).

## Results (2026-10-31)

Links are not fetched in this evaluation. AI layer: Claude Haiku 5.5, with a retry on Claude Sonnet 5.5 when Haiku declines (about 10% of the English spam, mostly adult or drug content). Tuning was done on a separate, disjoint dev set (`ml/text-dev/en_dev.jsonl`, 100/100). The test sets below were run once after tuning.

| Set | Layers | Threshold 35 | Threshold 50 | Threshold 70 |
|---|---|---|---|---|
| `en_sample` (150/150) | rules only | 13% recall, 2% FP | 5% recall, 1% FP | 2% recall, 0% FP |
| `en_sample` (150/150) | rules + AI | 91% recall, 1% FP | 81% recall, 1% FP | 19% recall, 0% FP |
| `de_handcrafted` (25/25) | rules only | 96% recall, 4% FP | 96% recall, 0% FP | 64% recall, 0% FP |
| `de_handcrafted` (25/25) | rules + AI | 100% recall, 0% FP | 100% recall, 0% FP | 100% recall, 0% FP |

Recall at threshold 70 stays low on the English set by design. Most of its "phishing" label is generic spam, which Mailharpoon rates as "suspicious" (35 to 70) rather than "dangerous". The German set is self-written and therefore optimistic.
