// The latest weekly evaluation (scripts/eval-weekly.mts), shown on the home and methodology pages.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import latest from "../../ml/eval-history/latest.json";

export interface EvalMetric {
  threshold: number;
  recall: number;
  fpr: number;
}

/** `candidate` holds the scores of a fusion rule tested next to the live one, present from November 2026 on. */
export const latestEval = latest as { date: string; sample: { phishing: number; legitimate: number }; metrics: EvalMetric[]; candidate?: EvalMetric[] };

// The two verdict boundaries of the fusion: suspicious from 35, dangerous from 70.
const at = (threshold: number) => latestEval.metrics.find((m) => m.threshold === threshold)!;

/** Counts out of the sample per verdict, for both sets: phishing caught, flagged or missed; real sites safe, flagged or wrongly rated dangerous. */
export function evalCounts() {
  const { phishing, legitimate } = latestEval.sample;
  const count = (rate: number, n: number) => Math.round(rate * n);
  const caught = count(at(70).recall, phishing);
  const flagged = count(at(35).recall, phishing);
  const falseAlarms = count(at(70).fpr, legitimate);
  const falseFlagged = count(at(35).fpr, legitimate);
  return {
    phishing,
    legitimate,
    caught,
    flagged,
    caughtSuspicious: flagged - caught,
    missed: phishing - flagged,
    falseAlarms,
    falseSuspicious: falseFlagged - falseAlarms,
    legitSafe: legitimate - falseFlagged,
    notDangerous: legitimate - falseAlarms,
  };
}

/** Every stored weekly evaluation, oldest first, read at build time for the methodology page. */
export function evalHistory(): { date: string; metrics: EvalMetric[] }[] {
  const dir = join(process.cwd(), "ml", "eval-history");
  return readdirSync(dir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));
}
