// Pages on free hosting platforms (github.io, pages.dev, vercel.app ...): who owns them, and what
// the platform-label model thinks of the part the page owner chose.
import owners from "@/lib/data/platform-owners.json";
import model from "@/lib/model/platform-model.json";
import { rawScoreWith, type TreeModel } from "./domain-model";
import { domainFeatures, FEATURE_NAMES } from "./lexical-features";

const OWNERS: Record<string, string> = { ...owners.hosts, ...(owners.manual as Record<string, string>) };

/** The brand that owns this platform page (microsoft.github.io -> microsoft), checked by scripts/build-platform-owners.mts. */
export const platformOwner = (registrable: string): string | null => OWNERS[registrable] ?? null;

/** Every verified platform page, as registrable -> brand. */
export const PLATFORM_OWNERS: Readonly<Record<string, string>> = OWNERS;

const M = model as unknown as TreeModel;
const INDEX = M.features.map((name) => FEATURE_NAMES.indexOf(name as (typeof FEATURE_NAMES)[number]));

/**
 * Phishing probability of a platform page from its label alone ("paypal-secure-login" in
 * paypal-secure-login.web.app). Trained by ml/train_platform.py on platform phishing against real
 * GitHub user and project names.
 */
export function predictPlatformLabel(registrable: string): { probability: number; logit: number; features: Record<string, number> } {
  const full = domainFeatures(registrable, M);
  const x = INDEX.map((i) => full[i]);
  const logit = rawScoreWith(M, x);
  return { probability: 1 / (1 + Math.exp(-logit)), logit, features: Object.fromEntries(M.features.map((name, i) => [name, x[i]])) };
}
