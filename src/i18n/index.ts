import { de } from "./de";
import { en, type Dict } from "./en";

export const locales = ["en", "de"] as const;
export type Locale = (typeof locales)[number];
export const isLocale = (v: string): v is Locale => (locales as readonly string[]).includes(v);

const dicts: Record<Locale, Dict> = { en, de };
export const getDict = (l: Locale): Dict => dicts[l];

/** Fill {placeholders} in a template. */
export function fill(template: string, params: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? String(params[k]) : ""));
}
export type { Dict };
