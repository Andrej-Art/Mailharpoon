// The latest weekly evaluation (scripts/eval-weekly.mts), shown on the home and methodology pages.
import latest from "../../ml/eval-history/latest.json";

export interface EvalMetric {
  threshold: number;
  recall: number;
  fpr: number;
}

export const latestEval = latest as { date: string; sample: { phishing: number; legitimate: number }; metrics: EvalMetric[] };

// The two verdict boundaries of the fusion: suspicious from 35, dangerous from 70.
const at = (threshold: number) => latestEval.metrics.find((m) => m.threshold === threshold)!;

/** Counts out of the sample per verdict: how many phishing links and legitimate sites were rated dangerous, and how many more suspicious. */
export function evalCounts() {
  const { phishing, legitimate } = latestEval.sample;
  const count = (rate: number, n: number) => Math.round(rate * n);
  const caught = count(at(70).recall, phishing);
  const falseAlarms = count(at(70).fpr, legitimate);
  return {
    phishing,
    legitimate,
    caught,
    caughtSuspicious: count(at(35).recall, phishing) - caught,
    falseAlarms,
    falseSuspicious: count(at(35).fpr, legitimate) - falseAlarms,
  };
}
