// Dev helper: prints what the news page would show. Usage: npx tsx scripts/news-probe.mts
import { fetchFeed } from "../src/lib/news/feeds";
import { NEWS_LIMIT, pickCandidates, pool } from "../src/lib/news/news";
import { NEWS_SOURCES } from "../src/lib/news/sources";
import { summarize } from "../src/lib/news/summarize";

const feeds = await Promise.all(NEWS_SOURCES.map(fetchFeed));
const items = pickCandidates(feeds.flat());
console.log(`${items.length} candidates`);
const shown: string[] = [];
await pool(items, 6, async (item) => {
    const src = NEWS_SOURCES.find((x) => x.id === item.source)!;
    const s = await summarize(item, src.name);
    const keep = s && (s.relevant || src.warnings);
    console.error(`${keep ? "+" : "-"} [${item.source}] ${s ? s.headline_de : "no summary"}`);
    if (keep) shown.push(`${item.published.slice(0, 10)} [${item.source}] ${s.topic}: ${s.headline_de}\n    ${s.summary_de}`);
});
console.log(`\n${shown.length} relevant, page shows up to ${NEWS_LIMIT}:\n` + shown.sort().reverse().join("\n"));
