// The news page's data: recent items from all sources, filtered and summarised by Claude.
// Every summary is cached by article link, so Claude only sees items it has not seen before.
import { unstable_cache } from "next/cache";
import { fetchFeed, type FeedItem } from "./feeds";
import { NEWS_SOURCES } from "./sources";
import { summarize, type Summary } from "./summarize";

export interface NewsItem extends FeedItem {
  sourceName: string;
  sourceLang: "de" | "en";
  summary: Summary | null;
}

const MAX_AGE_DAYS = 14;
// Claude reads the newest items of every source; general feeds need more, most of it is IT news.
const CANDIDATES = { warnings: 6, general: 10 };
const PER_SOURCE = 4;
export const NEWS_LIMIT = 12;

const byName = new Map(NEWS_SOURCES.map((s) => [s.id, s]));

// Throws instead of returning null, so a failed call is retried next time and not cached.
const cachedSummary = (item: FeedItem) =>
  unstable_cache(
    async () => {
      const s = await summarize(item, byName.get(item.source)!.name);
      if (!s) throw new Error("no summary");
      return s;
    },
    ["news-summary-v3", item.id],
    { revalidate: false },
  )().catch(() => null);

export async function pool<T, R>(xs: T[], n: number, f: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(xs.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, xs.length) }, async () => {
      while (next < xs.length) {
        const i = next++;
        out[i] = await f(xs[i]);
      }
    }),
  );
  return out;
}

/** The newest items of every source, newest first overall. */
export function pickCandidates(items: FeedItem[], now = Date.now()): FeedItem[] {
  const cutoff = now - MAX_AGE_DAYS * 86_400_000;
  const seen = new Set<string>();
  const fresh = items
    .filter((i) => Date.parse(i.published) >= cutoff && Date.parse(i.published) <= now + 3_600_000)
    .sort((a, b) => b.published.localeCompare(a.published))
    .filter((i) => !seen.has(i.id) && seen.add(i.id));
  const taken = new Map<string, number>();
  return fresh.filter((i) => {
    const n = taken.get(i.source) ?? 0;
    const cap = byName.get(i.source)?.warnings ? CANDIDATES.warnings : CANDIDATES.general;
    taken.set(i.source, n + 1);
    return n < cap;
  });
}

const words = (s: string) => new Set(s.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? []);

/** Two sources reporting the same story share many headline words in both languages. */
export function sameStory(a: Summary, b: Summary): boolean {
  const x = words(`${a.headline_en} ${a.headline_de}`);
  const y = words(`${b.headline_en} ${b.headline_de}`);
  const shared = [...x].filter((w) => y.has(w)).length;
  return shared >= 3 && shared / Math.min(x.size, y.size) >= 0.35;
}

export async function getNews(): Promise<NewsItem[]> {
  const feeds = await Promise.all(NEWS_SOURCES.map(fetchFeed));
  const candidates = pickCandidates(feeds.flat());
  const ai = Boolean(process.env.ANTHROPIC_API_KEY);
  const summaries = ai ? await pool(candidates, 6, cachedSummary) : candidates.map(() => null);

  const count = new Map<string, number>();
  const out: NewsItem[] = [];
  candidates.forEach((item, i) => {
    const source = byName.get(item.source)!;
    const summary = summaries[i];
    // Without a summary only titled items of warning services are shown, under their own title.
    const keep = summary ? summary.relevant || source.warnings : !ai && source.warnings && item.title;
    if (!keep || (count.get(source.id) ?? 0) >= PER_SOURCE) return;
    if (summary && out.some((o) => o.summary && sameStory(o.summary, summary))) return;
    count.set(source.id, (count.get(source.id) ?? 0) + 1);
    out.push({ ...item, sourceName: source.name, sourceLang: source.lang, summary });
  });
  return out.slice(0, NEWS_LIMIT);
}
