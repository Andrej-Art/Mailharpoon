// Statistics for the live evaluation: rates with their uncertainty, so a small weekly sample is
// never shown as more precise than it is.

export interface Interval {
  rate: number;
  low: number;
  high: number;
}

/** Wilson score interval (95 %), which stays sensible for rates near 0 or 1 and small samples. */
export function wilson(k: number, n: number, z = 1.96): Interval {
  if (n === 0) return { rate: 0, low: 0, high: 0 };
  const p = k / n;
  const z2 = z * z;
  const centre = (p + z2 / (2 * n)) / (1 + z2 / n);
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n);
  return { rate: p, low: Math.max(0, centre - half), high: Math.min(1, centre + half) };
}

export const THRESHOLDS = [35, 50, 70] as const;

/** Recall and false-alarm rate per threshold for one set of scores. */
export function metricsOf(phish: number[], legit: number[]) {
  return THRESHOLDS.map((threshold) => ({
    threshold,
    recall: Number((phish.filter((s) => s >= threshold).length / Math.max(phish.length, 1)).toFixed(3)),
    fpr: Number((legit.filter((s) => s >= threshold).length / Math.max(legit.length, 1)).toFixed(3)),
  }));
}
