import { describe, expect, it } from "vitest";
import parity from "@/lib/model/parity.json";
import { domainFeatures, FEATURE_NAMES } from "@/lib/analyzers/lexical-features";
import { modelContext, rawScore, sigmoid } from "@/lib/analyzers/domain-model";

const samples = parity as { domain: string; features: number[]; p: number }[];

// Suffixes added to the Public Suffix List after the snapshot bundled with Python's tldextract.
// tldts ships a newer PSL, so these domains legitimately split differently.
const PSL_DRIFT = new Set(["bank.in"]);

describe("python/typescript parity", () => {
  it.each(samples.filter((s) => !PSL_DRIFT.has(s.domain)).map((s) => [s.domain, s] as const))("%s", (_domain, s) => {
    const x = domainFeatures(s.domain, modelContext);
    FEATURE_NAMES.forEach((name, i) => {
      expect(x[i], name).toBeCloseTo(s.features[i], 5);
    });
    expect(sigmoid(rawScore(x))).toBeCloseTo(s.p, 5);
  });
});
