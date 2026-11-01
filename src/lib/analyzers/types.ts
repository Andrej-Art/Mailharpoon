export type Layer = "intel" | "reputation" | "lexical" | "brand" | "page" | "render" | "visual" | "redirect" | "network" | "ai" | "message" | "sender" | "links";

export type Severity = "info" | "low" | "medium" | "high" | "critical";

/**
 * One piece of evidence. `weight` is in log-odds units: positive pushes towards
 * phishing, negative towards legitimate. Text is resolved on the client from
 * `id` + `params` so both locales stay in sync.
 */
export interface Signal {
  id: string;
  layer: Layer;
  weight: number;
  severity: Severity;
  params?: Record<string, string | number>;
  /** Hard verdicts (blacklist hit) bypass the additive model. */
  override?: "malicious" | "benign";
}

export interface LayerResult<T = unknown> {
  layer: Layer;
  status: "ok" | "skipped" | "error";
  ms: number;
  signals: Signal[];
  data?: T;
  note?: string;
}

export const severityOf = (w: number): Severity =>
  w >= 3 ? "critical" : w >= 1.8 ? "high" : w >= 0.8 ? "medium" : w > 0 ? "low" : "info";

export const signal = (layer: Layer, id: string, weight: number, params?: Signal["params"]): Signal => ({
  layer,
  id,
  weight,
  severity: severityOf(weight),
  params,
});
