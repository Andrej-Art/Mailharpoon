import { unstable_cache } from "next/cache";
import type { Dict } from "@/i18n";
import { fill } from "@/i18n";
import { externalCounts } from "./external";
import { readTrends, reportTotal, type TrendEntry } from "./store";

/** Trends with the blocklist counts merged in, shared by the home and news pages. */
// An empty list almost always means a feed timed out: it throws, so the next request retries
// instead of the empty list being cached.
export const cachedTrends = unstable_cache(
  async () => {
    const trends = await readTrends({ external: await externalCounts(), limit: 20 });
    if (!trends.domains.length) throw new Error("no trends");
    return trends;
  },
  ["trends-v4"],
  { revalidate: 600 },
);

/** Why a domain is listed: how many people checked it here and how often others reported it. */
export const trendEvidence = (n: Dict["news"], e: TrendEntry) => [
  ...(e.people > 0 ? [e.people === 1 ? n.trendPerson : fill(n.trendPeople, { n: e.people })] : []),
  ...(reportTotal(e) > 0 ? [reportTotal(e) === 1 ? n.trendReport : fill(n.trendReports, { n: reportTotal(e) })] : []),
];
