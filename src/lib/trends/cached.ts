import { unstable_cache } from "next/cache";
import type { Dict } from "@/i18n";
import { fill } from "@/i18n";
import { externalCounts } from "./external";
import { readTrends, reportTotal, type TrendEntry } from "./store";

/** Trends with the blocklist counts merged in, shared by the home and news pages. */
export const cachedTrends = unstable_cache(async () => readTrends({ external: await externalCounts() }), ["trends-v2"], { revalidate: 600 });

/** Why a domain is listed: how many people checked it here and how often others reported it. */
export const trendEvidence = (n: Dict["news"], e: TrendEntry) => [
  ...(e.people > 0 ? [e.people === 1 ? n.trendPerson : fill(n.trendPeople, { n: e.people })] : []),
  ...(reportTotal(e) > 0 ? [reportTotal(e) === 1 ? n.trendReport : fill(n.trendReports, { n: reportTotal(e) })] : []),
];
