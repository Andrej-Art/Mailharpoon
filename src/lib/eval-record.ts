// What the evaluation scripts may store about a scanned link. Phishing links often carry the
// victim's e-mail address, name or a tracking token, and the results are committed to a public
// repository, so only the origin and a masked path are ever kept.
import { fuse, type Fused } from "./analyzers/fusion";
import type { LayerResult } from "./analyzers/types";

const EMAIL = /[^\s/@?#&=]+@[^\s/@?#&=]+\.[a-z]{2,}/gi;
// Long opaque path segments are usually per-victim tokens, sometimes an encoded address.
const TOKEN = /^[A-Za-z0-9_=-]{24,}$/;

/** The link without query string, fragment, credentials, e-mail addresses and long tokens. */
export function stripUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return raw.replace(/[?#].*$/, "").replace(EMAIL, "[email]");
  }
  const path = url.pathname
    .split("/")
    .map((seg) => {
      const s = (() => {
        try {
          return decodeURIComponent(seg);
        } catch {
          return seg;
        }
      })();
      if (EMAIL.test(s)) return "[email]";
      EMAIL.lastIndex = 0;
      return TOKEN.test(seg) ? "[token]" : seg;
    })
    .join("/");
  return `${url.protocol}//${url.host}${path}`;
}

/** One stored signal: enough to recompute the verdict under another fusion rule. */
export interface StoredSignal {
  id: string;
  layer: string;
  weight: number;
  override?: "malicious" | "benign";
}

export interface EvalRow {
  set: "phish" | "legit";
  url: string;
  score: number;
  /** Score under the candidate rule that is being tested alongside the live one. */
  candidate: number;
  /** Layers that ran successfully, the others were skipped or failed. */
  ok: string[];
  signals: StoredSignal[];
}

/** A scan reduced to what may be stored, with both the live and the candidate score. */
export function evalRow(set: EvalRow["set"], url: string, layers: LayerResult[], live: Fused): EvalRow {
  return {
    set,
    url: stripUrl(url),
    score: live.score,
    candidate: fuse(layers, { candidate: true }).score,
    ok: layers.filter((l) => l.status === "ok").map((l) => l.layer),
    signals: layers.flatMap((l) => l.signals).map(({ id, layer, weight, override }) => ({ id, layer, weight, ...(override ? { override } : {}) })),
  };
}
