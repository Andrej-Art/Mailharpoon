// Inference for the gradient-boosted domain model exported by ml/train.py.
// Each node: [featureIdx, threshold, left, right, value, isLeaf]; x <= threshold goes left.
import model from "@/lib/model/domain-model.json";
import { domainFeatures, type FeatureContext } from "./lexical-features";

type Node = [number, number, number, number, number, number];

interface DomainModel extends FeatureContext {
  version: number;
  features: string[];
  baseline: number;
  trees: Node[][];
}

const M = model as unknown as DomainModel;

export function rawScore(x: number[]): number {
  let raw = M.baseline;
  for (const tree of M.trees) {
    let i = 0;
    while (!tree[i][5]) {
      const [f, thr, left, right] = tree[i];
      i = x[f] <= thr ? left : right;
    }
    raw += tree[i][4];
  }
  return raw;
}

export const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

export function predictDomain(host: string): { probability: number; logit: number; features: Record<string, number> } {
  const x = domainFeatures(host, M);
  const logit = rawScore(x);
  return {
    probability: sigmoid(logit),
    logit,
    features: Object.fromEntries(M.features.map((name, i) => [name, x[i]])),
  };
}

export const modelContext: FeatureContext = M;
